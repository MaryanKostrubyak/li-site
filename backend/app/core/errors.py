from typing import Any

from fastapi import HTTPException


class ApiError(HTTPException):
    """HTTP error with a stable, frontend-friendly contract."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        *,
        field_errors: dict[str, list[str]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        detail: dict[str, Any] = {'code': code, 'message': message}
        if field_errors:
            detail['field_errors'] = field_errors
        super().__init__(status_code=status_code, detail=detail, headers=headers)
