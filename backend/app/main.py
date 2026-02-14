import asyncio
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import analysis, auth, context, parakeets, recordings
from app.core.config import settings
from app.core.database import Base, engine
from app.jobs.context_refresh import context_refresh_loop
from app.core.rate_limit import InMemoryRateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    refresh_task: asyncio.Task | None = None
    refresh_stop_event = asyncio.Event()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if settings.FEATURE_CONTEXT_ENGINE and settings.CONTEXT_AUTO_REFRESH_ENABLED:
        refresh_task = asyncio.create_task(context_refresh_loop(refresh_stop_event))

    yield

    if refresh_task is not None:
        refresh_stop_event.set()
        with suppress(asyncio.CancelledError):
            await refresh_task
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(InMemoryRateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

media_dir = Path(settings.UPLOAD_DIR) / "public"
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(parakeets.router, prefix=settings.API_V1_PREFIX)
app.include_router(recordings.router, prefix=settings.API_V1_PREFIX)
app.include_router(analysis.router, prefix=settings.API_V1_PREFIX)
app.include_router(context.router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}
