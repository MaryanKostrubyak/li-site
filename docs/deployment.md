# Deployment Guide

## 1. Docker Deployment (Single VPS)

### Prerequisites
- Docker Engine + Docker Compose plugin
- Domain + reverse proxy (Nginx/Caddy) for HTTPS in production

### Steps
1. Copy env examples and set production values:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env.local` (or docker env block)
2. Update key values:
   - `SECRET_KEY` to strong random secret
   - `DATABASE_URL` to production PostgreSQL connection
   - `CORS_ORIGINS` to your frontend domain
   - `NEXT_PUBLIC_API_URL` to public backend URL
3. Build and start:
   - `docker compose up -d --build`
4. Check health:
   - Backend: `GET /health`
   - Frontend: `http://<host>:3000`

### Notes
- Backend container command runs migrations + seed before app startup.
- For production, run seed once, then remove seed command from compose backend command.
- `NEXT_PUBLIC_API_URL` must be available at frontend build time. In Docker Compose this is passed through `build.args`; in other CI/CD setups export it before `npm run build`.

## 2. Split Deployment (Recommended SaaS Pattern)

### Frontend (Vercel)
- Deploy `frontend/`
- Set `NEXT_PUBLIC_API_URL` to backend HTTPS endpoint in the project environment before building

### Backend (Render/Railway/Fly.io)
- Deploy `backend/`
- Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Add managed PostgreSQL and set `DATABASE_URL`
- Configure CORS with frontend URL

### Database
- Use managed PostgreSQL
- Run migration on release phase
- Seed only for staging/demo environments

## 3. Environment Variables

### Backend critical vars
- `SECRET_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `FRONTEND_URL`
- `OPENAI_API_KEY` (optional)
- `SMTP_*` (optional)
- `TELEGRAM_BOT_TOKEN` (optional)

### Frontend critical vars
- `NEXT_PUBLIC_API_URL`

## 4. External Integrations

- If OpenAI key is missing, AI features return fallback results.
- If SMTP/Telegram configs are missing, notifications are logged with `skipped` status and core flows continue.

## 5. Production Hardening Checklist

- Replace demo credentials and disable seed job in production.
- Add rate limiting and stricter auth/session policies.
- Add HTTPS termination and secure headers.
- Add observability (logs, metrics, error tracking).
- Add backups/restore policy for PostgreSQL.
- Pin supported runtime versions in CI: Node.js `20.19+` or `22.13+`, Python `3.11+`.
