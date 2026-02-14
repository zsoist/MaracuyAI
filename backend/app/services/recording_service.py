import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recording import Recording


async def get_user_recording(
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
