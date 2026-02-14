from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict, deque
from collections.abc import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from redis.asyncio import Redis, from_url as redis_from_url
except Exception:  # pragma: no cover - optional dependency guard
    Redis = None  # type: ignore[assignment]
    redis_from_url = None


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self._lock = asyncio.Lock()
        self._hits: dict[str, Deque[float]] = defaultdict(deque)
        self._path_limits: dict[str, tuple[int, int]] = {
            f"{settings.API_V1_PREFIX}/auth/login": (20, 60),
            f"{settings.API_V1_PREFIX}/auth/register": (10, 60),
            f"{settings.API_V1_PREFIX}/recordings/upload": (20, 60),
            f"{settings.API_V1_PREFIX}/analysis/analyze": (30, 60),
        }
        self._redis: Redis | None = None
        if settings.RATE_LIMIT_BACKEND == "redis":
            if redis_from_url is None:
                if settings.RATE_LIMIT_REDIS_STRICT:
                    raise RuntimeError(
                        "RATE_LIMIT_BACKEND=redis but redis client is unavailable."
                    )
                logger.warning(
                    "Redis rate limit backend requested but redis client is unavailable; "
                    "falling back to in-memory limits."
                )
            else:
                self._redis = redis_from_url(
                    settings.RATE_LIMIT_REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                )

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        client_host = request.client.host if request.client else "unknown"
        limit, window = self._path_limits.get(
            request.url.path,
            (settings.RATE_LIMIT_REQUESTS, settings.RATE_LIMIT_WINDOW_SECONDS),
        )
        bucket_name = request.url.path if request.url.path in self._path_limits else "__global__"
        key = f"{settings.RATE_LIMIT_KEY_PREFIX}:{client_host}:{bucket_name}"

        retry_after = await self._evaluate_limit(key=key, limit=limit, window=window)
        if retry_after is not None:
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(retry_after)},
                content={
                    "detail": "Rate limit exceeded. Please retry later.",
                    "retry_after_seconds": retry_after,
                },
            )

        return await call_next(request)

    async def _evaluate_limit(self, *, key: str, limit: int, window: int) -> int | None:
        if self._redis is not None:
            retry_after = await self._evaluate_redis_limit(key=key, limit=limit, window=window)
            if retry_after is not None:
                return retry_after
            if settings.RATE_LIMIT_BACKEND == "redis":
                return None
        return await self._evaluate_memory_limit(key=key, limit=limit, window=window)

    async def _evaluate_memory_limit(self, *, key: str, limit: int, window: int) -> int | None:
        now = time.monotonic()
        async with self._lock:
            bucket = self._hits[key]
            cutoff = now - window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                return int(max(1, window - (now - bucket[0])))

            bucket.append(now)
            return None

    async def _evaluate_redis_limit(self, *, key: str, limit: int, window: int) -> int | None:
        assert self._redis is not None
        try:
            count = await self._redis.incr(key)
            if count == 1:
                await self._redis.expire(key, window)
            if count > limit:
                ttl = await self._redis.ttl(key)
                if ttl is None or ttl <= 0:
                    return window
                return int(ttl)
            return None
        except Exception:
            if settings.RATE_LIMIT_REDIS_STRICT:
                raise
            logger.exception(
                "Redis rate limit check failed for key=%s; falling back to in-memory limits.",
                key,
            )
            return await self._evaluate_memory_limit(key=key, limit=limit, window=window)
