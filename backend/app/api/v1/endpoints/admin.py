from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor_profile import DoctorProfile
from app.models.enums import AppointmentStatus, NotificationEventType, UserRole
from app.models.patient_internal_note import PatientInternalNote
from app.models.patient_profile import PatientProfile
from app.models.patient_tag import PatientTag
from app.models.service import Service
from app.models.user import User
from app.schemas.appointment import AdminAppointmentUpdateRequest, AppointmentOut, ManualAppointmentCreateRequest
from app.schemas.patient import (
    AddPatientInternalNoteRequest,
    AddPatientTagRequest,
    PatientCRMDetail,
    PatientInternalNoteOut,
    PatientSummary,
    PatientTagOut,
)
from app.services.notification_service import notification_service
from app.services.scheduling import BookingConflictError, SlotUnavailableError, to_utc, validate_slot_available

router = APIRouter(prefix='/admin', tags=['admin'])


@router.get('/metrics')
def get_metrics(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
) -> dict:
    now = datetime.now(UTC)
    start_week = now - timedelta(days=7)

    total_patients = db.execute(select(func.count(PatientProfile.id))).scalar_one()
    total_doctors = db.execute(select(func.count(DoctorProfile.id))).scalar_one()
    upcoming_appointments = db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.start_at >= now,
            Appointment.status.in_([AppointmentStatus.new, AppointmentStatus.confirmed]),
        )
    ).scalar_one()
    week_completed = db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.start_at >= start_week,
            Appointment.status == AppointmentStatus.completed,
        )
    ).scalar_one()

    return {
        'total_patients': total_patients,
        'total_doctors': total_doctors,
        'upcoming_appointments': upcoming_appointments,
        'completed_last_7_days': week_completed,
    }


@router.get('/appointments')
def list_admin_appointments(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
    doctor_id: str | None = None,
    service_id: str | None = None,
    status: AppointmentStatus | None = None,
    date: str | None = Query(default=None),
) -> list[dict]:
    stmt = select(Appointment, DoctorProfile, Service, PatientProfile, User).join(
        DoctorProfile, Appointment.doctor_id == DoctorProfile.id
    ).join(
        Service, Appointment.service_id == Service.id
    ).join(
        PatientProfile, Appointment.patient_id == PatientProfile.id
    ).join(
        User, PatientProfile.user_id == User.id
    )

    filters = []
    if doctor_id:
        filters.append(Appointment.doctor_id == doctor_id)
    if service_id:
        filters.append(Appointment.service_id == service_id)
    if status:
        filters.append(Appointment.status == status)
    if date:
        date_obj = datetime.fromisoformat(date)
        start_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC)
        end_day = start_day + timedelta(days=1)
        filters.append(and_(Appointment.start_at >= start_day, Appointment.start_at < end_day))

    if filters:
        stmt = stmt.where(and_(*filters))

    rows = db.execute(stmt.order_by(Appointment.start_at.desc())).all()
    result: list[dict] = []
    for appointment, doctor, service, patient, patient_user in rows:
        result.append(
            {
                'id': appointment.id,
                'status': appointment.status,
                'start_at': appointment.start_at,
                'end_at': appointment.end_at,
                'reason': appointment.reason,
                'source_channel': appointment.source_channel,
                'doctor': {
                    'id': doctor.id,
                    'name': doctor.user.full_name,
                    'specialty': doctor.specialty,
                },
                'service': {
                    'id': service.id,
                    'name': service.name,
                    'duration_minutes': service.duration_minutes,
                },
                'patient': {
                    'id': patient.id,
                    'name': patient_user.full_name,
                    'email': patient_user.email,
                },
            }
        )
    return result


