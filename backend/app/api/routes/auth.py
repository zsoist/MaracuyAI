from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import update, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import GUEST_EMAIL_DOMAIN, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.analysis_result import AnalysisResult
from app.models.environment_snapshot import EnvironmentSnapshot
from app.models.habitat_profile import HabitatProfile
from app.models.parakeet import Parakeet
from app.models.recording import Recording
from app.models.risk_event import RiskEvent
from app.models.user import User
from app.services.storage_service import StorageService

router = APIRouter(prefix="/auth", tags=["auth"])
storage = StorageService()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    created_at: str

    model_config = {"from_attributes": True}


class MergeGuestResponse(BaseModel):
    merged: bool
    guest_id: str | None
    moved_parakeets: int = 0
    moved_recordings: int = 0
    moved_snapshots: int = 0
    moved_risk_events: int = 0


class DataExportResponse(BaseModel):
    user: UserResponse
    parakeets: list[dict] = Field(default_factory=list)
    recordings: list[dict] = Field(default_factory=list)
    analyses: list[dict] = Field(default_factory=list)
    habitat_profile: dict | None = None
    context_snapshots: list[dict] = Field(default_factory=list)
    risk_events: list[dict] = Field(default_factory=list)
    exported_at: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.flush()

    token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        display_name=current_user.display_name,
        created_at=current_user.created_at.isoformat(),
    )


@router.post("/merge-guest", response_model=MergeGuestResponse)
async def merge_guest_data(
    current_user: User = Depends(get_current_user),
    guest_id: str | None = Header(default=None, alias="X-Guest-Id"),
    guest_secret: str | None = Header(default=None, alias="X-Guest-Secret"),
    db: AsyncSession = Depends(get_db),
):
    if guest_id is None:
        return MergeGuestResponse(merged=False, guest_id=None)
    if guest_secret is None or len(guest_secret.strip()) < settings.GUEST_SECRET_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing or invalid X-Guest-Secret.",
        )

    try:
        guest_uuid = uuid.UUID(guest_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Guest-Id format.",
        ) from exc

    guest_email = f"guest+{guest_uuid}@{GUEST_EMAIL_DOMAIN}"
    guest_user_result = await db.execute(select(User).where(User.email == guest_email))
    guest_user = guest_user_result.scalar_one_or_none()

    if guest_user is None or guest_user.id == current_user.id:
        return MergeGuestResponse(merged=False, guest_id=str(guest_uuid))
    if not verify_password(guest_secret.strip(), guest_user.password_hash):
        if settings.DEBUG:
            # Local dev fallback for guest records created before secret-binding.
            guest_user.password_hash = hash_password(guest_secret.strip())
            await db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest identity proof failed.",
            )

    moved_parakeets = (
        await db.execute(
            update(Parakeet)
            .where(Parakeet.user_id == guest_user.id)
            .values(user_id=current_user.id)
        )
    ).rowcount or 0

    moved_recordings = (
        await db.execute(
            update(Recording)
            .where(Recording.user_id == guest_user.id)
            .values(user_id=current_user.id)
        )
    ).rowcount or 0

    account_profile_result = await db.execute(
        select(HabitatProfile).where(HabitatProfile.owner_id == current_user.id)
    )
    account_profile = account_profile_result.scalar_one_or_none()

    guest_profile_result = await db.execute(
        select(HabitatProfile).where(HabitatProfile.owner_id == guest_user.id)
    )
    guest_profile = guest_profile_result.scalar_one_or_none()

    if guest_profile is not None and account_profile is not None:
        await db.execute(
            update(EnvironmentSnapshot)
            .where(EnvironmentSnapshot.habitat_profile_id == guest_profile.id)
            .values(habitat_profile_id=account_profile.id, owner_id=current_user.id)
        )
        await db.delete(guest_profile)
    elif guest_profile is not None:
        guest_profile.owner_id = current_user.id

    moved_snapshots = (
        await db.execute(
            update(EnvironmentSnapshot)
            .where(EnvironmentSnapshot.owner_id == guest_user.id)
            .values(owner_id=current_user.id)
        )
    ).rowcount or 0

    moved_risk_events = (
        await db.execute(
            update(RiskEvent)
            .where(RiskEvent.owner_id == guest_user.id)
            .values(owner_id=current_user.id)
        )
    ).rowcount or 0

    await db.delete(guest_user)
    await db.flush()

    return MergeGuestResponse(
        merged=True,
        guest_id=str(guest_uuid),
        moved_parakeets=moved_parakeets,
        moved_recordings=moved_recordings,
        moved_snapshots=moved_snapshots,
        moved_risk_events=moved_risk_events,
    )


