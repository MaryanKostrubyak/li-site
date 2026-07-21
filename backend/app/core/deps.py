from collections.abc import Callable
from typing import Annotated

import secrets
from urllib.parse import urlparse

from fastapi import Depends, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.core.config import get_settings
from app.core.errors import ApiError
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/v1/auth/login', auto_error=False)
settings = get_settings()


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    bearer_token: Annotated[str | None, Depends(oauth2_scheme)],
) -> User:
    credentials_exc = ApiError(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code='authentication_required',
        message='Sign in to continue.',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    token = request.cookies.get(settings.session_cookie_name) or bearer_token
    if not token:
        raise credentials_exc
    try:
        payload = decode_token(token)
        user_id = payload.get('sub')
    except ValueError:
        raise credentials_exc

    if not user_id:
        raise credentials_exc

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise credentials_exc
    return user


def require_role(*roles: UserRole) -> Callable[[User], User]:
    def role_dependency(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in roles:
            raise ApiError(status.HTTP_403_FORBIDDEN, 'forbidden', 'You do not have access to this action.')
        return current_user

    return role_dependency


def verify_csrf(request: Request) -> None:
    """Validate same-origin requests and the double-submit CSRF token."""
    origin = request.headers.get('origin')
    if origin:
        parsed_origin = urlparse(origin)
        parsed_request = urlparse(str(request.base_url))
        allowed_origins = {settings.frontend_url.rstrip('/'), *settings.cors_origins_list}
        normalized_origin = f'{parsed_origin.scheme}://{parsed_origin.netloc}'
        normalized_request = f'{parsed_request.scheme}://{parsed_request.netloc}'
        if normalized_origin != normalized_request and normalized_origin not in allowed_origins:
            raise ApiError(status.HTTP_403_FORBIDDEN, 'origin_rejected', 'Request origin is not allowed.')

    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get('X-CSRF-Token')
    if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
        raise ApiError(
            status.HTTP_403_FORBIDDEN,
            'csrf_failed',
            'Your security token is missing or invalid. Refresh the page and try again.',
        )
