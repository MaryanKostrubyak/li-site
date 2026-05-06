from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import NotificationChannel, NotificationDeliveryStatus, NotificationEventType
from app.models.mixins import UUIDPrimaryKeyMixin


class NotificationLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = 'notification_logs'

    appointment_id: Mapped[Optional[str]] = mapped_column(ForeignKey('appointments.id', ondelete='SET NULL'), nullable=True, index=True)
    patient_id: Mapped[Optional[str]] = mapped_column(ForeignKey('patient_profiles.id', ondelete='SET NULL'), nullable=True, index=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel, name='notification_channel'), nullable=False)
    event_type: Mapped[NotificationEventType] = mapped_column(
        Enum(NotificationEventType, name='notification_event_type'),
        nullable=False,
        index=True,
    )
    delivery_status: Mapped[NotificationDeliveryStatus] = mapped_column(
        Enum(NotificationDeliveryStatus, name='notification_delivery_status'),
        nullable=False,
    )
    provider_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    appointment = relationship('Appointment', back_populates='notification_logs')
