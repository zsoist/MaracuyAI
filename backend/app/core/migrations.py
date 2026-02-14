from __future__ import annotations

from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


def _build_alembic_config() -> Config:
    backend_root = Path(__file__).resolve().parents[2]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "migrations"))
    return config


def get_expected_migration_head() -> str:
    script = ScriptDirectory.from_config(_build_alembic_config())
    heads = script.get_heads()
    if len(heads) != 1:
        raise RuntimeError(
            f"Expected exactly one Alembic head revision, found {len(heads)}: {heads}"
        )
    return heads[0]


async def get_current_database_revision(engine: AsyncEngine) -> str:
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version_num FROM alembic_version"))
            revisions = [row for row in result.scalars().all() if row]
    except Exception as exc:  # pragma: no cover - defensive path for startup safeguards
        raise RuntimeError(
            "Unable to read alembic_version. Run `alembic upgrade head` before starting in release mode."
        ) from exc

    if len(revisions) != 1:
        raise RuntimeError(
            f"Expected one alembic revision row, found {len(revisions)}: {revisions}"
        )
    return revisions[0]


async def ensure_database_schema_is_current(engine: AsyncEngine) -> None:
    expected = get_expected_migration_head()
    current = await get_current_database_revision(engine)
    if current != expected:
        raise RuntimeError(
            "Database revision mismatch. "
            f"Current={current}, expected={expected}. "
            "Run `alembic upgrade head` before release startup."
        )
