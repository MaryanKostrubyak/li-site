from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class DoctorProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'doctor_profiles'

    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    specialty: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    years_experience: Mapped[int] = mapped_column(nullable=False, default=3)
    consultation_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_accepting_new_patients: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user = relationship('User', back_populates='doctor_profile')
    availabilities = relationship('AvailabilitySchedule', back_populates='doctor', cascade='all, delete-orphan')
    appointments = relationship('Appointment', back_populates='doctor', cascade='all, delete-orphan')
    notes = relationship('AppointmentNote', back_populates='doctor')
