import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token, hash_password
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


async def _get_or_create_guest_user(db: AsyncSession, guest_uuid: uuid.UUID) -> User:
    guest_email = f"guest+{guest_uuid}@{GUEST_EMAIL_DOMAIN}"
    result = await db.execute(select(User).where(User.email == guest_email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing

    guest_user = User(
        email=guest_email,
        password_hash=hash_password(uuid.uuid4().hex),
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
    guest_user = await _get_or_create_guest_user(db, guest_uuid)
    return AuthContext(
        owner_id=guest_user.id,
        user=None,
        mode="guest",
        guest_id=str(guest_uuid),
    )
