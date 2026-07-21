from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role, verify_csrf
from app.core.errors import ApiError
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor_profile import DoctorProfile
from app.models.enums import AIRequestFeature, AppointmentStatus, NotificationEventType, UserRole
from app.models.service import Service
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreateRequest,
    AppointmentOut,
    CancelAppointmentRequest,
    DoctorSummary,
    PatientAppointmentOut,
    RescheduleAppointmentRequest,
    ServiceSummary,
)
from app.schemas.common import MessageResponse
from app.services.ai_service import ai_service
from app.services.appointment_rules import AppointmentActionNotAllowed, ensure_patient_can_modify
from app.services.notification_service import notification_service
from app.services.scheduling import (
    BookingConflictError,
    SlotUnavailableError,
    to_utc,
    validate_booking_slot,
    validate_slot_available,
)

router = APIRouter(prefix='/appointments', tags=['appointments'])


def _patient_appointment_out(appointment: Appointment) -> PatientAppointmentOut:
    return PatientAppointmentOut(
        id=appointment.id,
        reference_code=appointment.reference_code,
        status=appointment.status,
        start_at=appointment.start_at,
        end_at=appointment.end_at,
        reason=appointment.reason,
        issue_summary=appointment.issue_summary,
        issue_classification=appointment.issue_classification,
        rescheduled_from_appointment_id=appointment.rescheduled_from_appointment_id,
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
    )


def _can_manage_appointment(current_user: User, appointment: Appointment) -> bool:
    if current_user.role == UserRole.admin:
        return True
    if current_user.role == UserRole.patient and current_user.patient_profile and appointment.patient_id == current_user.patient_profile.id:
        return True
    return False


@router.post(
    '',
    response_model=PatientAppointmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
def book_appointment(
    payload: AppointmentCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.patient))],
) -> PatientAppointmentOut:
    doctor = db.get(DoctorProfile, payload.doctor_id)
    if not doctor:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'doctor_not_found', 'Doctor not found.')

    service = db.get(Service, payload.service_id)
    if not service or not service.is_active:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'service_not_found', 'Service not found.')

    patient = current_user.patient_profile
    if not patient:
        raise ApiError(status.HTTP_409_CONFLICT, 'patient_profile_missing', 'Patient profile is not configured.')

    start_at = to_utc(payload.start_at)
    try:
        end_at = validate_booking_slot(db, doctor, service, start_at)
    except (SlotUnavailableError, BookingConflictError) as exc:
        raise ApiError(status.HTTP_409_CONFLICT, 'slot_unavailable', str(exc))

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
        source_channel='website',
        issue_summary=summary,
        issue_classification=classification,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    appointment = db.get(Appointment, appointment.id)
    notification_service.send_for_appointment(db, appointment, NotificationEventType.appointment_created)
    return _patient_appointment_out(appointment)


@router.post('/{appointment_id}/cancel', response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
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

    try:
        ensure_patient_can_modify(appointment)
    except AppointmentActionNotAllowed as exc:
        raise ApiError(status.HTTP_409_CONFLICT, 'appointment_not_modifiable', str(exc))

    appointment.status = AppointmentStatus.canceled
    appointment.canceled_at = datetime.now(UTC)
    appointment.cancellation_reason = payload.reason
    db.commit()

    appointment = db.get(Appointment, appointment_id)
    notification_service.send_for_appointment(db, appointment, NotificationEventType.appointment_canceled)
    return MessageResponse(message='Appointment canceled')


@router.post(
    '/{appointment_id}/reschedule',
    response_model=PatientAppointmentOut,
    dependencies=[Depends(verify_csrf)],
)
def reschedule_appointment(
    appointment_id: str,
    payload: RescheduleAppointmentRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> PatientAppointmentOut:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail='Appointment not found')

    if not _can_manage_appointment(current_user, appointment):
        raise HTTPException(status_code=403, detail='No access to this appointment')

    try:
        ensure_patient_can_modify(appointment)
    except AppointmentActionNotAllowed as exc:
        raise ApiError(status.HTTP_409_CONFLICT, 'appointment_not_modifiable', str(exc))

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
    appointment.status = AppointmentStatus.canceled
    appointment.canceled_at = datetime.now(UTC)
    appointment.cancellation_reason = (
        'Rescheduled by patient' if current_user.role == UserRole.patient else 'Rescheduled by clinic'
    )
    replacement = Appointment(
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        service_id=appointment.service_id,
        status=AppointmentStatus.confirmed,
        start_at=new_start,
        end_at=new_end,
        reason=appointment.reason,
        source_channel=appointment.source_channel,
        issue_summary=appointment.issue_summary,
        issue_classification=appointment.issue_classification,
        rescheduled_from_appointment_id=appointment.id,
    )
    db.add(replacement)
    db.commit()
    db.refresh(replacement)
    replacement = db.get(Appointment, replacement.id)
    notification_service.send_for_appointment(
        db,
        replacement,
        NotificationEventType.appointment_rescheduled,
        custom_message=f'Appointment moved from {old_start.isoformat()} to {new_start.isoformat()}',
    )
    return _patient_appointment_out(replacement)


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
