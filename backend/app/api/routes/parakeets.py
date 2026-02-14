import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_auth_context
from app.core.database import get_db
from app.models.parakeet import Parakeet
from app.services.parakeet_service import get_user_parakeet
from app.services.storage_service import StorageService

router = APIRouter(prefix="/parakeets", tags=["parakeets"])
storage = StorageService()


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
    auth_context: AuthContext = Depends(get_auth_context),
):
    parakeet = Parakeet(
        user_id=auth_context.owner_id,
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
    auth_context: AuthContext = Depends(get_auth_context),
):
    result = await db.execute(
        select(Parakeet)
        .where(Parakeet.user_id == auth_context.owner_id)
        .order_by(Parakeet.created_at.desc())
    )
    return [_to_response(p) for p in result.scalars().all()]


@router.get("/{parakeet_id}", response_model=ParakeetResponse)
async def get_parakeet(
    parakeet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    parakeet = await get_user_parakeet(db, parakeet_id, auth_context.owner_id)
    return _to_response(parakeet)


@router.put("/{parakeet_id}", response_model=ParakeetResponse)
async def update_parakeet(
    parakeet_id: uuid.UUID,
    body: ParakeetUpdate,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    parakeet = await get_user_parakeet(db, parakeet_id, auth_context.owner_id)
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(parakeet, key, value)
    await db.flush()
    return _to_response(parakeet)


@router.delete("/{parakeet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_parakeet(
    parakeet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    parakeet = await get_user_parakeet(db, parakeet_id, auth_context.owner_id)
    if parakeet.photo_url:
        await storage.delete_file(parakeet.photo_url)
    await db.delete(parakeet)


@router.post("/{parakeet_id}/photo", response_model=ParakeetResponse)
async def upload_parakeet_photo(
    parakeet_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload an image.",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty.",
        )

    parakeet = await get_user_parakeet(db, parakeet_id, auth_context.owner_id)
    previous_photo = parakeet.photo_url
    try:
        parakeet.photo_url = await storage.save_image(
            contents=contents,
            user_id=str(auth_context.owner_id),
            original_filename=file.filename or "photo.jpg",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await db.flush()
    if previous_photo:
        await storage.delete_file(previous_photo)

    return _to_response(parakeet)


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
