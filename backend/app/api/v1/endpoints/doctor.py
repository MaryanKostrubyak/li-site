from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.appointment_note import AppointmentNote
from app.models.availability_schedule import AvailabilitySchedule
from app.models.enums import AIRequestFeature, UserRole
from app.models.user import User
from app.schemas.appointment import (
    AppointmentNoteCreate,
    AppointmentNoteOut,
    AppointmentOut,
    DoctorAppointmentStatusUpdate,
)
from app.services.ai_service import ai_service

router = APIRouter(prefix='/doctor', tags=['doctor'])


def _doctor_id_or_403(current_user: User) -> str:
    if not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail='Doctor profile not found')
    return current_user.doctor_profile.id


@router.get('/appointments/today', response_model=list[AppointmentOut])
def todays_appointments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> list[Appointment]:
    doctor_id = _doctor_id_or_403(current_user)
    now = datetime.now(UTC)
    start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_day = start_day + timedelta(days=1)

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


@router.patch('/appointments/{appointment_id}/status', response_model=AppointmentOut)
def update_appointment_status(
    appointment_id: str,
    payload: DoctorAppointmentStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> Appointment:
    doctor_id = _doctor_id_or_403(current_user)
    appointment = db.get(Appointment, appointment_id)
    if not appointment or appointment.doctor_id != doctor_id:
        raise HTTPException(status_code=404, detail='Appointment not found')

    appointment.status = payload.status
    db.commit()
    db.refresh(appointment)
    return appointment


@router.post('/appointments/{appointment_id}/notes', response_model=AppointmentNoteOut)
def add_appointment_note(
    appointment_id: str,
    payload: AppointmentNoteCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.doctor))],
) -> AppointmentNoteOut:
    doctor_id = _doctor_id_or_403(current_user)
    appointment = db.get(Appointment, appointment_id)
    if not appointment or appointment.doctor_id != doctor_id:
        raise HTTPException(status_code=404, detail='Appointment not found')

    formatted = payload.raw_note
    if payload.use_ai_formatting:
        formatted, _ = ai_service.run(
            db,
            feature=AIRequestFeature.format_note,
            text=payload.raw_note,
            patient_id=appointment.patient_id,
            appointment_id=appointment.id,
        )

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
