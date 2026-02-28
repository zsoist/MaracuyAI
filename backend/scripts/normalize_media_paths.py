#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import os
import shutil
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

# Keep migration utility runnable in fresh/local setups.
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault(
    "SECRET_KEY", "dev-secret-key-for-migration-script-only-please-change-in-prod"
)

from app.core.database import async_session
from app.models.recording import Recording
from app.services.storage_service import StorageService


def build_target_path(storage: StorageService, recording: Recording, source: Path) -> Path:
    ext = source.suffix.lower() or ".wav"
    user_dir = storage.public_dir / "audio" / str(recording.user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    target = user_dir / f"{recording.id}{ext}"
    if target.exists() and target.resolve() != source.resolve():
        target = user_dir / f"{recording.id}-{uuid4().hex[:8]}{ext}"
    return target


async def normalize_paths(dry_run: bool) -> None:
    storage = StorageService()

    scanned = 0
    normalized = 0
    skipped = 0
    missing = 0

    async with async_session() as db:
        recordings = list((await db.execute(select(Recording))).scalars().all())

        for recording in recordings:
            scanned += 1
            source_path = storage._resolve_stored_path(recording.file_url)
            canonical_url = storage.to_public_media_url(recording.file_url)

            # Already canonical and file exists where expected.
            if canonical_url is not None and source_path.exists():
                skipped += 1
                continue

            if not source_path.exists():
                missing += 1
                print(f"[missing] recording={recording.id} path={source_path}")
                continue

            target_path = build_target_path(storage, recording, source_path)
            target_changed = target_path.resolve() != source_path.resolve()

            if dry_run:
                if target_changed:
                    print(f"[dry-run move] {source_path} -> {target_path}")
                print(f"[dry-run update] recording={recording.id} file_url={target_path}")
                normalized += 1
                continue

            if target_changed:
                shutil.move(str(source_path), str(target_path))

            recording.file_url = str(target_path)
            normalized += 1

        if not dry_run:
            await db.commit()

    print(
        f"done: scanned={scanned} normalized={normalized} skipped={skipped} missing={missing} dry_run={dry_run}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize legacy recording file paths into canonical /uploads/public/audio locations."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned moves/updates without writing to disk or database.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(normalize_paths(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
