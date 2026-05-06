from datetime import UTC, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.appointment import Appointment
from app.models.availability_schedule import AvailabilitySchedule
from app.models.doctor_profile import DoctorProfile
from app.models.enums import AppointmentStatus, FollowUpStatus, UserRole
from app.models.patient_internal_note import PatientInternalNote
from app.models.patient_profile import PatientProfile
from app.models.patient_tag import PatientTag
from app.models.service import Service
from app.models.user import User


def ensure_user(db, email: str, full_name: str, role: UserRole, password: str, phone: str | None = None) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user:
        return user
    user = User(
        email=email,
        full_name=full_name,
        password_hash=get_password_hash(password),
        role=role,
        phone=phone,
    )
    db.add(user)
    db.flush()
    return user


def run() -> None:
    db = SessionLocal()
    try:
        if db.execute(select(Service.id)).first():
            print('Seed skipped: data already exists.')
            return

        admin = ensure_user(db, 'admin@aiclinic.demo', 'Olivia Carter', UserRole.admin, 'AdminPass123!')

        doctor_user_1 = ensure_user(
            db,
            'doctor.smith@aiclinic.demo',
            'Dr. Amelia Smith',
            UserRole.doctor,
            'DoctorPass123!',
            '+1-202-555-0101',
        )
        doctor_user_2 = ensure_user(
            db,
            'doctor.khan@aiclinic.demo',
            'Dr. Farid Khan',
            UserRole.doctor,
            'DoctorPass123!',
            '+1-202-555-0102',
        )

        patient_user_1 = ensure_user(
            db,
            'patient.johnson@aiclinic.demo',
            'Emily Johnson',
            UserRole.patient,
            'PatientPass123!',
            '+1-202-555-0191',
        )
        patient_user_2 = ensure_user(
            db,
            'patient.lee@aiclinic.demo',
            'Daniel Lee',
            UserRole.patient,
            'PatientPass123!',
            '+1-202-555-0192',
        )

        doctor_1 = DoctorProfile(
            user_id=doctor_user_1.id,
            specialty='General Medicine',
            bio='Specialist in preventive care and chronic condition management.',
            years_experience=11,
            consultation_fee=Decimal('120.00'),
            is_accepting_new_patients=True,
        )
        doctor_2 = DoctorProfile(
            user_id=doctor_user_2.id,
            specialty='Cardiology',
            bio='Cardiologist focused on diagnostics, hypertension, and follow-up treatment plans.',
            years_experience=14,
            consultation_fee=Decimal('180.00'),
            is_accepting_new_patients=True,
        )
        db.add_all([doctor_1, doctor_2])
        db.flush()

        patient_1 = PatientProfile(
            user_id=patient_user_1.id,
            lead_source='google_ads',
            follow_up_status=FollowUpStatus.needed,
            notification_email_enabled=True,
            notification_telegram_enabled=False,
        )
        patient_2 = PatientProfile(
            user_id=patient_user_2.id,
            lead_source='referral',
            follow_up_status=FollowUpStatus.scheduled,
            notification_email_enabled=True,
            notification_telegram_enabled=False,
        )
        db.add_all([patient_1, patient_2])
        db.flush()

        services = [
            Service(
                name='General Consultation',
                slug='general-consultation',
                description='Comprehensive consultation for common symptoms and preventive care.',
                duration_minutes=30,
                price=Decimal('79.00'),
                is_active=True,
            ),
            Service(
                name='Cardiology Follow-Up',
                slug='cardiology-follow-up',
                description='Follow-up appointment with blood pressure and treatment plan review.',
                duration_minutes=45,
                price=Decimal('129.00'),
                is_active=True,
            ),
            Service(
                name='Full Annual Checkup',
                slug='annual-checkup',
                description='Detailed yearly health checkup and personalized prevention plan.',
                duration_minutes=60,
                price=Decimal('199.00'),
                is_active=True,
            ),
        ]
        db.add_all(services)
        db.flush()

        availability_rows = []
        for weekday in [0, 1, 2, 3, 4]:
            availability_rows.append(
                AvailabilitySchedule(
                    doctor_id=doctor_1.id,
                    weekday=weekday,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                    slot_interval_minutes=30,
                    is_active=True,
                )
            )
            availability_rows.append(
                AvailabilitySchedule(
                    doctor_id=doctor_2.id,
                    weekday=weekday,
                    start_time=time(10, 0),
                    end_time=time(18, 0),
                    slot_interval_minutes=30,
                    is_active=True,
                )
            )
        db.add_all(availability_rows)

        now = datetime.now(UTC)
        today_morning = now.replace(hour=9, minute=30, second=0, microsecond=0)

        appointments = [
            Appointment(
                patient_id=patient_1.id,
                doctor_id=doctor_1.id,
                service_id=services[0].id,
                status=AppointmentStatus.confirmed,
                start_at=now + timedelta(days=1, hours=2),
                end_at=now + timedelta(days=1, hours=2, minutes=30),
                reason='Recurring headaches and fatigue over the last week.',
                source_channel='website',
                issue_summary='Patient reports recurring headaches with fatigue.',
                issue_classification='routine',
            ),
            Appointment(
                patient_id=patient_2.id,
                doctor_id=doctor_2.id,
                service_id=services[1].id,
                status=AppointmentStatus.new,
                start_at=now + timedelta(days=2, hours=1),
                end_at=now + timedelta(days=2, hours=1, minutes=45),
                reason='Blood pressure follow-up and medication adjustment review.',
                source_channel='referral',
                issue_summary='Follow-up for blood pressure management.',
                issue_classification='follow-up',
            ),
            Appointment(
                patient_id=patient_1.id,
                doctor_id=doctor_1.id,
                service_id=services[2].id,
                status=AppointmentStatus.completed,
                start_at=now - timedelta(days=14),
                end_at=now - timedelta(days=14) + timedelta(minutes=60),
                reason='Annual wellness exam and blood panel discussion.',
                source_channel='website',
                issue_summary='Annual preventive care visit completed.',
                issue_classification='consultation',
            ),
            Appointment(
                patient_id=patient_2.id,
                doctor_id=doctor_2.id,
                service_id=services[1].id,
                status=AppointmentStatus.canceled,
                start_at=today_morning - timedelta(days=3),
                end_at=today_morning - timedelta(days=3) + timedelta(minutes=45),
                reason='Canceled by patient due to travel.',
                source_channel='phone',
                issue_summary='Canceled appointment.',
                issue_classification='follow-up',
                canceled_at=now - timedelta(days=4),
            ),
            Appointment(
                patient_id=patient_1.id,
                doctor_id=doctor_1.id,
                service_id=services[0].id,
                status=AppointmentStatus.no_show,
                start_at=now - timedelta(days=7, hours=1),
                end_at=now - timedelta(days=7, minutes=30),
                reason='Missed consultation without notice.',
                source_channel='website',
                issue_summary='No-show recorded.',
                issue_classification='routine',
            ),
        ]
        db.add_all(appointments)

        db.add_all(
            [
                PatientTag(patient_id=patient_1.id, tag='high-value'),
                PatientTag(patient_id=patient_1.id, tag='follow-up-needed'),
                PatientTag(patient_id=patient_2.id, tag='cardio'),
            ]
        )

        db.add_all(
            [
                PatientInternalNote(
                    patient_id=patient_1.id,
                    admin_id=admin.id,
                    note='Patient prefers early morning appointments when available.',
                ),
                PatientInternalNote(
                    patient_id=patient_2.id,
                    admin_id=admin.id,
                    note='Lead from physician referral partner clinic.',
                ),
            ]
        )

        db.commit()
        print('Seed complete.')
    finally:
        db.close()


if __name__ == '__main__':
    run()
