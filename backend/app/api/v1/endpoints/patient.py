from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_role, verify_csrf
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, UserRole
from app.models.user import User
from app.schemas.appointment import AppointmentOut
from app.schemas.patient import PatientProfileOut, PatientProfileUpdate

router = APIRouter(prefix='/patient', tags=['patient'])


@router.get('/appointments/upcoming', response_model=list[AppointmentOut])
def upcoming_appointments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.patient))],
) -> list[Appointment]:
    profile = current_user.patient_profile
    if not profile:
        return []
    now = datetime.now(UTC)
    stmt = (
        select(Appointment)
        .where(
            Appointment.patient_id == profile.id,
            Appointment.start_at >= now,
            Appointment.status != AppointmentStatus.canceled,
        )
        .order_by(Appointment.start_at.asc())
    )
    return db.execute(stmt).scalars().all()


@router.get('/appointments/history', response_model=list[AppointmentOut])
def appointment_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.patient))],
) -> list[Appointment]:
    profile = current_user.patient_profile
    if not profile:
        return []
    now = datetime.now(UTC)
    stmt = (
        select(Appointment)
        .where(Appointment.patient_id == profile.id, Appointment.start_at < now)
        .order_by(Appointment.start_at.desc())
    )
    return db.execute(stmt).scalars().all()


@router.get('/profile', response_model=PatientProfileOut)
def get_profile(
    current_user: Annotated[User, Depends(require_role(UserRole.patient))],
) -> PatientProfileOut:
    return current_user.patient_profile


@router.patch('/profile', response_model=PatientProfileOut, dependencies=[Depends(verify_csrf)])
def update_profile(
    payload: PatientProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.patient))],
) -> PatientProfileOut:
    profile = current_user.patient_profile
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile
