# Deployment notes

## Local and hosted environments

Docker Compose starts the complete local stack. The frontend is exposed on port 3000 and the API on port 8000. GitHub Pages serves the static project showcase only; it does not run the FastAPI service.

## Required production settings

- Strong, rotated `SECRET_KEY`
- Managed PostgreSQL with encrypted backups
- `ENVIRONMENT=production` (forces `Secure` session/CSRF cookies)
- `DEMO_MODE=false`
- `CLINIC_TIMEZONE=America/Los_Angeles`
- Exact HTTPS `FRONTEND_URL` and `CORS_ORIGINS`
- Private `BACKEND_INTERNAL_URL` available to the Next.js server
- Provider secrets in a secret manager, never repository files

The frontend must proxy `/api/v1` to FastAPI so the browser remains on one origin. If the services are split across public origins, redesign and threat-model the cookie/CSRF boundary rather than weakening Origin checks.

## Release sequence

1. Run backend tests and apply Alembic migrations.
2. Run frontend unit coverage, ESLint, production build, Playwright/axe, and dependency audit.
3. Back up the database and verify rollback paths.
4. Deploy the backend, then the frontend proxy configuration.
5. Verify `/health`, login/logout, CSRF rejection, booking conflict recovery, PT display, and RBAC denial paths.

Keep secrets and real personal data out of the repository.
