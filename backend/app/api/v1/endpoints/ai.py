from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.enums import AIRequestFeature
from app.schemas.ai import AIClassificationResponse, AIFollowUpRequest, AITextRequest, AITextResponse
from app.services.ai_service import ai_service

from app.core.deps import verify_csrf

router = APIRouter(prefix='/ai', tags=['ai'], dependencies=[Depends(verify_csrf)])


@router.post('/summarize-booking', response_model=AITextResponse)
def summarize_booking(payload: AITextRequest, db: Annotated[Session, Depends(get_db)]) -> AITextResponse:
    output, source = ai_service.run(db, AIRequestFeature.booking_summary, payload.text)
    return AITextResponse(output=output, source=source)


@router.post('/classify-request', response_model=AIClassificationResponse)
def classify_request(payload: AITextRequest, db: Annotated[Session, Depends(get_db)]) -> AIClassificationResponse:
    output, source = ai_service.run(db, AIRequestFeature.request_classification, payload.text)
    return AIClassificationResponse(classification=output, source=source)


@router.post('/generate-follow-up', response_model=AITextResponse)
def generate_follow_up(payload: AIFollowUpRequest, db: Annotated[Session, Depends(get_db)]) -> AITextResponse:
    output, source = ai_service.run(db, AIRequestFeature.follow_up_message, payload.visit_note)
    return AITextResponse(output=output, source=source)


@router.post('/format-note', response_model=AITextResponse)
def format_note(payload: AITextRequest, db: Annotated[Session, Depends(get_db)]) -> AITextResponse:
    output, source = ai_service.run(db, AIRequestFeature.format_note, payload.text)
    return AITextResponse(output=output, source=source)