@router.get("/export-data", response_model=DataExportResponse)
async def export_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parakeets = list(
        (
            await db.execute(
                select(Parakeet).where(Parakeet.user_id == current_user.id).order_by(Parakeet.created_at.desc())
            )
        ).scalars()
    )

    recordings = list(
        (
            await db.execute(
                select(Recording).where(Recording.user_id == current_user.id).order_by(Recording.created_at.desc())
            )
        ).scalars()
    )

    analyses = list(
        (
            await db.execute(
                select(AnalysisResult)
                .join(Recording)
                .where(Recording.user_id == current_user.id)
                .order_by(AnalysisResult.created_at.desc())
            )
        ).scalars()
    )

    habitat_profile = (
        await db.execute(select(HabitatProfile).where(HabitatProfile.owner_id == current_user.id))
    ).scalar_one_or_none()

    snapshots = list(
        (
            await db.execute(
                select(EnvironmentSnapshot)
                .where(EnvironmentSnapshot.owner_id == current_user.id)
                .order_by(EnvironmentSnapshot.captured_at.desc())
            )
        ).scalars()
    )

    risk_events = list(
        (
            await db.execute(
                select(RiskEvent)
                .where(RiskEvent.owner_id == current_user.id)
                .order_by(RiskEvent.created_at.desc())
            )
        ).scalars()
    )

    return DataExportResponse(
        user=UserResponse(
            id=str(current_user.id),
            email=current_user.email,
            display_name=current_user.display_name,
            created_at=current_user.created_at.isoformat(),
        ),
        parakeets=[
            {
                "id": str(p.id),
                "name": p.name,
                "color_description": p.color_description,
                "birth_date": p.birth_date.isoformat() if p.birth_date else None,
                "photo_url": p.photo_url,
                "notes": p.notes,
                "created_at": p.created_at.isoformat(),
            }
            for p in parakeets
        ],
        recordings=[
            {
                "id": str(r.id),
                "original_filename": r.original_filename,
                "duration_seconds": r.duration_seconds,
                "sample_rate": r.sample_rate,
                "recorded_at": r.recorded_at.isoformat(),
                "created_at": r.created_at.isoformat(),
                "media_url": storage.to_public_media_url(r.file_url),
            }
            for r in recordings
        ],
        analyses=[
            {
                "id": str(a.id),
                "recording_id": str(a.recording_id),
                "parakeet_id": str(a.parakeet_id) if a.parakeet_id else None,
                "mood": a.mood.value,
                "confidence": a.confidence,
                "energy_level": a.energy_level,
                "vocalization_type": a.vocalization_type.value,
                "recommendations": a.recommendations,
                "created_at": a.created_at.isoformat(),
            }
            for a in analyses
        ],
        habitat_profile=(
            {
                "id": str(habitat_profile.id),
                "name": habitat_profile.name,
                "latitude": habitat_profile.latitude,
                "longitude": habitat_profile.longitude,
                "location_name": habitat_profile.location_name,
                "timezone_name": habitat_profile.timezone_name,
                "habitat_type": habitat_profile.habitat_type,
                "notes": habitat_profile.notes,
                "updated_at": habitat_profile.updated_at.isoformat(),
            }
            if habitat_profile
            else None
        ),
        context_snapshots=[
            {
                "id": str(s.id),
                "captured_at": s.captured_at.isoformat(),
                "temperature_c": s.temperature_c,
                "relative_humidity_pct": s.relative_humidity_pct,
                "aqi_us": s.aqi_us,
                "pm25_ugm3": s.pm25_ugm3,
                "source_weather": s.source_weather,
                "source_aqi": s.source_aqi,
                "confidence": s.confidence,
            }
            for s in snapshots
        ],
        risk_events=[
            {
                "id": str(event.id),
                "severity": event.severity,
                "category": event.category,
                "title": event.title,
                "details": event.details,
                "created_at": event.created_at.isoformat(),
                "resolved_at": event.resolved_at.isoformat() if event.resolved_at else None,
            }
            for event in risk_events
        ],
        exported_at=datetime.now(timezone.utc).isoformat(),
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recordings = list(
        (
            await db.execute(select(Recording.file_url).where(Recording.user_id == current_user.id))
        ).scalars()
    )
    photos = list(
        (
            await db.execute(select(Parakeet.photo_url).where(Parakeet.user_id == current_user.id))
        ).scalars()
    )

    for file_url in recordings:
        await storage.delete_audio(file_url)
    for photo_url in photos:
        if photo_url:
            await storage.delete_file(photo_url)

    await db.delete(current_user)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
