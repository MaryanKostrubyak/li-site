from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import FollowUpStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PatientProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'patient_profiles'

    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    lead_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    follow_up_status: Mapped[FollowUpStatus] = mapped_column(
        Enum(FollowUpStatus, name='follow_up_status'),
        nullable=False,
        default=FollowUpStatus.none,
    )
    notification_email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notification_telegram_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    user = relationship('User', back_populates='patient_profile')
    appointments = relationship('Appointment', back_populates='patient', cascade='all, delete-orphan')
    tags = relationship('PatientTag', back_populates='patient', cascade='all, delete-orphan')
    internal_notes = relationship('PatientInternalNote', back_populates='patient', cascade='all, delete-orphan')
