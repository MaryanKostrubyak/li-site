from datetime import UTC, datetime, time, timedelta

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
from app.services.scheduling import BookingConflictError, clinic_local_to_utc, validate_slot_available


def _make_session() -> Session:
    engine = create_engine('sqlite+pysqlite:///:memory:', future=True)
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(bind=engine)
    return session_local()


def test_validate_slot_prevents_overlap() -> None:
    db = _make_session()

    doctor_user = User(email='doc@test.com', password_hash='x', full_name='Doc', role=UserRole.doctor)
    patient_user = User(email='p@test.com', password_hash='x', full_name='Patient', role=UserRole.patient)
    db.add_all([doctor_user, patient_user])
    db.flush()

    doctor = DoctorProfile(
        user_id=doctor_user.id,
        specialty='General',
        bio='Bio',
        years_experience=5,
        consultation_fee=100,
    )
    patient = PatientProfile(user_id=patient_user.id)
    service = Service(name='Consultation', slug='consultation', description='desc', duration_minutes=30, price=50)
    db.add_all([doctor, patient, service])
    db.flush()

    db.add(
        AvailabilitySchedule(
            doctor_id=doctor.id,
            weekday=0,
            start_time=time(9, 0),
            end_time=time(12, 0),
            slot_interval_minutes=30,
            is_active=True,
        )
    )

    start = clinic_local_to_utc(datetime(2026, 4, 27, 10, 0))
    end = start + timedelta(minutes=30)
    db.add(
        Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            service_id=service.id,
            status=AppointmentStatus.confirmed,
            start_at=start,
            end_at=end,
            reason='Existing appointment',
            source_channel='test',
        )
    )
    db.commit()

    try:
        validate_slot_available(db, doctor_id=doctor.id, start_at=start, duration_minutes=30)
        assert False, 'Expected BookingConflictError'
    except BookingConflictError:
        assert True


def test_validate_slot_within_availability() -> None:
    db = _make_session()

    doctor_user = User(email='doc2@test.com', password_hash='x', full_name='Doc 2', role=UserRole.doctor)
    db.add(doctor_user)
    db.flush()
    doctor = DoctorProfile(
        user_id=doctor_user.id,
        specialty='General',
        bio='Bio',
        years_experience=5,
        consultation_fee=100,
    )
    db.add(doctor)
    db.flush()

    db.add(
        AvailabilitySchedule(
            doctor_id=doctor.id,
            weekday=1,
            start_time=time(9, 0),
            end_time=time(17, 0),
            slot_interval_minutes=30,
            is_active=True,
        )
    )
    db.commit()

    start = clinic_local_to_utc(datetime(2026, 4, 28, 9, 30))
    end = validate_slot_available(db, doctor_id=doctor.id, start_at=start, duration_minutes=45)
    assert int((end - start).total_seconds() / 60) == 45
