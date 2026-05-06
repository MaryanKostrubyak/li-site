from datetime import time

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AvailabilitySchedule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'availability_schedules'

    doctor_id: Mapped[str] = mapped_column(ForeignKey('doctor_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    weekday: Mapped[int] = mapped_column(nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(nullable=False)
    end_time: Mapped[time] = mapped_column(nullable=False)
    slot_interval_minutes: Mapped[int] = mapped_column(nullable=False, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    doctor = relationship('DoctorProfile', back_populates='availabilities')
