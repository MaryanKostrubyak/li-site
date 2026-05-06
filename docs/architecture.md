# AI Clinic Booking & Patient CRM Platform - Architecture

## 1. Product Scope
Portfolio-grade SaaS web app for a medical clinic with:
- Public marketing website
- Online appointment booking flow
- JWT auth + role-based dashboards (`admin`, `doctor`, `patient`)
- Clinic CRM features for admins
- Scheduling + conflict-safe appointment management
- Notification automation abstraction (email/telegram)
- Practical AI assistant features behind a service layer with graceful fallback

## 2. System Architecture

### Frontend
- Next.js (App Router) + TypeScript
- Tailwind CSS + reusable UI components (`components/ui/*`)
- React Hook Form + Zod for typed forms
- TanStack Query for server state (appointments, services, doctors)
- Role-gated dashboard areas under `/dashboard/*`

### Backend
- FastAPI + SQLAlchemy 2.x + Pydantic
- Alembic migrations
- JWT access token auth
- RBAC authorization checks per endpoint
- Domain services for scheduling, notifications, AI, CRM operations

### Data Layer
- PostgreSQL primary database
- SQLAlchemy ORM models with normalized relations

### Infra
- Dockerfiles for frontend + backend
- Docker Compose for `db`, `backend`, `frontend`
- Optional env-configured integration keys (OpenAI, SMTP, Telegram)

## 3. Monorepo Layout

```text
/
  backend/
    app/
      api/
      core/
      db/
      models/
      schemas/
      services/
      repositories/
      tasks/
    alembic/
    tests/
    scripts/
  frontend/
    app/
    components/
    lib/
    hooks/
  docs/
    architecture.md
    progress.md
    deployment.md
```

## 4. Database Schema

### `users`
- `id` UUID PK
- `email` (unique)
- `password_hash`
- `full_name`
- `phone` (nullable)
- `role` enum (`admin`, `doctor`, `patient`)
- `is_active` bool
- `created_at`, `updated_at`

### `patient_profiles`
- `id` UUID PK
- `user_id` FK -> users (1:1)
- `date_of_birth` (nullable)
- `gender` (nullable)
- `address` (nullable)
- `emergency_contact` (nullable)
- `lead_source` (nullable)
- `follow_up_status` enum (`none`, `needed`, `scheduled`, `done`)
- `notification_email_enabled` bool
- `notification_telegram_enabled` bool
- `telegram_chat_id` (nullable)

### `doctor_profiles`
- `id` UUID PK
- `user_id` FK -> users (1:1)
- `specialty`
- `bio`
- `years_experience`
- `consultation_fee`
- `is_accepting_new_patients`

### `services`
- `id` UUID PK
- `name`
- `slug` unique
- `description`
- `duration_minutes`
- `price`
- `is_active`

### `availability_schedules`
- `id` UUID PK
- `doctor_id` FK -> doctor_profiles
- `weekday` int (0-6)
- `start_time` (time)
- `end_time` (time)
- `slot_interval_minutes` default 30
- `is_active`

### `appointments`
- `id` UUID PK
- `patient_id` FK -> patient_profiles
- `doctor_id` FK -> doctor_profiles
- `service_id` FK -> services
- `status` enum (`new`, `confirmed`, `completed`, `canceled`, `no_show`)
- `start_at` timestamp (UTC)
- `end_at` timestamp (UTC)
- `reason`
- `source_channel` (`website`, `phone`, `referral`, etc.)
- `issue_summary` (AI summary nullable)
- `issue_classification` (AI classification nullable)
- `canceled_at` nullable
- `rescheduled_from_appointment_id` nullable self-FK
- `created_at`, `updated_at`

### `appointment_notes`
- `id` UUID PK
- `appointment_id` FK -> appointments
- `doctor_id` FK -> doctor_profiles
- `raw_note`
- `formatted_note`
- `created_at`

### `patient_tags`
- `id` UUID PK
- `patient_id` FK -> patient_profiles
- `tag`
- `created_at`

### `patient_internal_notes`
- `id` UUID PK
- `patient_id` FK -> patient_profiles
- `admin_id` FK -> users
- `note`
- `created_at`

### `notification_logs`
- `id` UUID PK
- `appointment_id` FK -> appointments nullable
- `patient_id` FK -> patient_profiles nullable
- `channel` enum (`email`, `telegram`, `system`)
- `event_type` enum (`appointment_created`, `reminder_24h`, `reminder_2h`, `appointment_canceled`, `appointment_rescheduled`, `post_visit_follow_up`)
- `delivery_status` enum (`sent`, `skipped`, `failed`)
- `provider_response` text nullable
- `sent_at`

