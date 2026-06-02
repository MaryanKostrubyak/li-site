# Aether Clinic - Booking and Patient CRM Demo

Portfolio/demo full-stack web application for a fictional medical clinic. The project demonstrates a public booking website, role-based dashboards, patient CRM workflows, scheduling rules, notification automation, and practical AI-assisted actions.

> Portfolio positioning: this repository is a representative demo/case-study implementation. It is not presented as a complete client production codebase, does not include real patient data, and excludes production secrets or private business rules.

## Screenshots

<p>
  <img src="docs/screenshots/public-home-desktop.png" alt="Public booking website desktop view" width="49%" />
  <img src="docs/screenshots/admin-crm-dashboard.png" alt="Admin CRM dashboard desktop view" width="49%" />
</p>

<p>
  <img src="docs/screenshots/patient-crm-record.png" alt="Patient CRM record desktop view" width="49%" />
  <img src="docs/screenshots/doctor-dashboard.png" alt="Doctor dashboard desktop view" width="49%" />
</p>

<p>
  <img src="docs/screenshots/booking-flow-mobile.png" alt="Mobile booking flow" width="32%" />
</p>

## Demo Scope

This repo is designed to communicate architecture and product delivery quality:

- Fictional brand, demo users, generated/placeholder clinic visuals, and sample operational data
- Public website with services, doctors, contact information, and booking calls to action
- Appointment booking flow with service, doctor, date, slot, patient intake, and visit reason
- JWT authentication and role-based access for `admin`, `doctor`, and `patient`
- Admin dashboard with appointments, metrics, manual booking, patient CRM records, tags, and internal notes
- Doctor dashboard with schedule, appointment status updates, visit notes, and AI formatting hooks
- Patient portal with upcoming/history views, profile updates, cancellation, rescheduling, and notification preferences
- Scheduling checks for doctor availability, service duration, overlapping appointments, cancellation, and rescheduling
- Notification abstraction for email/Telegram-style flows with safe skipped states when providers are not configured
- AI service layer with deterministic fallback behavior when no API key is configured

## Tech Stack

Frontend:

- Next.js App Router
- TypeScript
- Tailwind CSS
- React Hook Form and Zod
- TanStack Query
- lucide-react icons

Backend:

- FastAPI
- SQLAlchemy 2.x
- Alembic
- Pydantic and pydantic-settings
- JWT auth with `python-jose`
- APScheduler reminder task

Infrastructure:

- PostgreSQL target database
- Docker and Docker Compose
- Optional OpenAI, SMTP, and Telegram integrations

## Runtime Requirements

- Node.js `20.19+` or `22.13+`
- npm `10+`
- Python `3.11+`
- Docker Desktop / Docker Engine with Compose plugin for containerized runs

## Repository Structure

```text
.
|-- backend/
|   |-- alembic/
|   |-- app/
|   |   |-- api/v1/endpoints/
|   |   |-- core/
|   |   |-- db/
|   |   |-- models/
|   |   |-- schemas/
|   |   |-- services/
|   |   `-- tasks/
|   |-- scripts/seed.py
|   |-- tests/
|   `-- Dockerfile
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|   |-- public/
|   |-- types/
|   `-- Dockerfile
|-- docs/
|   |-- screenshots/
|   |-- architecture.md
|   |-- deployment.md
|   `-- progress.md
|-- docker-compose.yml
|-- NOTICE.md
`-- README.md
```

## Demo Credentials

Use these only after running the seed script or Docker Compose seed flow.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@aiclinic.demo` | `AdminPass123!` |
| Doctor | `doctor.smith@aiclinic.demo` | `DoctorPass123!` |
| Patient | `patient.johnson@aiclinic.demo` | `PatientPass123!` |

## Quick Start with Docker

```powershell
docker compose up -d --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API health check: `http://localhost:8000/health`
- PostgreSQL: `localhost:5432`

The backend container runs migrations and seeds demo data on startup.

## Manual Local Setup

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
```

If you run the backend outside Docker, update `backend/.env` so `DATABASE_URL` points to a reachable PostgreSQL instance, for example:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/clinic
```

Run migrations and seed data:

```powershell
$env:PYTHONPATH='.'
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\python scripts/seed.py
```

Start the API:

```powershell
$env:PYTHONPATH='.'
.\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

`NEXT_PUBLIC_API_URL` is a build-time variable for Next.js. When you deploy the frontend through Docker or another CI/CD build, set it before `npm run build`, not only at container runtime.

## Environment Variables

Backend variables live in `backend/.env` and should be copied from `backend/.env.example`.

Required for normal local operation:

- `SECRET_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `FRONTEND_URL`

Optional integrations:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`
- `TELEGRAM_BOT_TOKEN`

Frontend variables live in `frontend/.env.local` and should be copied from `frontend/.env.example`.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Quality Checks

Backend tests:

```powershell
cd backend
.\.venv\Scripts\pytest
```

Frontend lint and production build:

```powershell
cd frontend
npm run lint
npm run build
```

Verified locally on June 2, 2026:

- Backend tests: `2 passed`
- Frontend lint: passed
- Frontend production build: passed
- `npm audit`: high-severity Next.js advisories removed by upgrading from `16.2.4` to `16.2.7`
- Docker Compose: configuration validated, but live container startup could not be completed because the local Docker Linux engine was unavailable

## AI and Notification Behavior

- AI endpoints are usable without an OpenAI key because the service returns deterministic fallback responses.
- AI requests are logged with success, fallback, or failed status.
- Notification delivery is abstracted behind provider-style methods.
- Missing SMTP or Telegram configuration records a skipped delivery state instead of breaking core booking flow.

## Deployment Notes

See [docs/deployment.md](docs/deployment.md) for deployment options:

- Single VPS Docker deployment
- Split deployment with frontend on Vercel, backend on a Python host, and managed PostgreSQL
- Production hardening checklist

Release notes for the first public portfolio drop live in [CHANGELOG.md](CHANGELOG.md).

## What Is Intentionally Not Included

- Real patient or clinic data
- Production credentials, tokens, or private `.env` files
- Client-specific proprietary business rules
- Full regulated medical compliance program
- Payment processing, billing, or insurance workflows

## License / Reuse

This repository is published for portfolio review and demonstration. See [NOTICE.md](NOTICE.md) for scope and reuse notes.
