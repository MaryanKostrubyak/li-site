from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.appointment import Appointment
from app.models.enums import (
    NotificationChannel,
    NotificationDeliveryStatus,
    NotificationEventType,
)
from app.models.notification_log import NotificationLog
from app.models.patient_profile import PatientProfile

settings = get_settings()


class EmailProvider:
    def send(self, to_email: str, subject: str, message: str) -> tuple[NotificationDeliveryStatus, str]:
        if not settings.smtp_host or not settings.smtp_from_email:
            return NotificationDeliveryStatus.skipped, 'SMTP config missing'
        return NotificationDeliveryStatus.sent, f'Mock email sent to {to_email}: {subject}'


class TelegramProvider:
    def send(self, chat_id: str, message: str) -> tuple[NotificationDeliveryStatus, str]:
        if not settings.telegram_bot_token:
            return NotificationDeliveryStatus.skipped, 'Telegram bot token missing'
        return NotificationDeliveryStatus.sent, f'Mock telegram sent to chat {chat_id}'


class NotificationService:
    def __init__(self) -> None:
        self.email_provider = EmailProvider()
        self.telegram_provider = TelegramProvider()

    def _log(
        self,
        db: Session,
        channel: NotificationChannel,
        event_type: NotificationEventType,
        status: NotificationDeliveryStatus,
        response: str,
        appointment_id: Optional[str] = None,
        patient_id: Optional[str] = None,
    ) -> None:
        db.add(
            NotificationLog(
                appointment_id=appointment_id,
                patient_id=patient_id,
                channel=channel,
                event_type=event_type,
                delivery_status=status,
                provider_response=response,
            )
        )
        db.commit()

    def send_for_appointment(
        self,
        db: Session,
        appointment: Appointment,
        event_type: NotificationEventType,
        custom_message: str | None = None,
    ) -> None:
        patient: PatientProfile = appointment.patient
        user = patient.user

        message = custom_message or f'Appointment update: {event_type.value} at {appointment.start_at.isoformat()}'
        subject = f'Clinic notification: {event_type.value}'

        if patient.notification_email_enabled and user.email:
            status, response = self.email_provider.send(user.email, subject, message)
            self._log(
                db,
                channel=NotificationChannel.email,
                event_type=event_type,
                status=status,
                response=response,
                appointment_id=appointment.id,
                patient_id=patient.id,
            )
        else:
            self._log(
                db,
                channel=NotificationChannel.email,
                event_type=event_type,
                status=NotificationDeliveryStatus.skipped,
                response='Email notifications disabled for patient',
                appointment_id=appointment.id,
                patient_id=patient.id,
            )

        if patient.notification_telegram_enabled and patient.telegram_chat_id:
            status, response = self.telegram_provider.send(patient.telegram_chat_id, message)
            self._log(
                db,
                channel=NotificationChannel.telegram,
                event_type=event_type,
                status=status,
                response=response,
                appointment_id=appointment.id,
                patient_id=patient.id,
            )
        else:
            self._log(
                db,
                channel=NotificationChannel.telegram,
                event_type=event_type,
                status=NotificationDeliveryStatus.skipped,
                response='Telegram notifications disabled or chat_id missing',
                appointment_id=appointment.id,
                patient_id=patient.id,
            )


notification_service = NotificationService()
