from fastapi import APIRouter

from app.api.v1.endpoints import admin, ai, appointments, auth, automation, doctor, patient, public

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(public.router)
api_router.include_router(appointments.router)
api_router.include_router(patient.router)
api_router.include_router(admin.router)
api_router.include_router(doctor.router)
api_router.include_router(automation.router)
api_router.include_router(ai.router)
