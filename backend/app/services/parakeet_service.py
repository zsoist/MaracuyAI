import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parakeet import Parakeet


def dedupe_uuids(values: list[uuid.UUID] | None) -> list[uuid.UUID]:
    if not values:
        return []
    seen: set[uuid.UUID] = set()
    deduped: list[uuid.UUID] = []
    for value in values:
        if value not in seen:
            deduped.append(value)
            seen.add(value)
    return deduped


async def get_user_parakeet(
    db: AsyncSession, parakeet_id: uuid.UUID, user_id: uuid.UUID
) -> Parakeet:
    result = await db.execute(
        select(Parakeet).where(
            Parakeet.id == parakeet_id,
            Parakeet.user_id == user_id,
        )
    )
    parakeet = result.scalar_one_or_none()
    if not parakeet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parakeet not found")
    return parakeet


async def validate_user_parakeet_ids(
    db: AsyncSession, user_id: uuid.UUID, parakeet_ids: list[uuid.UUID] | None
) -> list[uuid.UUID]:
    deduped = dedupe_uuids(parakeet_ids)
    if not deduped:
        return []

    owned_result = await db.execute(
        select(Parakeet.id).where(
            Parakeet.user_id == user_id,
            Parakeet.id.in_(deduped),
        )
    )
    owned_ids = set(owned_result.scalars().all())
    unauthorized = [pid for pid in deduped if pid not in owned_ids]
    if unauthorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="One or more parakeet_ids do not belong to the current user.",
        )

    return deduped