@router.post('/appointments', response_model=AppointmentOut)
def create_manual_appointment(
    payload: ManualAppointmentCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
) -> Appointment:
    patient = db.get(PatientProfile, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail='Patient not found')

    doctor = db.get(DoctorProfile, payload.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail='Doctor not found')

    service = db.get(Service, payload.service_id)
    if not service:
        raise HTTPException(status_code=404, detail='Service not found')

    start_at = to_utc(payload.start_at)
    try:
        end_at = validate_slot_available(db, doctor_id=doctor.id, start_at=start_at, duration_minutes=service.duration_minutes)
    except (SlotUnavailableError, BookingConflictError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        service_id=service.id,
        status=AppointmentStatus.confirmed,
        start_at=start_at,
        end_at=end_at,
        reason=payload.reason,
        source_channel=payload.source_channel,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    appointment = db.get(Appointment, appointment.id)
    notification_service.send_for_appointment(db, appointment, NotificationEventType.appointment_created)
    return appointment


@router.patch('/appointments/{appointment_id}', response_model=AppointmentOut)
def update_appointment(
    appointment_id: str,
    payload: AdminAppointmentUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail='Appointment not found')

    service = db.get(Service, payload.service_id or appointment.service_id)
    doctor_id = payload.doctor_id or appointment.doctor_id

    if payload.start_at or payload.doctor_id or payload.service_id:
        start_at = to_utc(payload.start_at or appointment.start_at)
        try:
            end_at = validate_slot_available(
                db,
                doctor_id=doctor_id,
                start_at=start_at,
                duration_minutes=service.duration_minutes,
                exclude_appointment_id=appointment.id,
            )
        except (SlotUnavailableError, BookingConflictError) as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        appointment.start_at = start_at
        appointment.end_at = end_at
        appointment.doctor_id = doctor_id
        appointment.service_id = service.id

    if payload.status:
        appointment.status = payload.status
        if payload.status == AppointmentStatus.canceled:
            appointment.canceled_at = datetime.now(UTC)

    if payload.reason:
        appointment.reason = payload.reason

    db.commit()
    db.refresh(appointment)
    return appointment


@router.get('/patients', response_model=list[PatientSummary])
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
) -> list[PatientSummary]:
    stmt = select(PatientProfile, User).join(User, PatientProfile.user_id == User.id).order_by(User.full_name)
    rows = db.execute(stmt).all()

    return [
        PatientSummary(
            id=profile.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            lead_source=profile.lead_source,
            follow_up_status=profile.follow_up_status,
        )
        for profile, user in rows
    ]


@router.get('/patients/{patient_id}', response_model=PatientCRMDetail)
def patient_detail(
    patient_id: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
) -> PatientCRMDetail:
    patient = db.get(PatientProfile, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail='Patient not found')

    user = patient.user
    appointments = db.execute(
        select(Appointment).where(Appointment.patient_id == patient.id).order_by(Appointment.start_at.desc())
    ).scalars().all()

    appt_payload = [
        {
            'id': a.id,
            'status': a.status.value,
            'start_at': a.start_at.isoformat(),
            'end_at': a.end_at.isoformat(),
            'doctor_id': a.doctor_id,
            'service_id': a.service_id,
            'reason': a.reason,
        }
        for a in appointments
    ]

    return PatientCRMDetail(
        patient=PatientSummary(
            id=patient.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            lead_source=patient.lead_source,
            follow_up_status=patient.follow_up_status,
        ),
        tags=[PatientTagOut(id=t.id, tag=t.tag, created_at=t.created_at) for t in patient.tags],
        notes=[PatientInternalNoteOut(id=n.id, note=n.note, created_at=n.created_at) for n in patient.internal_notes],
        appointments=appt_payload,
    )


@router.post('/patients/{patient_id}/tags', response_model=PatientTagOut)
def add_patient_tag(
    patient_id: str,
    payload: AddPatientTagRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
) -> PatientTagOut:
    patient = db.get(PatientProfile, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail='Patient not found')

    tag = PatientTag(patient_id=patient_id, tag=payload.tag)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return PatientTagOut(id=tag.id, tag=tag.tag, created_at=tag.created_at)


@router.post('/patients/{patient_id}/notes', response_model=PatientInternalNoteOut)
def add_patient_note(
    patient_id: str,
    payload: AddPatientInternalNoteRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> PatientInternalNoteOut:
    patient = db.get(PatientProfile, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail='Patient not found')

    note = PatientInternalNote(patient_id=patient_id, admin_id=current_user.id, note=payload.note)
    db.add(note)
    db.commit()
    db.refresh(note)
    return PatientInternalNoteOut(id=note.id, note=note.note, created_at=note.created_at)
