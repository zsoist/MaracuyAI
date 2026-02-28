import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token, hash_password, verify_password
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)
GUEST_EMAIL_DOMAIN = "guest.parakeet.local"


@dataclass(frozen=True)
class AuthContext:
    owner_id: uuid.UUID
    user: User | None
    mode: str
    guest_id: str | None = None


def _parse_token_user_id(token: str) -> uuid.UUID | None:
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    try:
        return uuid.UUID(user_id)
    except ValueError:
        return None


def _parse_guest_uuid(guest_id: str | None) -> uuid.UUID | None:
    if not guest_id:
        return None
    try:
        return uuid.UUID(guest_id)
    except ValueError:
        return None


async def _get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def _get_or_create_guest_user(
    db: AsyncSession, guest_uuid: uuid.UUID, guest_secret: str
) -> User:
    guest_email = f"guest+{guest_uuid}@{GUEST_EMAIL_DOMAIN}"
    result = await db.execute(select(User).where(User.email == guest_email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        if not verify_password(guest_secret, existing.password_hash):
            if settings.DEBUG:
                # Local dev safety for pre-secret guest records.
                existing.password_hash = hash_password(guest_secret)
                await db.flush()
                return existing
            raise PermissionError("Guest identity proof failed.")
        return existing

    guest_user = User(
        email=guest_email,
        password_hash=hash_password(guest_secret),
        display_name="Guest",
    )
    db.add(guest_user)
    try:
        await db.flush()
        return guest_user
    except IntegrityError:
        await db.rollback()
        retry = await db.execute(select(User).where(User.email == guest_email))
        recovered = retry.scalar_one_or_none()
        if recovered is None:
            raise
        return recovered


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    user_id = _parse_token_user_id(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = await _get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    guest_id: str | None = Header(default=None, alias="X-Guest-Id"),
    guest_secret: str | None = Header(default=None, alias="X-Guest-Secret"),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    if credentials is not None:
        user_id = _parse_token_user_id(credentials.credentials)
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        user = await _get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        return AuthContext(owner_id=user.id, user=user, mode="account")

    guest_uuid = _parse_guest_uuid(guest_id)
    if guest_uuid is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing guest identity. Provide X-Guest-Id header or bearer token.",
        )
    if guest_secret is None or len(guest_secret.strip()) < settings.GUEST_SECRET_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Missing or invalid guest secret. "
                "Provide X-Guest-Secret header with a strong per-device secret."
            ),
        )
    try:
        guest_user = await _get_or_create_guest_user(db, guest_uuid, guest_secret.strip())
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return AuthContext(
        owner_id=guest_user.id,
        user=None,
        mode="guest",
        guest_id=str(guest_uuid),
    )
