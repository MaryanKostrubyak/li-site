from datetime import datetime, time, timedelta

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from app.services.scheduling import clinic_local_to_utc, clinic_today
from tests.test_auth_booking_api import _client, _login, _next_weekday, _seed


def _book(client, ids: dict[str, str], csrf: str, hour: int = 9) -> dict:
    appointment_date = _next_weekday(clinic_today(), 0)
    start = clinic_local_to_utc(datetime.combine(appointment_date, time(hour)))
    response = client.post(
        '/api/v1/appointments',
        headers={'X-CSRF-Token': csrf},
        json={
            'doctor_id': ids['doctor_id'],
            'service_id': ids['offered_id'],
            'start_at': start.isoformat(),
            'reason': 'Persistent symptoms that need a clinical review.',
        },
    )
    assert response.status_code == 201
    return response.json()


def test_patient_reschedule_preserves_history_and_reason() -> None:
    client, sessions = _client()
    ids = _seed(sessions)
    csrf = _login(client)
    original = _book(client, ids, csrf)
    new_start = datetime.fromisoformat(original['start_at']) + timedelta(minutes=30)

    response = client.post(
        f"/api/v1/appointments/{original['id']}/reschedule",
        headers={'X-CSRF-Token': csrf},
        json={'new_start_at': new_start.isoformat()},
    )

    assert response.status_code == 200
    replacement = response.json()
    assert replacement['id'] != original['id']
    assert replacement['rescheduled_from_appointment_id'] == original['id']

    with sessions() as db:
        old = db.get(Appointment, original['id'])
        assert old.status == AppointmentStatus.canceled
        assert old.cancellation_reason == 'Rescheduled by patient'
        assert old.reason == original['reason']


def test_terminal_status_cannot_be_edited_by_admin() -> None:
    client, sessions = _client()
    ids = _seed(sessions)
    csrf = _login(client)
    appointment = _book(client, ids, csrf)

    admin_login = client.post('/api/v1/auth/demo-login', json={'role': 'admin'})
    admin_csrf = admin_login.cookies['clinic_csrf']
    confirm = client.patch(
        f"/api/v1/admin/appointments/{appointment['id']}",
        headers={'X-CSRF-Token': admin_csrf},
        json={'status': 'confirmed'},
    )
    assert confirm.status_code == 200
    complete = client.patch(
        f"/api/v1/admin/appointments/{appointment['id']}",
        headers={'X-CSRF-Token': admin_csrf},
        json={'status': 'completed'},
    )
    assert complete.status_code == 200

    response = client.patch(
        f"/api/v1/admin/appointments/{appointment['id']}",
        headers={'X-CSRF-Token': admin_csrf},
        json={'status': 'confirmed'},
    )

    assert response.status_code == 409
    assert response.json()['code'] == 'invalid_status_transition'


def test_patient_profile_rejects_crm_follow_up_field() -> None:
    client, sessions = _client()
    _seed(sessions)
    csrf = _login(client)

    response = client.patch(
        '/api/v1/patient/profile',
        headers={'X-CSRF-Token': csrf},
        json={'follow_up_status': 'needed'},
    )

    assert response.status_code == 422


def test_public_doctors_expose_service_ids_and_reject_incompatible_slots() -> None:
    client, sessions = _client()
    ids = _seed(sessions)

    doctors = client.get('/api/v1/public/doctors')
    assert doctors.status_code == 200
    doctor = doctors.json()[0]
    assert doctor['slug'] == 'dr-demo'
    assert doctor['service_ids'] == [ids['offered_id']]

    appointment_date = _next_weekday(clinic_today(), 0)
    response = client.get(
        f"/api/v1/public/doctors/{ids['doctor_id']}/slots",
        params={'service_id': ids['unavailable_id'], 'date': appointment_date.isoformat()},
    )
    assert response.status_code == 409
    assert response.json()['code'] == 'doctor_service_mismatch'


def test_doctor_detail_and_note_preview_require_confirmed_save() -> None:
    client, sessions = _client()
    ids = _seed(sessions)
    patient_csrf = _login(client)
    appointment = _book(client, ids, patient_csrf)
    doctor_login = client.post('/api/v1/auth/demo-login', json={'role': 'doctor'})
    doctor_csrf = doctor_login.cookies['clinic_csrf']

    detail = client.get(f"/api/v1/doctor/appointments/{appointment['id']}")
    assert detail.status_code == 200
    assert detail.json()['patient']['name'] == 'Patient Demo'
    assert detail.json()['service']['name'] == 'Consultation'
    assert detail.json()['notes'] == []

    preview = client.post(
        f"/api/v1/doctor/appointments/{appointment['id']}/notes/preview",
        headers={'X-CSRF-Token': doctor_csrf},
        json={'raw_note': 'patient feels better continue water and rest'},
    )
    assert preview.status_code == 200
    assert preview.json()['preview']

    unchanged = client.get(f"/api/v1/doctor/appointments/{appointment['id']}")
    assert unchanged.json()['notes'] == []

    saved = client.post(
        f"/api/v1/doctor/appointments/{appointment['id']}/notes",
        headers={'X-CSRF-Token': doctor_csrf},
        json={'raw_note': 'patient feels better', 'formatted_note': preview.json()['preview']},
    )
    assert saved.status_code == 200
    detail_after_save = client.get(f"/api/v1/doctor/appointments/{appointment['id']}")
    assert len(detail_after_save.json()['notes']) == 1
