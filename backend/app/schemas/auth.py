from pydantic import BaseModel, Field

from app.models.enums import UserRole
from app.schemas.common import ClinicEmail, ORMModel


class PatientRegisterRequest(BaseModel):
    email: ClinicEmail
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=50)


class LoginRequest(BaseModel):
    email: ClinicEmail
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    role: UserRole


class DemoLoginRequest(BaseModel):
    role: UserRole


class UserSummary(ORMModel):
    id: str
    email: ClinicEmail
    full_name: str
    role: UserRole


class MeResponse(BaseModel):
    user: UserSummary
    patient_profile_id: str | None = None
    doctor_profile_id: str | None = None
