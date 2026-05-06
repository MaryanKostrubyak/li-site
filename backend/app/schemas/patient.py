from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import FollowUpStatus


class PatientProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    date_of_birth: date | None
    gender: str | None
    address: str | None
    emergency_contact: str | None
    lead_source: str | None
    follow_up_status: FollowUpStatus
    notification_email_enabled: bool
    notification_telegram_enabled: bool
    telegram_chat_id: str | None


class PatientProfileUpdate(BaseModel):
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    emergency_contact: str | None = Field(default=None, max_length=255)
    follow_up_status: FollowUpStatus | None = None
    notification_email_enabled: bool | None = None
    notification_telegram_enabled: bool | None = None
    telegram_chat_id: str | None = Field(default=None, max_length=100)


class PatientSummary(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    phone: str | None
    lead_source: str | None
    follow_up_status: FollowUpStatus


class PatientTagOut(BaseModel):
    id: str
    tag: str
    created_at: datetime


class PatientInternalNoteOut(BaseModel):
    id: str
    note: str
    created_at: datetime


class AddPatientTagRequest(BaseModel):
    tag: str = Field(min_length=2, max_length=100)


class AddPatientInternalNoteRequest(BaseModel):
    note: str = Field(min_length=3, max_length=3000)


class PatientCRMDetail(BaseModel):
    patient: PatientSummary
    tags: list[PatientTagOut]
    notes: list[PatientInternalNoteOut]
    appointments: list[dict]
