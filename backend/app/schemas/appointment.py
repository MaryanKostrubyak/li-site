from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import AppointmentStatus


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    doctor_id: str
    service_id: str
    status: AppointmentStatus
    start_at: datetime
    end_at: datetime
    reason: str
    source_channel: str
    issue_summary: str | None = None
    issue_classification: str | None = None


class PublicBookRequest(BaseModel):
    service_id: str
    doctor_id: str
    start_at: datetime
    reason: str = Field(min_length=5, max_length=3000)
    patient_email: EmailStr
    patient_full_name: str = Field(min_length=2, max_length=255)
    patient_phone: str | None = Field(default=None, max_length=50)
    source_channel: str = Field(default='website', max_length=100)


class AppointmentDetailOut(BaseModel):
    id: str
    status: AppointmentStatus
    start_at: datetime
    end_at: datetime
    reason: str
    source_channel: str
    doctor_name: str
    service_name: str
    service_price: Decimal


class CancelAppointmentRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class RescheduleAppointmentRequest(BaseModel):
    new_start_at: datetime


class AdminAppointmentUpdateRequest(BaseModel):
    status: AppointmentStatus | None = None
    start_at: datetime | None = None
    doctor_id: str | None = None
    service_id: str | None = None
    reason: str | None = Field(default=None, max_length=3000)


class ManualAppointmentCreateRequest(BaseModel):
    patient_id: str
    doctor_id: str
    service_id: str
    start_at: datetime
    reason: str = Field(min_length=3, max_length=3000)
    source_channel: str = Field(default='manual', max_length=100)


class AppointmentFilters(BaseModel):
    doctor_id: str | None = None
    service_id: str | None = None
    status: AppointmentStatus | None = None
    date: str | None = None


class DoctorAppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentNoteCreate(BaseModel):
    raw_note: str = Field(min_length=3, max_length=4000)
    use_ai_formatting: bool = True


class AppointmentNoteOut(BaseModel):
    id: str
    appointment_id: str
    doctor_id: str
    raw_note: str
    formatted_note: str
    created_at: datetime
