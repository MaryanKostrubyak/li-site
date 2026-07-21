# Architecture

## Request boundary

The browser talks only to the Next.js origin. Next rewrites `/api/v1/*` and `/health` to FastAPI, which keeps cookies same-origin and avoids exposing a browser-side backend URL.

Authentication uses a signed JWT in the HttpOnly `clinic_session` cookie. Mutations require the readable `clinic_csrf` cookie to match `X-CSRF-Token`; FastAPI also validates Origin against the frontend URL/CORS allow-list. RBAC is enforced in backend dependencies, not only in navigation.

## Scheduling

`AvailabilitySchedule` rows are interpreted as clinic-local recurring windows in `America/Los_Angeles`. Zone-aware conversion handles PST/PDT boundaries; appointments are stored in UTC. Slot validation checks past time, doctor/service compatibility, service duration, the complete availability window, and overlap with non-canceled appointments.

Rescheduling creates a new appointment linked by `rescheduled_from_appointment_id`. The previous record becomes canceled with a separate `cancellation_reason`, preserving the clinical reason and history.

## Domain model

- `doctor_services`: many-to-many capability mapping
- `doctor_profiles.slug`: stable public profile URL
- `appointments.reference_code`: short confirmation identifier
- `appointments.cancellation_reason`: operational context separate from visit reason
- role-specific appointment DTOs provide nested doctor, service, and patient summaries where appropriate

Status transitions are explicit by role. Terminal statuses are immutable. Patient CRM follow-up can only be changed through the admin endpoint.

## Sample data

The seed is idempotent, uses `@aetherclinic.test`, and recalculates past/future appointments relative to the current clinic date. `DEMO_MODE` gates Quick access; the endpoint returns 404 when disabled.

## Writing assistance and providers

Booking analysis stays in the backend. Doctor note assistance is labelled “Improve wording,” returns a preview, and persists only on a separate save. Missing email and text providers use deterministic or skipped local states without blocking booking.
