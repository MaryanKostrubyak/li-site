from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PatientTag(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'patient_tags'

    patient_id: Mapped[str] = mapped_column(ForeignKey('patient_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    tag: Mapped[str] = mapped_column(String(100), nullable=False)

    patient = relationship('PatientProfile', back_populates='tags')
