from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.availability_schedule import AvailabilitySchedule
from app.models.enums import AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.service import Service
from app.core.config import get_settings

settings = get_settings()
CLINIC_ZONE = ZoneInfo(settings.clinic_timezone)


class SchedulingError(Exception):
    pass


class BookingConflictError(SchedulingError):
    pass


class SlotUnavailableError(SchedulingError):
    pass


def utc_now() -> datetime:
    return datetime.now(UTC)


def clinic_local_to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=CLINIC_ZONE)
    return value.astimezone(UTC)


def clinic_today(now: datetime | None = None) -> date:
    return (now or utc_now()).astimezone(CLINIC_ZONE).date()


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
    local_start = start_at.astimezone(CLINIC_ZONE)
    local_end = end_at.astimezone(CLINIC_ZONE)
    weekday = local_start.weekday()

    for schedule in availabilities:
        if not schedule.is_active or schedule.weekday != weekday:
            continue
        schedule_start = datetime.combine(local_start.date(), schedule.start_time, tzinfo=CLINIC_ZONE)
        schedule_end = datetime.combine(local_start.date(), schedule.end_time, tzinfo=CLINIC_ZONE)
        if local_start >= schedule_start and local_end <= schedule_end:
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


def validate_booking_slot(
    db: Session,
    doctor: DoctorProfile,
    service: Service,
    start_at: datetime,
    exclude_appointment_id: str | None = None,
) -> datetime:
    if not doctor.is_accepting_new_patients:
        raise SlotUnavailableError('Doctor is not accepting appointments')
    if service not in doctor.services:
        raise SlotUnavailableError('Doctor does not offer the selected service')
    if to_utc(start_at) < utc_now():
        raise SlotUnavailableError('Selected time is in the past')
    return validate_slot_available(
        db,
        doctor_id=doctor.id,
        start_at=start_at,
        duration_minutes=service.duration_minutes,
        exclude_appointment_id=exclude_appointment_id,
    )


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

    day_start = datetime.combine(target_date, time(0, 0), tzinfo=CLINIC_ZONE).astimezone(UTC)
    day_end = datetime.combine(target_date + timedelta(days=1), time(0, 0), tzinfo=CLINIC_ZONE).astimezone(UTC)

    booked_stmt = select(Appointment).where(
        Appointment.doctor_id == doctor_id,
        Appointment.status != AppointmentStatus.canceled,
        Appointment.start_at < day_end,
        Appointment.end_at > day_start,
    )
    booked = db.execute(booked_stmt).scalars().all()

    slots: list[tuple[datetime, datetime]] = []
    for schedule in schedules:
        cursor = datetime.combine(target_date, schedule.start_time, tzinfo=CLINIC_ZONE).astimezone(UTC)
        window_end = datetime.combine(target_date, schedule.end_time, tzinfo=CLINIC_ZONE).astimezone(UTC)

        while cursor + timedelta(minutes=service_duration_minutes) <= window_end:
            candidate_end = cursor + timedelta(minutes=service_duration_minutes)
            overlaps = any(
                to_utc(appt.start_at) < candidate_end
                and to_utc(appt.end_at) > cursor
                and appt.status != AppointmentStatus.canceled
                for appt in booked
            )
            if not overlaps and cursor >= utc_now():
                slots.append((cursor, candidate_end))
            cursor += timedelta(minutes=schedule.slot_interval_minutes)

    return slots
