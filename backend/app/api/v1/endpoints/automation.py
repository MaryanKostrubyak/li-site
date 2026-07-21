from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_role, verify_csrf
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.tasks.reminder_dispatcher import run_due_reminders

router = APIRouter(prefix='/automation', tags=['automation'])


@router.post('/run-reminders', dependencies=[Depends(verify_csrf)])
def run_reminders(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(UserRole.admin))],
) -> dict:
    return run_due_reminders(db)
