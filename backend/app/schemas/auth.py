from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole
from app.schemas.common import ORMModel


class PatientRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=50)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    role: UserRole


class UserSummary(ORMModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole


class MeResponse(BaseModel):
    user: UserSummary
    patient_profile_id: str | None = None
    doctor_profile_id: str | None = None
