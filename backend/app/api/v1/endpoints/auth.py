from typing import Annotated

import secrets

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, verify_csrf
from app.core.errors import ApiError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    DemoLoginRequest,
    MeResponse,
    PatientRegisterRequest,
    UserSummary,
)

router = APIRouter(prefix='/auth', tags=['auth'])
settings = get_settings()


def _session_payload(user: User) -> MeResponse:
    return MeResponse(
        user=UserSummary.model_validate(user),
        patient_profile_id=user.patient_profile.id if user.patient_profile else None,
        doctor_profile_id=user.doctor_profile.id if user.doctor_profile else None,
    )


def _set_session(response: Response, user: User) -> None:
    token = create_access_token(subject=user.id, role=user.role.value)
    csrf_token = secrets.token_urlsafe(32)
    cookie_options = {
        'secure': settings.secure_cookies,
        'samesite': 'lax',
        'max_age': settings.access_token_expire_minutes * 60,
        'path': '/',
    }
    response.set_cookie(settings.session_cookie_name, token, httponly=True, **cookie_options)
    response.set_cookie(settings.csrf_cookie_name, csrf_token, httponly=False, **cookie_options)


@router.post('/register/patient', response_model=MeResponse, status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: PatientRegisterRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> MeResponse:
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise ApiError(status.HTTP_409_CONFLICT, 'email_registered', 'An account already exists for this email.')

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
    db.refresh(user)

    _set_session(response, user)
    return _session_payload(user)


@router.post('/login', response_model=MeResponse)
def login(payload: LoginRequest, response: Response, db: Annotated[Session, Depends(get_db)]) -> MeResponse:
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise ApiError(status.HTTP_401_UNAUTHORIZED, 'invalid_credentials', 'Invalid email or password.')

    _set_session(response, user)
    return _session_payload(user)


@router.post('/demo-login', response_model=MeResponse)
def demo_login(
    payload: DemoLoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> MeResponse:
    if not settings.demo_mode:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'not_found', 'Quick access is not available.')
    user = db.execute(
        select(User).where(User.role == payload.role, User.is_active.is_(True)).order_by(User.created_at)
    ).scalars().first()
    if not user:
        raise ApiError(status.HTTP_404_NOT_FOUND, 'demo_user_missing', 'No account is configured for this role.')
    _set_session(response, user)
    return _session_payload(user)


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_csrf)])
def logout(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path='/')
    response.delete_cookie(settings.csrf_cookie_name, path='/')


@router.get('/me', response_model=MeResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    return _session_payload(current_user)
