import asyncio
import logging

from app.core.config import settings
from app.core.database import async_session
from app.services.context_service import ContextService

logger = logging.getLogger(__name__)


async def context_refresh_loop(stop_event: asyncio.Event) -> None:
    service = ContextService()
    while not stop_event.is_set():
        try:
            async with async_session() as db:
                refreshed = await service.refresh_all_profiles(db)
                await db.commit()
                logger.info("Context refresh job completed. profiles=%s", refreshed)
        except Exception:
            logger.exception("Context refresh job failed")

        try:
            await asyncio.wait_for(
                stop_event.wait(), timeout=settings.CONTEXT_REFRESH_INTERVAL_SECONDS
            )
        except asyncio.TimeoutError:
            continue
