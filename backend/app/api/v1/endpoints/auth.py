from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    PatientRegisterRequest,
    TokenResponse,
    UserSummary,
)

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/register/patient', response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_patient(payload: PatientRegisterRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered')

    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=UserRole.patient,
    )
    db.add(user)
    db.flush()

    profile = PatientProfile(user_id=user.id, lead_source='website')
    db.add(profile)
    db.commit()

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(access_token=token, role=user.role)


@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid email or password')

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(access_token=token, role=user.role)


@router.get('/me', response_model=MeResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    return MeResponse(
        user=UserSummary.model_validate(current_user),
        patient_profile_id=current_user.patient_profile.id if current_user.patient_profile else None,
        doctor_profile_id=current_user.doctor_profile.id if current_user.doctor_profile else None,
    )
