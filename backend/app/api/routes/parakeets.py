import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.parakeet import Parakeet
from app.models.user import User

router = APIRouter(prefix="/parakeets", tags=["parakeets"])


class ParakeetCreate(BaseModel):
    name: str
    color_description: str | None = None
    birth_date: date | None = None
    notes: str | None = None


class ParakeetUpdate(BaseModel):
    name: str | None = None
    color_description: str | None = None
    birth_date: date | None = None
    photo_url: str | None = None
    notes: str | None = None


class ParakeetResponse(BaseModel):
    id: str
    name: str
    color_description: str | None
    birth_date: date | None
    photo_url: str | None
    notes: str | None
    created_at: str

    model_config = {"from_attributes": True}


@router.post("/", response_model=ParakeetResponse, status_code=status.HTTP_201_CREATED)
async def create_parakeet(
    body: ParakeetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parakeet = Parakeet(
        user_id=current_user.id,
        name=body.name,
        color_description=body.color_description,
        birth_date=body.birth_date,
        notes=body.notes,
    )
    db.add(parakeet)
    await db.flush()
    return _to_response(parakeet)


@router.get("/", response_model=list[ParakeetResponse])
async def list_parakeets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Parakeet)
        .where(Parakeet.user_id == current_user.id)
        .order_by(Parakeet.created_at.desc())
    )
    return [_to_response(p) for p in result.scalars().all()]


@router.get("/{parakeet_id}", response_model=ParakeetResponse)
async def get_parakeet(
    parakeet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parakeet = await _get_user_parakeet(db, parakeet_id, current_user.id)
    return _to_response(parakeet)


@router.put("/{parakeet_id}", response_model=ParakeetResponse)
async def update_parakeet(
    parakeet_id: uuid.UUID,
    body: ParakeetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parakeet = await _get_user_parakeet(db, parakeet_id, current_user.id)
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(parakeet, key, value)
    await db.flush()
    return _to_response(parakeet)


@router.delete("/{parakeet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_parakeet(
    parakeet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parakeet = await _get_user_parakeet(db, parakeet_id, current_user.id)
    await db.delete(parakeet)


async def _get_user_parakeet(
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


def _to_response(parakeet: Parakeet) -> ParakeetResponse:
    return ParakeetResponse(
        id=str(parakeet.id),
        name=parakeet.name,
        color_description=parakeet.color_description,
        birth_date=parakeet.birth_date,
        photo_url=parakeet.photo_url,
        notes=parakeet.notes,
        created_at=parakeet.created_at.isoformat(),
    )
