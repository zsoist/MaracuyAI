import asyncio
import time
from collections import defaultdict, deque
from collections.abc import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from app.core.config import settings


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

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        client_host = request.client.host if request.client else "unknown"
        limit, window = self._path_limits.get(
            request.url.path,
            (settings.RATE_LIMIT_REQUESTS, settings.RATE_LIMIT_WINDOW_SECONDS),
        )
        bucket_name = request.url.path if request.url.path in self._path_limits else "__global__"
        key = f"{client_host}:{bucket_name}"
        now = time.monotonic()

        async with self._lock:
            bucket = self._hits[key]
            cutoff = now - window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = int(max(1, window - (now - bucket[0])))
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                    content={
                        "detail": "Rate limit exceeded. Please retry later.",
                        "retry_after_seconds": retry_after,
                    },
                )

            bucket.append(now)

        return await call_next(request)
