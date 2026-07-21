from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.tasks.reminder_dispatcher import run_due_reminders

settings = get_settings()

scheduler: AsyncIOScheduler | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global scheduler
    if settings.reminders_scheduler_enabled:
        scheduler = AsyncIOScheduler(timezone=settings.app_timezone)

        def scheduled_job() -> None:
            db = SessionLocal()
            try:
                run_due_reminders(db)
            finally:
                db.close()

        scheduler.add_job(scheduled_job, 'interval', minutes=30, id='reminder_dispatcher')
        scheduler.start()

    yield

    if scheduler:
        scheduler.shutdown()


app = FastAPI(title=settings.project_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and 'code' in exc.detail:
        payload = exc.detail
    else:
        payload = {'code': 'request_failed', 'message': str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=payload, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    field_errors: dict[str, list[str]] = {}
    for error in exc.errors():
        field = '.'.join(str(part) for part in error['loc'] if part not in {'body', 'query', 'path'}) or 'request'
        field_errors.setdefault(field, []).append(error['msg'])
    return JSONResponse(
        status_code=422,
        content={'code': 'validation_error', 'message': 'Check the highlighted fields.', 'field_errors': field_errors},
    )


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}


app.include_router(api_router, prefix=settings.api_v1_prefix)
