from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AppointmentNote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'appointment_notes'

    appointment_id: Mapped[str] = mapped_column(ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey('doctor_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    raw_note: Mapped[str] = mapped_column(Text, nullable=False)
    formatted_note: Mapped[str] = mapped_column(Text, nullable=False)

    appointment = relationship('Appointment', back_populates='notes')
    doctor = relationship('DoctorProfile', back_populates='notes')
