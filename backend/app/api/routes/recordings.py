import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.recording import Recording
from app.models.user import User
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


@router.post("/upload", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type and file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio format: {file.content_type}. Supported: WAV, MP3, M4A, OGG, FLAC, WebM",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB.",
        )

    file_info = await storage.save_audio(
        contents=contents,
        user_id=str(current_user.id),
        original_filename=file.filename or "recording.wav",
    )

    recording = Recording(
        user_id=current_user.id,
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
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Recording)
        .where(Recording.user_id == current_user.id)
        .order_by(Recording.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [_to_response(r) for r in result.scalars().all()]


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recording = await _get_user_recording(db, recording_id, current_user.id)
    return _to_response(recording)


@router.delete("/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording(
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recording = await _get_user_recording(db, recording_id, current_user.id)
    await storage.delete_audio(recording.file_url)
    await db.delete(recording)


async def _get_user_recording(
    db: AsyncSession, recording_id: uuid.UUID, user_id: uuid.UUID
) -> Recording:
    result = await db.execute(
        select(Recording).where(
            Recording.id == recording_id,
            Recording.user_id == user_id,
        )
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    return recording


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
