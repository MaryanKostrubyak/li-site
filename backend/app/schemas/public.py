from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel


class ServiceOut(ORMModel):
    id: str
    name: str
    slug: str
    description: str
    duration_minutes: int
    price: Decimal


class DoctorOut(BaseModel):
    id: str
    user_id: str
    full_name: str
    specialty: str
    bio: str
    years_experience: int
    consultation_fee: Decimal
    is_accepting_new_patients: bool


class SlotOut(BaseModel):
    start_at: datetime
    end_at: datetime


class SlotsResponse(BaseModel):
    doctor_id: str
    service_id: str
    date: str
    slots: list[SlotOut]
