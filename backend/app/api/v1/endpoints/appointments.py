import secrets
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor_profile import DoctorProfile
from app.models.enums import AIRequestFeature, AppointmentStatus, NotificationEventType, UserRole
from app.models.patient_profile import PatientProfile
from app.models.service import Service
from app.models.user import User
from app.schemas.appointment import (
    AppointmentOut,
    CancelAppointmentRequest,
    PublicBookRequest,
    RescheduleAppointmentRequest,
)
from app.schemas.common import MessageResponse
from app.services.ai_service import ai_service
from app.services.notification_service import notification_service
from app.services.scheduling import BookingConflictError, SlotUnavailableError, to_utc, validate_slot_available

router = APIRouter(prefix='/appointments', tags=['appointments'])


def _get_or_create_patient(db: Session, payload: PublicBookRequest) -> PatientProfile:
    user = db.execute(select(User).where(User.email == payload.patient_email)).scalar_one_or_none()
    if user and user.role != UserRole.patient:
        raise HTTPException(status_code=400, detail='Email belongs to a non-patient account')

    if not user:
        random_password = secrets.token_urlsafe(10)
        user = User(
            email=payload.patient_email,
            password_hash=get_password_hash(random_password),
            full_name=payload.patient_full_name,
            phone=payload.patient_phone,
            role=UserRole.patient,
        )
        db.add(user)
        db.flush()

    profile = user.patient_profile
    if not profile:
        profile = PatientProfile(user_id=user.id, lead_source=payload.source_channel)
        db.add(profile)
        db.flush()

    user.full_name = payload.patient_full_name
    user.phone = payload.patient_phone
    return profile


def _can_manage_appointment(current_user: User, appointment: Appointment) -> bool:
    if current_user.role == UserRole.admin:
        return True
    if current_user.role == UserRole.patient and current_user.patient_profile and appointment.patient_id == current_user.patient_profile.id:
        return True
    return False


@router.post('/public-book', response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def public_book_appointment(payload: PublicBookRequest, db: Annotated[Session, Depends(get_db)]) -> Appointment:
    doctor = db.get(DoctorProfile, payload.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail='Doctor not found')

    service = db.get(Service, payload.service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=404, detail='Service not found')

    patient = _get_or_create_patient(db, payload)

    start_at = to_utc(payload.start_at)
    try:
        end_at = validate_slot_available(
            db,
            doctor_id=payload.doctor_id,
            start_at=start_at,
            duration_minutes=service.duration_minutes,
        )
    except (SlotUnavailableError, BookingConflictError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    summary, _ = ai_service.run(db, AIRequestFeature.booking_summary, payload.reason, patient_id=patient.id)
    classification, _ = ai_service.run(db, AIRequestFeature.request_classification, payload.reason, patient_id=patient.id)

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=payload.doctor_id,
        service_id=payload.service_id,
        status=AppointmentStatus.new,
        start_at=start_at,
        end_at=end_at,
        reason=payload.reason,
        source_channel=payload.source_channel,
        issue_summary=summary,
        issue_classification=classification,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    appointment = db.get(Appointment, appointment.id)
    notification_service.send_for_appointment(db, appointment, NotificationEventType.appointment_created)
    return appointment


@router.post('/{appointment_id}/cancel', response_model=MessageResponse)
def cancel_appointment(
    appointment_id: str,
    payload: CancelAppointmentRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail='Appointment not found')

    if not _can_manage_appointment(current_user, appointment):
        raise HTTPException(status_code=403, detail='No access to this appointment')

    if appointment.status == AppointmentStatus.canceled:
        raise HTTPException(status_code=400, detail='Appointment is already canceled')

    appointment.status = AppointmentStatus.canceled
    appointment.canceled_at = datetime.now(UTC)
    if payload.reason:
        appointment.reason = f'{appointment.reason}\n\nCancellation note: {payload.reason}'
    db.commit()

    appointment = db.get(Appointment, appointment_id)
    notification_service.send_for_appointment(db, appointment, NotificationEventType.appointment_canceled)
    return MessageResponse(message='Appointment canceled')


@router.post('/{appointment_id}/reschedule', response_model=AppointmentOut)
def reschedule_appointment(
    appointment_id: str,
    payload: RescheduleAppointmentRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail='Appointment not found')

    if not _can_manage_appointment(current_user, appointment):
        raise HTTPException(status_code=403, detail='No access to this appointment')

    service = db.get(Service, appointment.service_id)
    new_start = to_utc(payload.new_start_at)

    try:
        new_end = validate_slot_available(
            db,
            doctor_id=appointment.doctor_id,
            start_at=new_start,
            duration_minutes=service.duration_minutes,
            exclude_appointment_id=appointment.id,
        )
    except (SlotUnavailableError, BookingConflictError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    old_start = appointment.start_at
    appointment.start_at = new_start
    appointment.end_at = new_end
    appointment.status = AppointmentStatus.confirmed
    db.commit()

    appointment = db.get(Appointment, appointment_id)
    notification_service.send_for_appointment(
        db,
        appointment,
        NotificationEventType.appointment_rescheduled,
        custom_message=f'Appointment moved from {old_start.isoformat()} to {new_start.isoformat()}',
    )
    return appointment


@router.get('/mine', response_model=list[AppointmentOut])
def my_appointments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.patient))],
) -> list[Appointment]:
    profile = current_user.patient_profile
    if not profile:
        return []
    stmt = (
        select(Appointment)
        .where(Appointment.patient_id == profile.id)
        .order_by(Appointment.start_at.desc())
    )
    return db.execute(stmt).scalars().all()
