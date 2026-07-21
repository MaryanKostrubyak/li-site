# Aether Clinic

<p align="center">
  <strong>Care, clearly arranged.</strong><br />
  A full-stack clinic experience for booking, scheduling, patient care, and operations.
</p>

<p align="center">
  <a href="https://maryankostrubyak.github.io/li-site/">Project overview</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

## What is inside

- 🗓️ A four-step booking flow with compatible doctors and live Pacific Time availability
- 🧑‍⚕️ Focused workspaces for patients, doctors, and clinic administrators
- 🔐 HttpOnly cookie sessions, CSRF protection, role checks, and clear status transitions
- ⏱️ UTC storage with DST-aware clinic scheduling in `America/Los_Angeles`
- 🧾 Patient history, rescheduling, cancellation, follow-up, internal notes, and appointment records

## Screenshots

| Public site | Booking on mobile |
| --- | --- |
| ![Aether Clinic public site](docs/screenshots/public-home-desktop.png) | ![Aether Clinic booking flow](docs/screenshots/booking-flow-mobile.png) |

| Clinic operations | Patient record |
| --- | --- |
| ![Aether Clinic operations workspace](docs/screenshots/admin-crm-dashboard.png) | ![Aether Clinic patient record](docs/screenshots/patient-crm-record.png) |

## Built with

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, TanStack Query
- **Backend:** FastAPI, SQLAlchemy, Alembic, Pydantic
- **Data:** PostgreSQL for Docker deployments, SQLite for local development and tests
- **Quality:** Vitest, React Testing Library, Playwright, axe, ESLint

## Run locally

### Docker

```powershell
docker compose up -d --build
```

Open `http://localhost:3000`.

### Local development

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
$env:DATABASE_URL='sqlite:///./clinic.db'
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m scripts.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In a second terminal:

```powershell
cd frontend
npm install
$env:BACKEND_INTERNAL_URL='http://127.0.0.1:8000'
npm run dev
```

### Sample access

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@aetherclinic.test` | `AdminPass123!` |
| Doctor | `amelia@aetherclinic.test` | `DoctorPass123!` |
| Patient | `emily@aetherclinic.test` | `PatientPass123!` |

Quick access is enabled only when `DEMO_MODE=true`.

## Checks

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
npm run test:coverage
npm run lint
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment notes](docs/deployment.md)
- [Product notes](docs/case-study.md)
- [Image credits](NOTICE.md)

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before opening a change.

## License

Distributed under the [MIT License](LICENSE).
