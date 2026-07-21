# Product notes

## The goal

Make appointment scheduling, role boundaries, and follow-up work easy to understand from the first screen. The product keeps the public journey focused while giving each care role a clear workspace.

## What changed

The public flow follows a familiar path: understand the clinic, choose a service, select an available time, identify the patient, and confirm the visit. Staff experiences are separated into role-specific areas rather than one dashboard with hidden controls.

## Experience decisions

- A warm medical-minimalist system uses Lora, Manrope, warm ivory, deep green, sage, and restrained clay without gradients or decorative dashboard shadows.
- The public journey is reduced to value, services, doctors, booking guidance, and contact information.
- Booking is a guarded four-step flow with compatible doctors, real slots in Pacific Time, authentication, review, consent, and a short reference code.
- Each role receives task-oriented routes instead of a single dashboard full of anchor-linked sections.
- Shared feedback patterns cover loading, empty, error, conflict, success, focus, keyboard, and screen-reader states.

## Engineering decisions

- Same-origin HttpOnly cookie sessions replace browser-stored JWTs. Mutations require an Origin check and a double-submit CSRF token.
- Clinic availability is interpreted in `America/Los_Angeles`, converted to UTC for storage, and displayed explicitly in PT with DST-aware calculations.
- Doctor-to-service compatibility is modeled as a many-to-many relationship and enforced by both availability and booking APIs.
- Appointment state changes follow role-specific transition rules. Cancel and reschedule preserve medical history and keep cancellation reasons separate from visit notes.
- Quick access is environment-gated, seed data is idempotent and relative to the clinic date, and sample identities use the `@aetherclinic.test` domain.
- API errors and role-specific appointment responses use typed, predictable contracts.

## Validation

The implementation is checked with backend integration tests, frontend unit and coverage tests, ESLint, a production Next.js build, Playwright role journeys, axe accessibility scans, responsive review at 1440 px, 1024 px, and 390 px, and a dependency audit gate that rejects moderate-or-higher findings.
