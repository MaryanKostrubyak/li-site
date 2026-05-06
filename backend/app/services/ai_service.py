from __future__ import annotations

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.ai_request_log import AIRequestLog
from app.models.enums import AIRequestFeature, AIRequestStatus

settings = get_settings()


class AIService:
    def __init__(self) -> None:
        self._enabled = bool(settings.openai_api_key)
        self._client = OpenAI(api_key=settings.openai_api_key) if self._enabled else None

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _log(
        self,
        db: Session,
        feature: AIRequestFeature,
        input_text: str,
        output_text: str | None,
        status: AIRequestStatus,
        patient_id: str | None = None,
        appointment_id: str | None = None,
    ) -> None:
        db.add(
            AIRequestLog(
                patient_id=patient_id,
                appointment_id=appointment_id,
                feature=feature,
                input_text=input_text,
                output_text=output_text,
                status=status,
            )
        )
        db.commit()

    def _fallback(self, feature: AIRequestFeature, text: str) -> str:
        if feature == AIRequestFeature.booking_summary:
            return f'Booking summary: {text[:180]}'.strip()
        if feature == AIRequestFeature.request_classification:
            lowered = text.lower()
            if any(word in lowered for word in ['pain', 'urgent', 'bleeding', 'severe']):
                return 'urgent'
            if any(word in lowered for word in ['follow-up', 'follow up', 'post-op', 'checkup']):
                return 'follow-up'
            if any(word in lowered for word in ['consult', 'question', 'advice']):
                return 'consultation'
            return 'routine'
        if feature == AIRequestFeature.follow_up_message:
            return 'Thank you for visiting our clinic today. Please follow your treatment plan and contact us if symptoms change.'
        if feature == AIRequestFeature.format_note:
            return f'Structured note:\n- Key findings: {text[:120]}\n- Plan: Follow prescribed treatment and schedule follow-up if needed.'
        return text

    def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        assert self._client is not None
        response = self._client.responses.create(
            model=settings.openai_model,
            input=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            temperature=0.2,
        )
        return response.output_text.strip()

    def run(
        self,
        db: Session,
        feature: AIRequestFeature,
        text: str,
        patient_id: str | None = None,
        appointment_id: str | None = None,
    ) -> tuple[str, str]:
        if not self.enabled:
            fallback = self._fallback(feature, text)
            self._log(
                db,
                feature=feature,
                input_text=text,
                output_text=fallback,
                status=AIRequestStatus.fallback,
                patient_id=patient_id,
                appointment_id=appointment_id,
            )
            return fallback, 'fallback'

        prompt_map = {
            AIRequestFeature.booking_summary: 'Summarize the booking request into one concise clinical intake summary.',
            AIRequestFeature.request_classification: 'Classify this medical request as one of: routine, urgent, follow-up, consultation.',
            AIRequestFeature.follow_up_message: 'Write a short, professional follow-up message for the patient after the visit.',
            AIRequestFeature.format_note: 'Convert this raw doctor note into concise structured bullet points.',
        }

        try:
            output = self._call_openai(prompt_map[feature], text)
            self._log(
                db,
                feature=feature,
                input_text=text,
                output_text=output,
                status=AIRequestStatus.success,
                patient_id=patient_id,
                appointment_id=appointment_id,
            )
            return output, 'openai'
        except Exception as exc:  # pragma: no cover - external API variability
            fallback = self._fallback(feature, text)
            self._log(
                db,
                feature=feature,
                input_text=text,
                output_text=f'{fallback} [OpenAI error: {exc}]',
                status=AIRequestStatus.failed,
                patient_id=patient_id,
                appointment_id=appointment_id,
            )
            return fallback, 'fallback'


ai_service = AIService()
