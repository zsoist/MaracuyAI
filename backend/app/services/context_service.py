from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.environment_snapshot import EnvironmentSnapshot
from app.models.habitat_profile import HabitatProfile
from app.models.risk_event import RiskEvent

logger = logging.getLogger(__name__)


def _to_utc_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _f_to_c(temp_f: float) -> float:
    return round((temp_f - 32.0) * (5.0 / 9.0), 2)


def _extract_noaa_wind_kph(wind_speed: str | None) -> float | None:
    if not wind_speed:
        return None
    token = wind_speed.split(" ")[0]
    try:
        mph = float(token)
    except ValueError:
        return None
    return round(mph * 1.60934, 2)


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


@dataclass
class ContextPayload:
    temperature_c: float | None = None
    relative_humidity_pct: float | None = None
    wind_speed_kph: float | None = None
    weather_code: str | None = None
    aqi_us: int | None = None
    pm25_ugm3: float | None = None
    daylight_state: str | None = None
    sunrise_at: datetime | None = None
    sunset_at: datetime | None = None
    source_weather: str | None = None
    source_aqi: str | None = None
    confidence: float = 0.4
    summary_json: dict[str, Any] | None = None


class ContextService:
    def __init__(self):
        self.timeout = settings.CONTEXT_HTTP_TIMEOUT_SECONDS

    async def upsert_habitat_profile(
        self,
        db: AsyncSession,
        *,
        owner_id,
        name: str,
        latitude: float | None,
        longitude: float | None,
        timezone_name: str,
        location_name: str | None,
        habitat_type: str,
        notes: str | None,
    ) -> HabitatProfile:
        existing = await self.get_habitat_profile(db, owner_id)
        if existing is None:
            existing = HabitatProfile(
                owner_id=owner_id,
                name=name,
                latitude=latitude,
                longitude=longitude,
                timezone_name=timezone_name,
                location_name=location_name,
                habitat_type=habitat_type,
                notes=notes,
            )
            db.add(existing)
            await db.flush()
            return existing

        existing.name = name
        existing.latitude = latitude
        existing.longitude = longitude
        existing.timezone_name = timezone_name
        existing.location_name = location_name
        existing.habitat_type = habitat_type
        existing.notes = notes
        await db.flush()
        return existing

    async def get_habitat_profile(self, db: AsyncSession, owner_id) -> HabitatProfile | None:
        result = await db.execute(
            select(HabitatProfile).where(HabitatProfile.owner_id == owner_id)
        )
        return result.scalar_one_or_none()

    async def get_latest_snapshot(
        self, db: AsyncSession, owner_id
    ) -> EnvironmentSnapshot | None:
        result = await db.execute(
            select(EnvironmentSnapshot)
            .where(EnvironmentSnapshot.owner_id == owner_id)
            .order_by(EnvironmentSnapshot.captured_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_snapshots(
        self, db: AsyncSession, owner_id, limit: int = 24
    ) -> list[EnvironmentSnapshot]:
        result = await db.execute(
            select(EnvironmentSnapshot)
            .where(EnvironmentSnapshot.owner_id == owner_id)
            .order_by(EnvironmentSnapshot.captured_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_risk_events(
        self, db: AsyncSession, owner_id, limit: int = 20
    ) -> list[RiskEvent]:
        result = await db.execute(
            select(RiskEvent)
            .where(RiskEvent.owner_id == owner_id)
            .order_by(RiskEvent.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def refresh_all_profiles(self, db: AsyncSession, max_profiles: int = 200) -> int:
        result = await db.execute(
            select(HabitatProfile)
            .where(HabitatProfile.latitude.is_not(None), HabitatProfile.longitude.is_not(None))
            .limit(max_profiles)
        )
        profiles = list(result.scalars().all())
        refreshed = 0
        for profile in profiles:
            if profile.latitude is None or profile.longitude is None:
                continue
            try:
                await self.refresh_snapshot(
                    db,
                    owner_id=profile.owner_id,
                    latitude=profile.latitude,
                    longitude=profile.longitude,
                    timezone_name=profile.timezone_name,
                    location_name=profile.location_name,
                    habitat_profile_id=profile.id,
                )
                refreshed += 1
            except Exception:
                logger.exception(
                    "Context refresh failed for habitat profile %s",
                    profile.id,
                )
        return refreshed

    async def refresh_snapshot(
        self,
        db: AsyncSession,
        *,
        owner_id,
        latitude: float,
        longitude: float,
        timezone_name: str,
        location_name: str | None,
        habitat_profile_id=None,
    ) -> EnvironmentSnapshot:
        payload = await self._fetch_context(latitude, longitude, timezone_name)
        snapshot = EnvironmentSnapshot(
            owner_id=owner_id,
            habitat_profile_id=habitat_profile_id,
            latitude=latitude,
            longitude=longitude,
            location_name=location_name,
            timezone_name=timezone_name,
            temperature_c=payload.temperature_c,
            relative_humidity_pct=payload.relative_humidity_pct,
            wind_speed_kph=payload.wind_speed_kph,
            weather_code=payload.weather_code,
            aqi_us=payload.aqi_us,
            pm25_ugm3=payload.pm25_ugm3,
            daylight_state=payload.daylight_state,
            sunrise_at=payload.sunrise_at,
            sunset_at=payload.sunset_at,
            source_weather=payload.source_weather,
            source_aqi=payload.source_aqi,
            confidence=payload.confidence,
            summary_json=payload.summary_json,
        )
        db.add(snapshot)
        await db.flush()
        await self._create_risk_events(db, owner_id=owner_id, snapshot=snapshot)
        return snapshot

    async def _fetch_context(
        self, latitude: float, longitude: float, timezone_name: str
    ) -> ContextPayload:
        weather = await self._fetch_noaa_weather(latitude, longitude)
        if weather is None:
            weather = await self._fetch_open_meteo_weather(latitude, longitude, timezone_name)

        aqi = await self._fetch_airnow_aqi(latitude, longitude)
        if aqi is None:
            aqi = await self._fetch_open_meteo_aqi(latitude, longitude, timezone_name)

        payload = ContextPayload(
            temperature_c=weather.get("temperature_c") if weather else None,
            relative_humidity_pct=weather.get("relative_humidity_pct") if weather else None,
            wind_speed_kph=weather.get("wind_speed_kph") if weather else None,
            weather_code=weather.get("weather_code") if weather else None,
            daylight_state=weather.get("daylight_state") if weather else None,
            sunrise_at=weather.get("sunrise_at") if weather else None,
            sunset_at=weather.get("sunset_at") if weather else None,
            source_weather=weather.get("source") if weather else None,
            aqi_us=aqi.get("aqi_us") if aqi else None,
            pm25_ugm3=aqi.get("pm25_ugm3") if aqi else None,
            source_aqi=aqi.get("source") if aqi else None,
            summary_json={
                "weather": weather or {},
                "aqi": aqi or {},
            },
        )
        payload.confidence = self._calculate_confidence(payload)
        return payload

    def _calculate_confidence(self, payload: ContextPayload) -> float:
        score = 0.35
        if payload.source_weather:
            score += 0.3
        if payload.temperature_c is not None:
            score += 0.1
        if payload.relative_humidity_pct is not None:
            score += 0.05
        if payload.source_aqi:
            score += 0.2
        return round(min(score, 0.98), 2)

    async def _create_risk_events(self, db: AsyncSession, *, owner_id, snapshot: EnvironmentSnapshot):
        new_events: list[RiskEvent] = []
        if snapshot.temperature_c is not None and snapshot.temperature_c >= 32:
            new_events.append(
                RiskEvent(
                    owner_id=owner_id,
                    snapshot_id=snapshot.id,
                    severity="high",
                    category="heat",
                    title="Heat stress risk",
                    details="Ambient temperature is high for parakeet comfort. Increase cooling and hydration checks.",
                )
            )
        if snapshot.temperature_c is not None and snapshot.temperature_c <= 10:
            new_events.append(
                RiskEvent(
                    owner_id=owner_id,
                    snapshot_id=snapshot.id,
                    severity="medium",
                    category="cold",
                    title="Cold stress risk",
                    details="Ambient temperature is low. Avoid drafts and keep the habitat warm.",
                )
            )
        if snapshot.aqi_us is not None and snapshot.aqi_us >= 101:
            new_events.append(
                RiskEvent(
                    owner_id=owner_id,
                    snapshot_id=snapshot.id,
                    severity="high",
                    category="air_quality",
                    title="Poor air quality detected",
                    details="AQI is unhealthy for sensitive birds. Reduce outdoor exposure and monitor breathing.",
                )
            )

        for event in new_events:
            db.add(event)

        if new_events:
            await db.flush()

    async def _fetch_noaa_weather(self, latitude: float, longitude: float) -> dict[str, Any] | None:
        points_url = f"https://api.weather.gov/points/{latitude},{longitude}"
        headers = {"User-Agent": "parakeet-wellness/0.1 (context-service)"}
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            try:
                points_resp = await client.get(points_url)
                points_resp.raise_for_status()
                points_data = points_resp.json()
                forecast_url = points_data["properties"]["forecast"]
                forecast_resp = await client.get(forecast_url)
                forecast_resp.raise_for_status()
                forecast_data = forecast_resp.json()
            except Exception:
                return None

        periods = forecast_data.get("properties", {}).get("periods", [])
        if not periods:
            return None
        first = periods[0]
        temp_f = first.get("temperature")
        temp_c = _f_to_c(float(temp_f)) if isinstance(temp_f, (int, float)) else None
        is_daytime = first.get("isDaytime")
        return {
            "source": "noaa",
            "temperature_c": temp_c,
            "relative_humidity_pct": None,
            "wind_speed_kph": _extract_noaa_wind_kph(first.get("windSpeed")),
            "weather_code": first.get("shortForecast"),
            "daylight_state": "day" if is_daytime else "night",
            "sunrise_at": None,
            "sunset_at": None,
        }

    async def _fetch_open_meteo_weather(
        self, latitude: float, longitude: float, timezone_name: str
    ) -> dict[str, Any] | None:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
            "daily": "sunrise,sunset",
            "timezone": timezone_name,
            "forecast_days": 1,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
            except Exception:
                return None

        current = data.get("current", {})
        daily = data.get("daily", {})
        sunrise_values = daily.get("sunrise") or []
        sunset_values = daily.get("sunset") or []
        return {
            "source": "open-meteo",
            "temperature_c": current.get("temperature_2m"),
            "relative_humidity_pct": current.get("relative_humidity_2m"),
            "wind_speed_kph": current.get("wind_speed_10m"),
            "weather_code": str(current.get("weather_code"))
            if current.get("weather_code") is not None
            else None,
            "daylight_state": "day" if current.get("is_day") == 1 else "night",
            "sunrise_at": _to_utc_datetime(sunrise_values[0]) if sunrise_values else None,
            "sunset_at": _to_utc_datetime(sunset_values[0]) if sunset_values else None,
        }

    async def _fetch_airnow_aqi(self, latitude: float, longitude: float) -> dict[str, Any] | None:
        if not settings.AIRNOW_API_KEY:
            return None

        url = "https://www.airnowapi.org/aq/observation/latLong/current/"
        params = {
            "format": "application/json",
            "latitude": latitude,
            "longitude": longitude,
            "distance": 50,
            "API_KEY": settings.AIRNOW_API_KEY,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                rows = resp.json()
            except Exception:
                return None

        if not isinstance(rows, list) or not rows:
            return None

        aqi_value = None
        pm25_value = None
        for row in rows:
            if row.get("ParameterName") == "PM2.5":
                concentration = _to_float(row.get("Concentration"))
                if concentration is None:
                    concentration = _to_float(row.get("RawConcentration"))
                pm25_value = concentration
            candidate_aqi = row.get("AQI")
            if aqi_value is None and isinstance(candidate_aqi, (int, float)):
                aqi_value = int(candidate_aqi)

        return {
            "source": "airnow",
            "aqi_us": aqi_value,
            "pm25_ugm3": pm25_value,
        }

    async def _fetch_open_meteo_aqi(
        self, latitude: float, longitude: float, timezone_name: str
    ) -> dict[str, Any] | None:
        url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "us_aqi,pm2_5",
            "timezone": timezone_name,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
            except Exception:
                return None

        current = data.get("current", {})
        return {
            "source": "open-meteo",
            "aqi_us": current.get("us_aqi"),
            "pm25_ugm3": current.get("pm2_5"),
        }
