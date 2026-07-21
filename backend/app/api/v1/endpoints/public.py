from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.errors import ApiError
from app.models.doctor_profile import DoctorProfile
from app.models.service import Service
from app.models.user import User
from app.schemas.public import DoctorOut, ServiceOut, SlotOut, SlotsResponse
from app.services.scheduling import list_available_slots

router = APIRouter(prefix='/public', tags=['public'])


@router.get('/services', response_model=list[ServiceOut])
def list_services(db: Annotated[Session, Depends(get_db)]) -> list[Service]:
    return db.execute(select(Service).where(Service.is_active.is_(True)).order_by(Service.name)).scalars().all()


@router.get('/doctors', response_model=list[DoctorOut])
def list_doctors(db: Annotated[Session, Depends(get_db)]) -> list[DoctorOut]:
    stmt = (
        select(DoctorProfile, User)
        .join(User, User.id == DoctorProfile.user_id)
        .where(DoctorProfile.is_accepting_new_patients.is_(True))
        .order_by(User.full_name)
    )
    rows = db.execute(stmt).all()
    return [
        DoctorOut(
            id=doctor.id,
            user_id=user.id,
            slug=doctor.slug,
            service_ids=[service.id for service in doctor.services],
            full_name=user.full_name,
            specialty=doctor.specialty,
            bio=doctor.bio,
            years_experience=doctor.years_experience,
            consultation_fee=doctor.consultation_fee,
            is_accepting_new_patients=doctor.is_accepting_new_patients,
        )
        for doctor, user in rows
    ]


@router.get('/doctors/{doctor_id}', response_model=DoctorOut)
def get_doctor(doctor_id: str, db: Annotated[Session, Depends(get_db)]) -> DoctorOut:
    stmt = select(DoctorProfile, User).join(User, User.id == DoctorProfile.user_id).where(
        (DoctorProfile.id == doctor_id) | (DoctorProfile.slug == doctor_id)
    )
    row = db.execute(stmt).one_or_none()
    if not row:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'doctor_not_found', 'Doctor not found.')

    doctor, user = row
    return DoctorOut(
        id=doctor.id,
        user_id=user.id,
        slug=doctor.slug,
        service_ids=[service.id for service in doctor.services],
        full_name=user.full_name,
        specialty=doctor.specialty,
        bio=doctor.bio,
        years_experience=doctor.years_experience,
        consultation_fee=doctor.consultation_fee,
        is_accepting_new_patients=doctor.is_accepting_new_patients,
    )


@router.get('/doctors/{doctor_id}/slots', response_model=SlotsResponse)
def get_available_doctor_slots(
    doctor_id: str,
    service_id: str,
    db: Annotated[Session, Depends(get_db)],
    target_date: date = Query(alias='date'),
) -> SlotsResponse:
    doctor = db.get(DoctorProfile, doctor_id)
    if not doctor:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'doctor_not_found', 'Doctor not found.')

    service = db.get(Service, service_id)
    if not service or not service.is_active:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'service_not_found', 'Service not found.')

    if service not in doctor.services:
        raise ApiError(
            status.HTTP_409_CONFLICT,
            'doctor_service_mismatch',
            'This doctor does not offer the selected service.',
        )

    slots = list_available_slots(db, doctor_id=doctor_id, target_date=target_date, service_duration_minutes=service.duration_minutes)
    return SlotsResponse(
        doctor_id=doctor_id,
        service_id=service_id,
        date=target_date.isoformat(),
        slots=[SlotOut(start_at=start, end_at=end) for start, end in slots],
    )
