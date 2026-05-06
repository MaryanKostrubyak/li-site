from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.availability_schedule import AvailabilitySchedule
from app.models.enums import AppointmentStatus


class SchedulingError(Exception):
    pass


class BookingConflictError(SchedulingError):
    pass


class SlotUnavailableError(SchedulingError):
    pass


def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def has_appointment_overlap(
    db: Session,
    doctor_id: str,
    start_at: datetime,
    end_at: datetime,
    exclude_appointment_id: str | None = None,
) -> bool:
    start_at = to_utc(start_at)
    end_at = to_utc(end_at)

    conditions = [
        Appointment.doctor_id == doctor_id,
        Appointment.status != AppointmentStatus.canceled,
        Appointment.start_at < end_at,
        Appointment.end_at > start_at,
    ]
    if exclude_appointment_id:
        conditions.append(Appointment.id != exclude_appointment_id)

    stmt = select(Appointment.id).where(and_(*conditions)).limit(1)
    return db.execute(stmt).scalar_one_or_none() is not None


def _is_within_availability(
    start_at: datetime,
    end_at: datetime,
    availabilities: list[AvailabilitySchedule],
) -> bool:
    weekday = start_at.weekday()

    for schedule in availabilities:
        if not schedule.is_active or schedule.weekday != weekday:
            continue
        schedule_start = datetime.combine(start_at.date(), schedule.start_time, tzinfo=UTC)
        schedule_end = datetime.combine(start_at.date(), schedule.end_time, tzinfo=UTC)
        if start_at >= schedule_start and end_at <= schedule_end:
            return True
    return False


def validate_slot_available(
    db: Session,
    doctor_id: str,
    start_at: datetime,
    duration_minutes: int,
    exclude_appointment_id: str | None = None,
) -> datetime:
    start_at = to_utc(start_at)
    end_at = start_at + timedelta(minutes=duration_minutes)

    availability_stmt = select(AvailabilitySchedule).where(
        AvailabilitySchedule.doctor_id == doctor_id,
        AvailabilitySchedule.is_active.is_(True),
    )
    availabilities = db.execute(availability_stmt).scalars().all()

    if not _is_within_availability(start_at, end_at, availabilities):
        raise SlotUnavailableError('Selected time is outside doctor availability')

    if has_appointment_overlap(db, doctor_id, start_at, end_at, exclude_appointment_id=exclude_appointment_id):
        raise BookingConflictError('Selected slot conflicts with another appointment')

    return end_at


def list_available_slots(
    db: Session,
    doctor_id: str,
    target_date: date,
    service_duration_minutes: int,
) -> list[tuple[datetime, datetime]]:
    weekday = target_date.weekday()
    schedule_stmt = select(AvailabilitySchedule).where(
        AvailabilitySchedule.doctor_id == doctor_id,
        AvailabilitySchedule.weekday == weekday,
        AvailabilitySchedule.is_active.is_(True),
    )
    schedules = db.execute(schedule_stmt).scalars().all()
    if not schedules:
        return []

    day_start = datetime.combine(target_date, time(0, 0), tzinfo=UTC)
    day_end = day_start + timedelta(days=1)

    booked_stmt = select(Appointment).where(
        Appointment.doctor_id == doctor_id,
        Appointment.status != AppointmentStatus.canceled,
        Appointment.start_at < day_end,
        Appointment.end_at > day_start,
    )
    booked = db.execute(booked_stmt).scalars().all()

    slots: list[tuple[datetime, datetime]] = []
    for schedule in schedules:
        cursor = datetime.combine(target_date, schedule.start_time, tzinfo=UTC)
        window_end = datetime.combine(target_date, schedule.end_time, tzinfo=UTC)

        while cursor + timedelta(minutes=service_duration_minutes) <= window_end:
            candidate_end = cursor + timedelta(minutes=service_duration_minutes)
            overlaps = any(
                to_utc(appt.start_at) < candidate_end
                and to_utc(appt.end_at) > cursor
                and appt.status != AppointmentStatus.canceled
                for appt in booked
            )
            if not overlaps and cursor >= datetime.now(UTC):
                slots.append((cursor, candidate_end))
            cursor += timedelta(minutes=schedule.slot_interval_minutes)

    return slots
