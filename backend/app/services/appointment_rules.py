from datetime import UTC, datetime

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, UserRole


class InvalidStatusTransition(ValueError):
    pass


class AppointmentActionNotAllowed(ValueError):
    pass


ALLOWED_STATUS_TRANSITIONS: dict[UserRole, dict[AppointmentStatus, set[AppointmentStatus]]] = {
    UserRole.admin: {
        AppointmentStatus.new: {AppointmentStatus.confirmed, AppointmentStatus.canceled},
        AppointmentStatus.confirmed: {
            AppointmentStatus.completed,
            AppointmentStatus.no_show,
            AppointmentStatus.canceled,
        },
    },
    UserRole.doctor: {
        AppointmentStatus.new: {AppointmentStatus.confirmed},
        AppointmentStatus.confirmed: {AppointmentStatus.completed, AppointmentStatus.no_show},
    },
    UserRole.patient: {},
}


def validate_status_transition(
    role: UserRole,
    current: AppointmentStatus,
    target: AppointmentStatus,
) -> None:
    allowed = ALLOWED_STATUS_TRANSITIONS.get(role, {}).get(current, set())
    if target not in allowed:
        raise InvalidStatusTransition(f'{role.value} cannot change {current.value} to {target.value}')


def ensure_patient_can_modify(appointment: Appointment, now: datetime | None = None) -> None:
    active_now = now or datetime.now(UTC)
    start_at = appointment.start_at
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=UTC)
    if start_at <= active_now:
        raise AppointmentActionNotAllowed('past appointments cannot be changed')
    if appointment.status not in {AppointmentStatus.new, AppointmentStatus.confirmed}:
        raise AppointmentActionNotAllowed(f'{appointment.status.value} appointments cannot be changed')
