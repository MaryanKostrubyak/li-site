from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.deps import require_role, verify_csrf
from app.core.errors import ApiError
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.appointment_note import AppointmentNote
from app.models.availability_schedule import AvailabilitySchedule
from app.models.enums import AIRequestFeature, UserRole
from app.models.user import User
from app.schemas.appointment import (
    AppointmentNoteCreate,
    AppointmentNoteOut,
    AppointmentNotePreviewOut,
    AppointmentNotePreviewRequest,
    AppointmentOut,
    DoctorAppointmentDetailOut,
    DoctorSummary,
    DoctorAppointmentStatusUpdate,
    PatientSummaryOut,
    ServiceSummary,
)
from app.services.ai_service import ai_service
from app.services.appointment_rules import InvalidStatusTransition, validate_status_transition
from app.services.scheduling import CLINIC_ZONE

router = APIRouter(prefix='/doctor', tags=['doctor'])


def _doctor_id_or_403(current_user: User) -> str:
    if not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail='Doctor profile not found')
    return current_user.doctor_profile.id


def _appointment_or_404(db: Session, doctor_id: str, appointment_id: str) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if not appointment or appointment.doctor_id != doctor_id:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'appointment_not_found', 'Appointment not found.')
    return appointment


def _detail(appointment: Appointment) -> DoctorAppointmentDetailOut:
    return DoctorAppointmentDetailOut(
        id=appointment.id,
        reference_code=appointment.reference_code,
        status=appointment.status,
        start_at=appointment.start_at,
        end_at=appointment.end_at,
        reason=appointment.reason,
        patient=PatientSummaryOut(
            id=appointment.patient.id,
            name=appointment.patient.user.full_name,
            email=appointment.patient.user.email,
        ),
        doctor=DoctorSummary(
            id=appointment.doctor.id,
            name=appointment.doctor.user.full_name,
            specialty=appointment.doctor.specialty,
        ),
        service=ServiceSummary(
            id=appointment.service.id,
            name=appointment.service.name,
            duration_minutes=appointment.service.duration_minutes,
            price=appointment.service.price,
        ),
        notes=[
            AppointmentNoteOut(
                id=note.id,
                appointment_id=note.appointment_id,
                doctor_id=note.doctor_id,
                raw_note=note.raw_note,
                formatted_note=note.formatted_note,
                created_at=note.created_at,
            )
            for note in sorted(appointment.notes, key=lambda item: item.created_at, reverse=True)
        ],
    )


@router.get('/appointments/today', response_model=list[AppointmentOut])
def todays_appointments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> list[Appointment]:
    doctor_id = _doctor_id_or_403(current_user)
    now = datetime.now(UTC)
    local_now = now.astimezone(CLINIC_ZONE)
    start_day = local_now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(UTC)
    end_day = (local_now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).astimezone(UTC)

    stmt = (
        select(Appointment)
        .where(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.start_at >= start_day,
                Appointment.start_at < end_day,
            )
        )
        .order_by(Appointment.start_at.asc())
    )
    return db.execute(stmt).scalars().all()


@router.get('/appointments/upcoming', response_model=list[AppointmentOut])
def upcoming_appointments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> list[Appointment]:
    doctor_id = _doctor_id_or_403(current_user)
    now = datetime.now(UTC)
    stmt = (
        select(Appointment)
        .where(Appointment.doctor_id == doctor_id, Appointment.start_at >= now)
        .order_by(Appointment.start_at.asc())
    )
    return db.execute(stmt).scalars().all()


@router.get('/appointments/{appointment_id}', response_model=DoctorAppointmentDetailOut)
def appointment_detail(
    appointment_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> DoctorAppointmentDetailOut:
    return _detail(_appointment_or_404(db, _doctor_id_or_403(current_user), appointment_id))


@router.patch('/appointments/{appointment_id}/status', response_model=AppointmentOut, dependencies=[Depends(verify_csrf)])
def update_appointment_status(
    appointment_id: str,
    payload: DoctorAppointmentStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> Appointment:
    doctor_id = _doctor_id_or_403(current_user)
    appointment = _appointment_or_404(db, doctor_id, appointment_id)

    try:
        validate_status_transition(UserRole.doctor, appointment.status, payload.status)
    except InvalidStatusTransition as exc:
        raise ApiError(status.HTTP_409_CONFLICT, 'invalid_status_transition', str(exc))
    appointment.status = payload.status
    db.commit()
    db.refresh(appointment)
    return appointment


@router.post(
    '/appointments/{appointment_id}/notes/preview',
    response_model=AppointmentNotePreviewOut,
    dependencies=[Depends(verify_csrf)],
)
def preview_appointment_note(
    appointment_id: str,
    payload: AppointmentNotePreviewRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> AppointmentNotePreviewOut:
    doctor_id = _doctor_id_or_403(current_user)
    appointment = _appointment_or_404(db, doctor_id, appointment_id)
    preview, source = ai_service.run(
        db,
        feature=AIRequestFeature.format_note,
        text=payload.raw_note,
        patient_id=appointment.patient_id,
        appointment_id=appointment.id,
    )
    return AppointmentNotePreviewOut(preview=preview, source=source)


@router.post('/appointments/{appointment_id}/notes', response_model=AppointmentNoteOut, dependencies=[Depends(verify_csrf)])
def add_appointment_note(
    appointment_id: str,
    payload: AppointmentNoteCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> AppointmentNoteOut:
    doctor_id = _doctor_id_or_403(current_user)
    appointment = _appointment_or_404(db, doctor_id, appointment_id)
    formatted = payload.formatted_note or payload.raw_note

    note = AppointmentNote(
        appointment_id=appointment.id,
        doctor_id=doctor_id,
        raw_note=payload.raw_note,
        formatted_note=formatted,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return AppointmentNoteOut(
        id=note.id,
        appointment_id=note.appointment_id,
        doctor_id=note.doctor_id,
        raw_note=note.raw_note,
        formatted_note=note.formatted_note,
        created_at=note.created_at,
    )


@router.get('/schedule')
def get_my_schedule(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> list[dict]:
    doctor_id = _doctor_id_or_403(current_user)
    stmt = (
        select(AvailabilitySchedule)
        .where(AvailabilitySchedule.doctor_id == doctor_id, AvailabilitySchedule.is_active.is_(True))
        .order_by(AvailabilitySchedule.weekday.asc(), AvailabilitySchedule.start_time.asc())
    )
    schedules = db.execute(stmt).scalars().all()
    return [
        {
            'id': item.id,
            'weekday': item.weekday,
            'start_time': item.start_time.isoformat(),
            'end_time': item.end_time.isoformat(),
            'slot_interval_minutes': item.slot_interval_minutes,
        }
        for item in schedules
    ]
