import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_auth_context
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
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


class RecordingResponse(BaseModel):
    id: str
    file_url: str
    original_filename: str
    duration_seconds: float
    file_size_bytes: int
    sample_rate: int | None
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
    if file.content_type and file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio format: {file.content_type}. Supported: WAV, MP3, M4A, OGG, FLAC, WebM",
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

    return _to_response(recording)


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
    return [_to_response(r) for r in result.scalars().all()]


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
    return _to_detail_response(recording, analyses)


@router.delete("/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording(
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    recording = await get_user_recording(db, recording_id, auth_context.owner_id)
    await storage.delete_audio(recording.file_url)
    await db.delete(recording)


def _to_response(recording: Recording) -> RecordingResponse:
    return RecordingResponse(
        id=str(recording.id),
        file_url=recording.file_url,
        original_filename=recording.original_filename,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=recording.file_size_bytes,
        sample_rate=recording.sample_rate,
        recorded_at=recording.recorded_at.isoformat(),
        created_at=recording.created_at.isoformat(),
    )


def _to_detail_response(
    recording: Recording, analyses: list[AnalysisResult]
) -> RecordingDetailResponse:
    return RecordingDetailResponse(
        **_to_response(recording).model_dump(),
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
