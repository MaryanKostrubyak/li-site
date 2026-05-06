from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, NotificationEventType
from app.models.notification_log import NotificationLog
from app.services.notification_service import notification_service


REMINDER_WINDOWS = {
    NotificationEventType.reminder_24h: (timedelta(hours=23, minutes=30), timedelta(hours=24, minutes=30)),
    NotificationEventType.reminder_2h: (timedelta(hours=1, minutes=30), timedelta(hours=2, minutes=30)),
}


def run_due_reminders(db: Session) -> dict[str, int]:
    now = datetime.now(UTC)
    sent_count = 0

    for event_type, (window_start_delta, window_end_delta) in REMINDER_WINDOWS.items():
        range_start = now + window_start_delta
        range_end = now + window_end_delta

        stmt = select(Appointment).where(
            Appointment.status.in_([AppointmentStatus.new, AppointmentStatus.confirmed]),
            Appointment.start_at >= range_start,
            Appointment.start_at <= range_end,
        )
        appointments = db.execute(stmt).scalars().all()

        for appointment in appointments:
            existing_log = db.execute(
                select(NotificationLog.id).where(
                    and_(
                        NotificationLog.appointment_id == appointment.id,
                        NotificationLog.event_type == event_type,
                    )
                )
            ).scalar_one_or_none()
            if existing_log:
                continue

            notification_service.send_for_appointment(db, appointment, event_type)
            sent_count += 1

    return {'processed': sent_count}
