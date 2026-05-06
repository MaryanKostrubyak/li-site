from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PatientInternalNote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'patient_internal_notes'

    patient_id: Mapped[str] = mapped_column(ForeignKey('patient_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    admin_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    note: Mapped[str] = mapped_column(Text, nullable=False)

    patient = relationship('PatientProfile', back_populates='internal_notes')
