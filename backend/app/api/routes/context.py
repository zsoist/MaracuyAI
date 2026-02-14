from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_auth_context
from app.core.config import settings
from app.core.database import get_db
from app.models.environment_snapshot import EnvironmentSnapshot
from app.models.habitat_profile import HabitatProfile
from app.models.risk_event import RiskEvent
from app.services.context_service import ContextService

router = APIRouter(prefix="/context", tags=["context"])
context_service = ContextService()


def _require_context_flag() -> None:
    if not settings.FEATURE_CONTEXT_ENGINE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context engine is disabled by feature flag.",
        )


class HabitatProfileUpsertRequest(BaseModel):
    name: str = Field(default="Home habitat", min_length=1, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_name: str | None = Field(default=None, max_length=160)
    timezone_name: str = Field(default="UTC", min_length=1, max_length=64)
    habitat_type: str = Field(default="urban", min_length=1, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)


class HabitatProfileResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    latitude: float | None
    longitude: float | None
    location_name: str | None
    timezone_name: str
    habitat_type: str
    notes: str | None
    created_at: str
    updated_at: str


class ContextRefreshRequest(BaseModel):
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_name: str | None = Field(default=None, max_length=160)
    timezone_name: str | None = Field(default=None, min_length=1, max_length=64)


class ContextSnapshotResponse(BaseModel):
    id: str
    owner_id: str
    habitat_profile_id: str | None
    latitude: float
    longitude: float
    location_name: str | None
    timezone_name: str
    temperature_c: float | None
    relative_humidity_pct: float | None
    wind_speed_kph: float | None
    weather_code: str | None
    aqi_us: int | None
    pm25_ugm3: float | None
    daylight_state: str | None
    sunrise_at: str | None
    sunset_at: str | None
    source_weather: str | None
    source_aqi: str | None
    confidence: float
    summary_json: dict | None
    captured_at: str


class RiskEventResponse(BaseModel):
    id: str
    owner_id: str
    snapshot_id: str | None
    severity: str
    category: str
    title: str
    details: str | None
    created_at: str
    resolved_at: str | None


@router.get("/habitat", response_model=HabitatProfileResponse | None)
async def get_habitat_profile(
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    _require_context_flag()
    profile = await context_service.get_habitat_profile(db, auth_context.owner_id)
    if profile is None:
        return None
    return _to_habitat_profile_response(profile)


@router.put("/habitat", response_model=HabitatProfileResponse)
async def upsert_habitat_profile(
    body: HabitatProfileUpsertRequest,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    _require_context_flag()
    profile = await context_service.upsert_habitat_profile(
        db,
        owner_id=auth_context.owner_id,
        name=body.name,
        latitude=body.latitude,
        longitude=body.longitude,
        timezone_name=body.timezone_name,
        location_name=body.location_name,
        habitat_type=body.habitat_type,
        notes=body.notes,
    )
    return _to_habitat_profile_response(profile)


@router.post("/refresh", response_model=ContextSnapshotResponse)
async def refresh_context(
    body: ContextRefreshRequest,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    _require_context_flag()
    profile = await context_service.get_habitat_profile(db, auth_context.owner_id)

    latitude = body.latitude if body.latitude is not None else (profile.latitude if profile else None)
    longitude = (
        body.longitude if body.longitude is not None else (profile.longitude if profile else None)
    )
    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude/longitude required. Set habitat profile or send in request.",
        )

    timezone_name = body.timezone_name or (profile.timezone_name if profile else "UTC")
    location_name = body.location_name if body.location_name is not None else (
        profile.location_name if profile else None
    )

    snapshot = await context_service.refresh_snapshot(
        db,
        owner_id=auth_context.owner_id,
        latitude=latitude,
        longitude=longitude,
        timezone_name=timezone_name,
        location_name=location_name,
        habitat_profile_id=profile.id if profile else None,
    )
    return _to_snapshot_response(snapshot)


@router.get("/current", response_model=ContextSnapshotResponse | None)
async def get_current_context(
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    _require_context_flag()
    snapshot = await context_service.get_latest_snapshot(db, auth_context.owner_id)
    if snapshot is None:
        return None
    return _to_snapshot_response(snapshot)


@router.get("/history", response_model=list[ContextSnapshotResponse])
async def get_context_history(
    limit: int = Query(default=24, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    _require_context_flag()
    rows = await context_service.list_snapshots(db, auth_context.owner_id, limit=limit)
    return [_to_snapshot_response(row) for row in rows]


@router.get("/risk-events", response_model=list[RiskEventResponse])
async def get_risk_events(
    limit: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    _require_context_flag()
    rows = await context_service.list_risk_events(db, auth_context.owner_id, limit=limit)
    return [_to_risk_event_response(row) for row in rows]


def _iso_or_none(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _to_habitat_profile_response(profile: HabitatProfile) -> HabitatProfileResponse:
    return HabitatProfileResponse(
        id=str(profile.id),
        owner_id=str(profile.owner_id),
        name=profile.name,
        latitude=profile.latitude,
        longitude=profile.longitude,
        location_name=profile.location_name,
        timezone_name=profile.timezone_name,
        habitat_type=profile.habitat_type,
        notes=profile.notes,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat(),
    )


def _to_snapshot_response(snapshot: EnvironmentSnapshot) -> ContextSnapshotResponse:
    return ContextSnapshotResponse(
        id=str(snapshot.id),
        owner_id=str(snapshot.owner_id),
        habitat_profile_id=str(snapshot.habitat_profile_id)
        if snapshot.habitat_profile_id
        else None,
        latitude=snapshot.latitude,
        longitude=snapshot.longitude,
        location_name=snapshot.location_name,
        timezone_name=snapshot.timezone_name,
        temperature_c=snapshot.temperature_c,
        relative_humidity_pct=snapshot.relative_humidity_pct,
        wind_speed_kph=snapshot.wind_speed_kph,
        weather_code=snapshot.weather_code,
        aqi_us=snapshot.aqi_us,
        pm25_ugm3=snapshot.pm25_ugm3,
        daylight_state=snapshot.daylight_state,
        sunrise_at=_iso_or_none(snapshot.sunrise_at),
        sunset_at=_iso_or_none(snapshot.sunset_at),
        source_weather=snapshot.source_weather,
        source_aqi=snapshot.source_aqi,
        confidence=snapshot.confidence,
        summary_json=snapshot.summary_json,
        captured_at=snapshot.captured_at.isoformat(),
    )


def _to_risk_event_response(event: RiskEvent) -> RiskEventResponse:
    return RiskEventResponse(
        id=str(event.id),
        owner_id=str(event.owner_id),
        snapshot_id=str(event.snapshot_id) if event.snapshot_id else None,
        severity=event.severity,
        category=event.category,
        title=event.title,
        details=event.details,
        created_at=event.created_at.isoformat(),
        resolved_at=_iso_or_none(event.resolved_at),
    )
