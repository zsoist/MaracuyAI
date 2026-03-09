import base64
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

_LONG_PASSWORD_PREFIX = "sha256:"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_normalize_password(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    normalized_password = _normalize_password(plain_password)
    try:
        return bcrypt.checkpw(normalized_password, hashed_password.encode("utf-8"))
    except ValueError:
        return False


def _normalize_password(password: str) -> bytes:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) <= 72:
        return password_bytes

    digest = hashlib.sha256(password_bytes).digest()
    encoded = base64.urlsafe_b64encode(digest).rstrip(b"=")
    return _LONG_PASSWORD_PREFIX.encode("ascii") + encoded


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except JWTError:
        return None
