from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AppointmentStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Appointment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'appointments'

    patient_id: Mapped[str] = mapped_column(ForeignKey('patient_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey('doctor_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    service_id: Mapped[str] = mapped_column(ForeignKey('services.id', ondelete='RESTRICT'), nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name='appointment_status'),
        nullable=False,
        default=AppointmentStatus.new,
        index=True,
    )
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    source_channel: Mapped[str] = mapped_column(String(100), nullable=False, default='website')
    issue_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    issue_classification: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rescheduled_from_appointment_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey('appointments.id', ondelete='SET NULL'),
        nullable=True,
    )

    patient = relationship('PatientProfile', back_populates='appointments')
    doctor = relationship('DoctorProfile', back_populates='appointments')
    service = relationship('Service', back_populates='appointments')
    notes = relationship('AppointmentNote', back_populates='appointment', cascade='all, delete-orphan')
    previous_appointment = relationship('Appointment', remote_side='Appointment.id')
    notification_logs = relationship('NotificationLog', back_populates='appointment')
