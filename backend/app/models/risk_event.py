import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("environment_snapshots.id", ondelete="SET NULL"), nullable=True, index=True
    )
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="low")
    category: Mapped[str] = mapped_column(String(40), nullable=False, default="general")
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    details: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    snapshot: Mapped["EnvironmentSnapshot | None"] = relationship(  # noqa: F821
        back_populates="risk_events"
    )