### `ai_request_logs`
- `id` UUID PK
- `patient_id` FK nullable
- `appointment_id` FK nullable
- `feature` (`booking_summary`, `request_classification`, `follow_up_message`, `format_note`)
- `input_text`
- `output_text` nullable
- `status` enum (`success`, `fallback`, `failed`)
- `created_at`

## 5. API Design (Major Endpoints)

### Auth
- `POST /api/v1/auth/register/patient`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Public Clinic Data
- `GET /api/v1/public/services`
- `GET /api/v1/public/doctors`
- `GET /api/v1/public/doctors/{doctor_id}`
- `GET /api/v1/public/doctors/{doctor_id}/slots?date=YYYY-MM-DD&service_id=...`

### Booking
- `POST /api/v1/appointments/public-book`
- `POST /api/v1/appointments/{id}/cancel`
- `POST /api/v1/appointments/{id}/reschedule`

### Patient Dashboard
- `GET /api/v1/patient/appointments/upcoming`
- `GET /api/v1/patient/appointments/history`
- `GET /api/v1/patient/profile`
- `PATCH /api/v1/patient/profile`

### Admin Dashboard / CRM
- `GET /api/v1/admin/metrics`
- `GET /api/v1/admin/appointments`
- `PATCH /api/v1/admin/appointments/{id}`
- `POST /api/v1/admin/appointments`
- `GET /api/v1/admin/patients`
- `GET /api/v1/admin/patients/{id}`
- `POST /api/v1/admin/patients/{id}/tags`
- `POST /api/v1/admin/patients/{id}/notes`

### Doctor Dashboard
- `GET /api/v1/doctor/appointments/today`
- `GET /api/v1/doctor/appointments/upcoming`
- `PATCH /api/v1/doctor/appointments/{id}/status`
- `POST /api/v1/doctor/appointments/{id}/notes`
- `GET /api/v1/doctor/schedule`

### Automation & AI
- `POST /api/v1/automation/run-reminders`
- `POST /api/v1/ai/summarize-booking`
- `POST /api/v1/ai/classify-request`
- `POST /api/v1/ai/generate-follow-up`
- `POST /api/v1/ai/format-note`

## 6. RBAC Matrix

- `admin`: full read/write on appointments, patients, CRM notes/tags, dashboard metrics
- `doctor`: read own appointments, update own appointment statuses, create visit notes, view own schedule
- `patient`: manage own profile, view/cancel/reschedule own appointments, set notification preferences
- `public`: read services/doctors and submit booking request

## 7. Scheduling Logic

- Doctor weekly availability windows define candidate slots.
- Slot generation respects selected service duration.
- Booking engine blocks overlapping intervals using time-range overlap checks.
- Canceled appointments no longer block future slots.
- Reschedule operation re-validates destination slot and records previous appointment linkage.

## 8. AI Integration Strategy

`AIService` abstraction with methods:
- `summarize_booking_issue(text)`
- `classify_request(text)`
- `generate_follow_up(visit_note)`
- `format_doctor_note(raw_note)`

Behavior:
- If `OPENAI_API_KEY` absent: deterministic fallback response + `fallback` log entry.
- If key exists: call OpenAI API and store request/response metadata in `ai_request_logs`.
- UI surfaces "AI unavailable" states rather than throwing errors.

## 9. Notification Strategy

`NotificationService` abstraction routes event messages to:
- Email provider adapter (SMTP/mock)
- Telegram provider adapter (bot API/mock)

Behavior:
- Missing provider config -> logs `skipped` with reason.
- Failures logged without breaking booking core flow.
- Reminder dispatcher checks appointment windows for 24h and 2h reminders.

## 10. Deployment Targets

- Local development via Docker Compose (`db`, `backend`, `frontend`)
- Production options:
  - Split deploy: Frontend on Vercel + Backend on Render/Railway/Fly + managed PostgreSQL
  - Single VPS Docker deployment with reverse proxy

## 11. Quality Gates

- Backend: unit tests for scheduling conflict logic
- Type-safe frontend forms with Zod + RHF
- Input validation at API boundaries
- Seed script with realistic roles/data
- End-to-end smoke verification in docs/progress log
