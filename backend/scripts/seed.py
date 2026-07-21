from datetime import datetime, time, timedelta
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
from app.services.scheduling import CLINIC_ZONE, clinic_local_to_utc, clinic_today


def ensure_user(db, email: str, full_name: str, role: UserRole, password: str, phone: str | None = None) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        user = User(email=email, password_hash=get_password_hash(password), role=role)
        db.add(user)
    user.full_name = full_name
    user.phone = phone
    user.is_active = True
    db.flush()
    return user


def ensure_service(db, *, name: str, slug: str, description: str, duration: int, price: str) -> Service:
    service = db.execute(select(Service).where(Service.slug == slug)).scalar_one_or_none()
    if not service:
        service = Service(slug=slug)
        db.add(service)
    service.name = name
    service.description = description
    service.duration_minutes = duration
    service.price = Decimal(price)
    service.is_active = True
    db.flush()
    return service


def ensure_doctor(db, user: User, *, slug: str, specialty: str, bio: str, years: int, fee: str) -> DoctorProfile:
    doctor = db.execute(select(DoctorProfile).where(DoctorProfile.user_id == user.id)).scalar_one_or_none()
    if not doctor:
        doctor = DoctorProfile(user_id=user.id)
        db.add(doctor)
    doctor.slug = slug
    doctor.specialty = specialty
    doctor.bio = bio
    doctor.years_experience = years
    doctor.consultation_fee = Decimal(fee)
    doctor.is_accepting_new_patients = True
    db.flush()
    return doctor


def ensure_patient(db, user: User, lead_source: str, follow_up: FollowUpStatus) -> PatientProfile:
    patient = db.execute(select(PatientProfile).where(PatientProfile.user_id == user.id)).scalar_one_or_none()
    if not patient:
        patient = PatientProfile(user_id=user.id)
        db.add(patient)
    patient.lead_source = lead_source
    patient.follow_up_status = follow_up
    patient.notification_email_enabled = True
    patient.notification_telegram_enabled = False
    db.flush()
    return patient


def next_clinic_weekday(weekday: int, weeks: int = 0) -> datetime:
    today = clinic_today()
    days = (weekday - today.weekday()) % 7
    target = today + timedelta(days=days + weeks * 7)
    return datetime.combine(target, time(10), tzinfo=CLINIC_ZONE)


def ensure_appointment(
    db,
    *,
    code: str,
    patient: PatientProfile,
    doctor: DoctorProfile,
    service: Service,
    start_local: datetime,
    status: AppointmentStatus,
    reason: str,
) -> Appointment:
    appointment = db.execute(select(Appointment).where(Appointment.reference_code == code)).scalar_one_or_none()
    if not appointment:
        appointment = Appointment(reference_code=code)
        db.add(appointment)
    start_at = clinic_local_to_utc(start_local)
    appointment.patient_id = patient.id
    appointment.doctor_id = doctor.id
    appointment.service_id = service.id
    appointment.start_at = start_at
    appointment.end_at = start_at + timedelta(minutes=service.duration_minutes)
    appointment.status = status
    appointment.reason = reason
    appointment.source_channel = 'website'
    appointment.issue_summary = 'Visit summary generated from the booking details.'
    appointment.issue_classification = 'routine'
    return appointment


