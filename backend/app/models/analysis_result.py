import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MoodType(str, enum.Enum):
    HAPPY = "happy"
    RELAXED = "relaxed"
    STRESSED = "stressed"
    SCARED = "scared"
    SICK = "sick"
    NEUTRAL = "neutral"


class VocalizationType(str, enum.Enum):
    SINGING = "singing"
    CHATTERING = "chattering"
    ALARM = "alarm"
    SILENCE = "silence"
    DISTRESS = "distress"
    CONTACT_CALL = "contact_call"
    BEAK_GRINDING = "beak_grinding"


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    recording_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parakeet_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("parakeets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    mood: Mapped[MoodType] = mapped_column(
        Enum(MoodType), nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    energy_level: Mapped[float] = mapped_column(Float, nullable=False)
    vocalization_type: Mapped[VocalizationType] = mapped_column(
        Enum(VocalizationType), nullable=False
    )
    details: Mapped[dict | None] = mapped_column(JSON)
    recommendations: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    recording: Mapped["Recording"] = relationship(  # noqa: F821
        back_populates="analysis_results"
    )
    parakeet: Mapped["Parakeet | None"] = relationship(  # noqa: F821
        back_populates="analysis_results"
    )
