import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_auth_context
from app.core.config import settings
from app.core.database import get_db
from app.models.analysis_result import AnalysisResult
from app.models.recording import Recording
from app.services.recording_service import get_user_recording
from app.services.storage_service import StorageService

router = APIRouter(prefix="/recordings", tags=["recordings"])

storage = StorageService()

ALLOWED_AUDIO_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
    "audio/ogg",
    "audio/flac",
    "audio/webm",
}
ALLOWED_AUDIO_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".mp4",
    ".ogg",
    ".flac",
    ".webm",
    ".aac",
    ".caf",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


class RecordingResponse(BaseModel):
    id: str
    file_url: str
    media_url: str | None = None
    original_filename: str
    duration_seconds: float
    file_size_bytes: int
    sample_rate: int | None
    quality_score: float
    quality_label: str
    quality_warnings: list[str] = Field(default_factory=list)
    recorded_at: str
    created_at: str

    model_config = {"from_attributes": True}


class RecordingAnalysisResponse(BaseModel):
    id: str
    parakeet_id: str | None
    mood: str
    confidence: float
    energy_level: float
    vocalization_type: str
    recommendations: str | None
    created_at: str


class RecordingDetailResponse(RecordingResponse):
    analysis_results: list[RecordingAnalysisResponse] = Field(default_factory=list)


@router.post("/upload", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    if not _is_supported_audio_upload(
        content_type=file.content_type,
        filename=file.filename,
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                "Unsupported audio format: "
                f"{file.content_type or 'unknown'}. Supported: WAV, MP3, M4A/MP4, "
                "OGG, FLAC, WebM, AAC, CAF"
            ),
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB.",
        )

    try:
        file_info = await storage.save_audio(
            contents=contents,
            user_id=str(auth_context.owner_id),
            original_filename=file.filename or "recording.wav",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    recording = Recording(
        user_id=auth_context.owner_id,
        file_url=file_info["file_url"],
        original_filename=file.filename or "recording.wav",
        duration_seconds=file_info["duration_seconds"],
        file_size_bytes=len(contents),
        sample_rate=file_info.get("sample_rate"),
    )
    db.add(recording)
    await db.flush()

    return await _to_response(recording, db)


@router.get("/", response_model=list[RecordingResponse])
async def list_recordings(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    result = await db.execute(
        select(Recording)
        .where(Recording.user_id == auth_context.owner_id)
        .order_by(Recording.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [await _to_response(r, db) for r in result.scalars().all()]


@router.get("/{recording_id}", response_model=RecordingDetailResponse)
async def get_recording(
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    recording = await get_user_recording(db, recording_id, auth_context.owner_id)
    analysis_result = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.recording_id == recording.id)
        .order_by(AnalysisResult.created_at.desc())
    )
    analyses = analysis_result.scalars().all()
    return await _to_detail_response(recording, analyses, db)


@router.delete("/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording(
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    recording = await get_user_recording(db, recording_id, auth_context.owner_id)
    await storage.delete_audio(recording.file_url)
    await db.delete(recording)


async def _resolve_recording_media_url(
    recording: Recording, db: AsyncSession
) -> str | None:
    media_url = storage.to_public_media_url(recording.file_url)
    if media_url is not None:
        return media_url

    normalized = await storage.normalize_recording_file_url(
        file_url=recording.file_url,
        user_id=str(recording.user_id),
        recording_id=str(recording.id),
    )
    if normalized is None:
        return None

    recording.file_url = normalized
    await db.flush()
    return storage.to_public_media_url(recording.file_url)


async def _to_response(recording: Recording, db: AsyncSession) -> RecordingResponse:
    if settings.FEATURE_CAPTURE_QUALITY:
        quality = _estimate_recording_quality(recording)
    else:
        quality = {"score": 0.0, "label": "disabled", "warnings": []}
    media_url = await _resolve_recording_media_url(recording, db)
    return RecordingResponse(
        id=str(recording.id),
        file_url=media_url or "",
        media_url=media_url,
        original_filename=recording.original_filename,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=recording.file_size_bytes,
        sample_rate=recording.sample_rate,
        quality_score=quality["score"],
        quality_label=quality["label"],
        quality_warnings=quality["warnings"],
        recorded_at=recording.recorded_at.isoformat(),
        created_at=recording.created_at.isoformat(),
    )


async def _to_detail_response(
    recording: Recording, analyses: list[AnalysisResult], db: AsyncSession
) -> RecordingDetailResponse:
    base = await _to_response(recording, db)
    return RecordingDetailResponse(
        **base.model_dump(),
        analysis_results=[
            RecordingAnalysisResponse(
                id=str(a.id),
                parakeet_id=str(a.parakeet_id) if a.parakeet_id else None,
                mood=a.mood.value,
                confidence=a.confidence,
                energy_level=a.energy_level,
                vocalization_type=a.vocalization_type.value,
                recommendations=a.recommendations,
                created_at=a.created_at.isoformat(),
            )
            for a in analyses
        ],
    )


def _estimate_recording_quality(recording: Recording) -> dict[str, object]:
    score = 0.0
    warnings: list[str] = []

    duration = recording.duration_seconds
    sample_rate = recording.sample_rate or 0
    size_bytes = recording.file_size_bytes

    if duration < 3:
        warnings.append("Recording is very short. Aim for at least 10 seconds.")
    elif duration < 10:
        score += 0.15
        warnings.append("Short recording. More context improves analysis confidence.")
    elif duration <= 120:
        score += 0.45
    else:
        score += 0.35
        warnings.append("Long recording may include mixed events. Trim if needed.")

    if sample_rate >= 22050:
        score += 0.35
    elif sample_rate >= 16000:
        score += 0.2
        warnings.append("Sample rate is acceptable but not ideal.")
    else:
        score += 0.05
        warnings.append("Low sample rate may reduce classification quality.")

    if size_bytes < 100_000:
        warnings.append("Small file size suggests weak signal or compression artifacts.")
    else:
        score += 0.2

    score = round(min(score, 0.99), 2)
    if score < 0.4:
        label = "poor"
    elif score < 0.65:
        label = "fair"
    elif score < 0.85:
        label = "good"
    else:
        label = "excellent"

    return {
        "score": score,
        "label": label,
        "warnings": warnings,
    }


def _is_supported_audio_upload(content_type: str | None, filename: str | None) -> bool:
    normalized_type = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized_type in ALLOWED_AUDIO_TYPES:
        return True

    # Browser recorder output varies across Safari/Chrome multipart uploads.
    if normalized_type in {"video/mp4", "application/octet-stream"}:
        return _has_supported_audio_extension(filename)

    if normalized_type.startswith("audio/"):
        return _has_supported_audio_extension(filename) or normalized_type in ALLOWED_AUDIO_TYPES

    return _has_supported_audio_extension(filename)


def _has_supported_audio_extension(filename: str | None) -> bool:
    if not filename:
        return False
    return Path(filename).suffix.lower() in ALLOWED_AUDIO_EXTENSIONS