def run() -> None:
    db = SessionLocal()
    try:
        for user in db.execute(select(User)).scalars():
            if user.email.endswith('@aiclinic.demo') or user.email.endswith('@aetherclinic.demo'):
                user.email = f'{user.email.split("@", 1)[0]}@aetherclinic.test'

        admin = ensure_user(db, 'admin@aetherclinic.test', 'Olivia Carter', UserRole.admin, 'AdminPass123!')
        amelia_user = ensure_user(
            db, 'amelia@aetherclinic.test', 'Dr. Amelia Smith', UserRole.doctor, 'DoctorPass123!', '+1 415 555 0101'
        )
        farid_user = ensure_user(
            db, 'farid@aetherclinic.test', 'Dr. Farid Khan', UserRole.doctor, 'DoctorPass123!', '+1 415 555 0102'
        )
        emily_user = ensure_user(
            db, 'emily@aetherclinic.test', 'Emily Johnson', UserRole.patient, 'PatientPass123!', '+1 415 555 0191'
        )
        daniel_user = ensure_user(
            db, 'daniel@aetherclinic.test', 'Daniel Lee', UserRole.patient, 'PatientPass123!', '+1 415 555 0192'
        )

        amelia = ensure_doctor(
            db,
            amelia_user,
            slug='amelia-smith',
            specialty='Primary Care',
            bio='Thoughtful preventive care and support for everyday health concerns.',
            years=11,
            fee='120.00',
        )
        farid = ensure_doctor(
            db,
            farid_user,
            slug='farid-khan',
            specialty='Cardiology',
            bio='Clear, collaborative follow-up care for heart health and blood pressure.',
            years=14,
            fee='180.00',
        )
        emily = ensure_patient(db, emily_user, 'website', FollowUpStatus.needed)
        daniel = ensure_patient(db, daniel_user, 'referral', FollowUpStatus.scheduled)

        consultation = ensure_service(
            db,
            name='General Consultation',
            slug='general-consultation',
            description='A focused visit for symptoms, questions, and a practical care plan.',
            duration=30,
            price='79.00',
        )
        cardiology = ensure_service(
            db,
            name='Cardiology Follow-Up',
            slug='cardiology-follow-up',
            description='Review blood pressure, symptoms, medication, and next steps.',
            duration=45,
            price='129.00',
        )
        checkup = ensure_service(
            db,
            name='Annual Checkup',
            slug='annual-checkup',
            description='A complete yearly health review with a prevention plan.',
            duration=60,
            price='199.00',
        )
        amelia.services = [consultation, checkup]
        farid.services = [cardiology]

        for doctor in (amelia, farid):
            existing = {(row.weekday, row.start_time) for row in doctor.availabilities}
            for weekday in range(5):
                start = time(9 if doctor is amelia else 10)
                if (weekday, start) not in existing:
                    db.add(
                        AvailabilitySchedule(
                            doctor_id=doctor.id,
                            weekday=weekday,
                            start_time=start,
                            end_time=time(17 if doctor is amelia else 18),
                            slot_interval_minutes=30,
                            is_active=True,
                        )
                    )

        ensure_appointment(
            db,
            code='AET-DEMO01',
            patient=emily,
            doctor=amelia,
            service=consultation,
            start_local=next_clinic_weekday(0, 1),
            status=AppointmentStatus.confirmed,
            reason='Recurring headaches and fatigue over the last week.',
        )
        ensure_appointment(
            db,
            code='AET-DEMO02',
            patient=daniel,
            doctor=farid,
            service=cardiology,
            start_local=next_clinic_weekday(1, 1),
            status=AppointmentStatus.new,
            reason='Blood pressure follow-up and medication review.',
        )
        ensure_appointment(
            db,
            code='AET-DEMO03',
            patient=emily,
            doctor=amelia,
            service=checkup,
            start_local=next_clinic_weekday(2, -2),
            status=AppointmentStatus.completed,
            reason='Annual wellness exam and prevention planning.',
        )

        if not emily.tags:
            db.add_all([PatientTag(patient_id=emily.id, tag='follow-up-needed'), PatientTag(patient_id=emily.id, tag='morning')])
        if not daniel.tags:
            db.add(PatientTag(patient_id=daniel.id, tag='cardiology'))
        if not emily.internal_notes:
            db.add(
                PatientInternalNote(
                    patient_id=emily.id,
                    admin_id=admin.id,
                    note='Patient prefers early morning appointments when available.',
                )
            )

        db.commit()
        print('Sample clinic data is up to date.')
    finally:
        db.close()


if __name__ == '__main__':
    run()
