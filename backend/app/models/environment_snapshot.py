import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EnvironmentSnapshot(Base):
    __tablename__ = "environment_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    habitat_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("habitat_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_name: Mapped[str | None] = mapped_column(String(160))
    timezone_name: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")

    temperature_c: Mapped[float | None] = mapped_column(Float)
    relative_humidity_pct: Mapped[float | None] = mapped_column(Float)
    wind_speed_kph: Mapped[float | None] = mapped_column(Float)
    weather_code: Mapped[str | None] = mapped_column(String(40))

    aqi_us: Mapped[int | None] = mapped_column(Integer)
    pm25_ugm3: Mapped[float | None] = mapped_column(Float)

    daylight_state: Mapped[str | None] = mapped_column(String(20))
    sunrise_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sunset_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    source_weather: Mapped[str | None] = mapped_column(String(40))
    source_aqi: Mapped[str | None] = mapped_column(String(40))
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.6)
    summary_json: Mapped[dict | None] = mapped_column(JSON)

    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    habitat_profile: Mapped["HabitatProfile | None"] = relationship(  # noqa: F821
        back_populates="snapshots"
    )
    risk_events: Mapped[list["RiskEvent"]] = relationship(  # noqa: F821
        back_populates="snapshot"
    )
