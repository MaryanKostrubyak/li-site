from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import AIRequestFeature, AIRequestStatus
from app.models.mixins import UUIDPrimaryKeyMixin


class AIRequestLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = 'ai_request_logs'

    patient_id: Mapped[Optional[str]] = mapped_column(ForeignKey('patient_profiles.id', ondelete='SET NULL'), nullable=True, index=True)
    appointment_id: Mapped[Optional[str]] = mapped_column(ForeignKey('appointments.id', ondelete='SET NULL'), nullable=True, index=True)
    feature: Mapped[AIRequestFeature] = mapped_column(Enum(AIRequestFeature, name='ai_request_feature'), nullable=False, index=True)
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    output_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[AIRequestStatus] = mapped_column(Enum(AIRequestStatus, name='ai_request_status'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
