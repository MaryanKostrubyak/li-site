from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
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


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}


app.include_router(api_router, prefix=settings.api_v1_prefix)
