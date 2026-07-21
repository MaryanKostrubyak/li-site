from collections.abc import Generator
from datetime import date, datetime, time, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.availability_schedule import AvailabilitySchedule
from app.models.doctor_profile import DoctorProfile
from app.models.enums import UserRole
from app.models.patient_profile import PatientProfile
from app.models.service import Service
from app.models.user import User
from app.services.scheduling import clinic_local_to_utc, clinic_today


def _next_weekday(start: date, weekday: int) -> date:
    days = (weekday - start.weekday()) % 7
    return start + timedelta(days=days or 7)


def _client() -> tuple[TestClient, sessionmaker[Session]]:
    engine = create_engine(
        'sqlite+pysqlite:///:memory:',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    local_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db() -> Generator[Session, None, None]:
        db = local_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    return TestClient(app), local_session


def _seed(local_session: sessionmaker[Session]) -> dict[str, str]:
    db = local_session()
    try:
        patient_user = User(
            email='patient@aetherclinic.test',
            password_hash=get_password_hash('PatientPass123!'),
            full_name='Patient Demo',
            role=UserRole.patient,
        )
        admin_user = User(
            email='admin@aetherclinic.test',
            password_hash=get_password_hash('AdminPass123!'),
            full_name='Admin Demo',
            role=UserRole.admin,
        )
        doctor_user = User(
            email='doctor@aetherclinic.test',
            password_hash=get_password_hash('DoctorPass123!'),
            full_name='Dr. Demo',
            role=UserRole.doctor,
        )
        db.add_all([patient_user, admin_user, doctor_user])
        db.flush()
        patient = PatientProfile(user_id=patient_user.id)
        doctor = DoctorProfile(
            user_id=doctor_user.id,
            slug='dr-demo',
            specialty='Family medicine',
            bio='Demo doctor',
            years_experience=9,
            consultation_fee=100,
        )
        offered = Service(
            name='Consultation', slug='consultation', description='Consultation', duration_minutes=30, price=79
        )
        unavailable = Service(
            name='Cardiology', slug='cardiology', description='Cardiology', duration_minutes=45, price=129
        )
        doctor.services.append(offered)
        db.add_all([patient, doctor, offered, unavailable])
        db.flush()
        db.add(
            AvailabilitySchedule(
                doctor_id=doctor.id,
                weekday=0,
                start_time=time(9),
                end_time=time(12),
                slot_interval_minutes=30,
                is_active=True,
            )
        )
        db.commit()
        return {
            'patient_id': patient.id,
            'doctor_id': doctor.id,
            'offered_id': offered.id,
            'unavailable_id': unavailable.id,
        }
    finally:
        db.close()


def _login(client: TestClient) -> str:
    response = client.post(
        '/api/v1/auth/login',
        json={'email': 'patient@aetherclinic.test', 'password': 'PatientPass123!'},
    )
    assert response.status_code == 200
    assert 'access_token' not in response.json()
    assert response.cookies.get('clinic_session')
    csrf = response.cookies.get('clinic_csrf')
    assert csrf
    return csrf


def test_login_uses_http_only_cookie_and_cookie_auth() -> None:
    client, sessions = _client()
    _seed(sessions)

    _login(client)
    response = client.get('/api/v1/auth/me')

    assert response.status_code == 200
    assert response.json()['user']['email'] == 'patient@aetherclinic.test'
    assert 'HttpOnly' in client.post(
        '/api/v1/auth/login',
        json={'email': 'patient@aetherclinic.test', 'password': 'PatientPass123!'},
    ).headers['set-cookie']


def test_mutation_requires_csrf_header() -> None:
    client, sessions = _client()
    ids = _seed(sessions)
    _login(client)
    appointment_date = _next_weekday(clinic_today(), 0)
    start = clinic_local_to_utc(datetime.combine(appointment_date, time(9)))

    response = client.post(
        '/api/v1/appointments',
        json={
            'doctor_id': ids['doctor_id'],
            'service_id': ids['offered_id'],
            'start_at': start.isoformat(),
            'reason': 'A persistent headache for two days.',
        },
    )

    assert response.status_code == 403
    assert response.json()['code'] == 'csrf_failed'


def test_authenticated_patient_can_book_compatible_service() -> None:
    client, sessions = _client()
    ids = _seed(sessions)
    csrf = _login(client)
    appointment_date = _next_weekday(clinic_today(), 0)
    start = clinic_local_to_utc(datetime.combine(appointment_date, time(9)))

    response = client.post(
        '/api/v1/appointments',
        headers={'X-CSRF-Token': csrf},
        json={
            'doctor_id': ids['doctor_id'],
            'service_id': ids['offered_id'],
            'start_at': start.isoformat(),
            'reason': 'A persistent headache for two days.',
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload['reference_code'].startswith('AET-')
    assert payload['doctor']['name'] == 'Dr. Demo'
    assert payload['service']['name'] == 'Consultation'


def test_booking_rejects_service_not_offered_by_doctor() -> None:
    client, sessions = _client()
    ids = _seed(sessions)
    csrf = _login(client)
    appointment_date = _next_weekday(clinic_today(), 0)
    start = clinic_local_to_utc(datetime.combine(appointment_date, time(9)))

    response = client.post(
        '/api/v1/appointments',
        headers={'X-CSRF-Token': csrf},
        json={
            'doctor_id': ids['doctor_id'],
            'service_id': ids['unavailable_id'],
            'start_at': start.isoformat(),
            'reason': 'A cardiology follow-up request.',
        },
    )

    assert response.status_code == 409
    assert response.json()['code'] == 'slot_unavailable'


def test_demo_login_is_role_based_without_password() -> None:
    client, sessions = _client()
    _seed(sessions)

    response = client.post('/api/v1/auth/demo-login', json={'role': 'admin'})

    assert response.status_code == 200
    assert response.json()['user']['role'] == 'admin'
    assert response.cookies.get('clinic_session')
