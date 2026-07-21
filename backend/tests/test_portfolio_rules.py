from datetime import UTC, date, datetime, time, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models.appointment import Appointment
from app.models.availability_schedule import AvailabilitySchedule
from app.models.doctor_profile import DoctorProfile
from app.models.enums import AppointmentStatus, UserRole
from app.models.patient_profile import PatientProfile
from app.models.service import Service
from app.models.user import User
from app.services.appointment_rules import InvalidStatusTransition, validate_status_transition
from app.services.scheduling import (
    SlotUnavailableError,
    clinic_local_to_utc,
    list_available_slots,
)


def _make_session() -> Session:
    engine = create_engine('sqlite+pysqlite:///:memory:', future=True)
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _seed_booking_graph(db: Session) -> tuple[DoctorProfile, PatientProfile, Service, Service]:
    doctor_user = User(email='doctor@test.demo', password_hash='x', full_name='Dr. Test', role=UserRole.doctor)
    patient_user = User(email='patient@test.demo', password_hash='x', full_name='Patient Test', role=UserRole.patient)
    db.add_all([doctor_user, patient_user])
    db.flush()

    doctor = DoctorProfile(
        user_id=doctor_user.id,
        slug='doctor-test',
        specialty='Family medicine',
        bio='Test biography',
        years_experience=8,
        consultation_fee=100,
    )
    patient = PatientProfile(user_id=patient_user.id)
    offered = Service(
        name='Offered service',
        slug='offered-service',
        description='Offered',
        duration_minutes=30,
        price=80,
    )
    not_offered = Service(
        name='Other service',
        slug='other-service',
        description='Other',
        duration_minutes=45,
        price=120,
    )
    doctor.services.append(offered)
    db.add_all([doctor, patient, offered, not_offered])
    db.flush()
    return doctor, patient, offered, not_offered


def test_clinic_local_time_converts_to_utc_across_dst() -> None:
    winter = clinic_local_to_utc(datetime(2026, 1, 15, 9, 0))
    summer = clinic_local_to_utc(datetime(2026, 7, 15, 9, 0))

    assert winter == datetime(2026, 1, 15, 17, 0, tzinfo=UTC)
    assert summer == datetime(2026, 7, 15, 16, 0, tzinfo=UTC)


def test_available_slots_use_clinic_timezone_and_filter_past(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _make_session()
    doctor, _, offered, _ = _seed_booking_graph(db)
    db.add(
        AvailabilitySchedule(
            doctor_id=doctor.id,
            weekday=0,
            start_time=time(9, 0),
            end_time=time(11, 0),
            slot_interval_minutes=30,
            is_active=True,
        )
    )
    db.commit()

    monkeypatch.setattr('app.services.scheduling.utc_now', lambda: datetime(2026, 7, 6, 16, 15, tzinfo=UTC))
    slots = list_available_slots(db, doctor.id, date(2026, 7, 6), offered.duration_minutes)

    assert [start for start, _ in slots] == [
        datetime(2026, 7, 6, 16, 30, tzinfo=UTC),
        datetime(2026, 7, 6, 17, 0, tzinfo=UTC),
        datetime(2026, 7, 6, 17, 30, tzinfo=UTC),
    ]


def test_doctor_service_relationship_rejects_unoffered_service() -> None:
    db = _make_session()
    doctor, patient, _, not_offered = _seed_booking_graph(db)
    db.add(
        AvailabilitySchedule(
            doctor_id=doctor.id,
            weekday=0,
            start_time=time(9, 0),
            end_time=time(17, 0),
            slot_interval_minutes=30,
            is_active=True,
        )
    )
    db.commit()

    with pytest.raises(SlotUnavailableError, match='does not offer'):
        from app.services.scheduling import validate_booking_slot

        validate_booking_slot(
            db,
            doctor=doctor,
            service=not_offered,
            start_at=datetime(2026, 7, 6, 16, 0, tzinfo=UTC),
        )

    assert patient.id


@pytest.mark.parametrize(
    ('role', 'current', 'target'),
    [
        (UserRole.admin, AppointmentStatus.new, AppointmentStatus.confirmed),
        (UserRole.admin, AppointmentStatus.confirmed, AppointmentStatus.canceled),
        (UserRole.doctor, AppointmentStatus.new, AppointmentStatus.confirmed),
        (UserRole.doctor, AppointmentStatus.confirmed, AppointmentStatus.completed),
    ],
)
def test_valid_status_transitions(role: UserRole, current: AppointmentStatus, target: AppointmentStatus) -> None:
    validate_status_transition(role, current, target)


@pytest.mark.parametrize(
    ('role', 'current', 'target'),
    [
        (UserRole.doctor, AppointmentStatus.new, AppointmentStatus.completed),
        (UserRole.patient, AppointmentStatus.confirmed, AppointmentStatus.completed),
        (UserRole.admin, AppointmentStatus.completed, AppointmentStatus.confirmed),
        (UserRole.admin, AppointmentStatus.canceled, AppointmentStatus.new),
    ],
)
def test_invalid_status_transitions(role: UserRole, current: AppointmentStatus, target: AppointmentStatus) -> None:
    with pytest.raises(InvalidStatusTransition):
        validate_status_transition(role, current, target)


def test_past_appointment_cannot_be_canceled() -> None:
    db = _make_session()
    doctor, patient, offered, _ = _seed_booking_graph(db)
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        service_id=offered.id,
        status=AppointmentStatus.confirmed,
        start_at=datetime.now(UTC) - timedelta(days=1),
        end_at=datetime.now(UTC) - timedelta(days=1) + timedelta(minutes=30),
        reason='Past visit',
        source_channel='test',
        reference_code='AET-PAST01',
    )
    db.add(appointment)
    db.commit()

    from app.services.appointment_rules import AppointmentActionNotAllowed, ensure_patient_can_modify

    with pytest.raises(AppointmentActionNotAllowed, match='past'):
        ensure_patient_can_modify(appointment)
