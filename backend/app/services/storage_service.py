import imghdr
import os
import shutil
import uuid
from pathlib import Path

import librosa
import soundfile as sf

from app.core.config import settings


class StorageService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.public_dir = self.upload_dir / "public"
        self.public_dir.mkdir(parents=True, exist_ok=True)

    async def save_audio(
        self, contents: bytes, user_id: str, original_filename: str
    ) -> dict:
        file_id = str(uuid.uuid4())
        user_dir = self.public_dir / "audio" / user_id
        user_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(original_filename).suffix.lower() or ".wav"
        saved_filename = f"{file_id}{ext}"
        file_path = user_dir / saved_filename

        with open(file_path, "wb") as f:
            f.write(contents)

        try:
            y, sr = librosa.load(str(file_path), sr=None, mono=True)
            duration = float(librosa.get_duration(y=y, sr=sr))
            sample_rate = int(sr)
        except Exception as exc:
            self._delete_if_exists(file_path)
            raise ValueError("Invalid or unsupported audio file.") from exc

        if duration <= 0:
            self._delete_if_exists(file_path)
            raise ValueError("Audio file has no usable signal.")

        if duration < settings.AUDIO_MIN_DURATION_SECONDS:
            self._delete_if_exists(file_path)
            raise ValueError(
                f"Audio too short ({duration:.1f}s). Min: {settings.AUDIO_MIN_DURATION_SECONDS:.1f}s"
            )

        if duration > settings.AUDIO_MAX_DURATION_SECONDS:
            self._delete_if_exists(file_path)
            raise ValueError(
                f"Audio too long ({duration:.0f}s). Max: {settings.AUDIO_MAX_DURATION_SECONDS}s"
            )

        target_path = file_path
        if ext != ".wav":
            wav_path = user_dir / f"{file_id}.wav"
            try:
                y_resampled, _ = librosa.load(
                    str(file_path), sr=settings.AUDIO_SAMPLE_RATE, mono=True
                )
                sf.write(str(wav_path), y_resampled, settings.AUDIO_SAMPLE_RATE)
                # Keep only one canonical media artifact per recording.
                self._delete_if_exists(file_path)
                target_path = wav_path
            except Exception:
                target_path = file_path

        return {
            "file_url": str(target_path),
            "media_url": self.to_public_media_url(str(target_path)),
            "duration_seconds": duration,
            "sample_rate": sample_rate,
        }

    async def save_image(self, contents: bytes, user_id: str, original_filename: str) -> str:
        detected = imghdr.what(None, h=contents)
        if detected is None:
            raise ValueError("Invalid or unsupported image file.")

        ext_map = {
            "jpeg": ".jpg",
            "png": ".png",
            "gif": ".gif",
            "webp": ".webp",
        }
        ext = ext_map.get(detected)
        if ext is None:
            raise ValueError("Unsupported image format. Allowed: JPG, PNG, GIF, WEBP.")

        photos_dir = self.public_dir / "photos" / user_id
        photos_dir.mkdir(parents=True, exist_ok=True)

        photo_id = str(uuid.uuid4())
        filename = f"{photo_id}{ext}"
        output_path = photos_dir / filename
        with open(output_path, "wb") as f:
            f.write(contents)

        return f"/media/photos/{user_id}/{filename}"

    async def delete_audio(self, file_url: str) -> None:
        path = self._resolve_stored_path(file_url)
        self._delete_if_exists(path)
        wav_variant = path.with_suffix(".wav")
        if wav_variant != path:
            self._delete_if_exists(wav_variant)

    async def delete_file(self, file_url: str) -> None:
        path = self._resolve_stored_path(file_url)
        self._delete_if_exists(path)

    async def get_audio_path(self, file_url: str) -> Path:
        path = self._resolve_stored_path(file_url)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {file_url}")
        return path

    async def normalize_recording_file_url(
        self, *, file_url: str, user_id: str, recording_id: str
    ) -> str | None:
        source = self._resolve_stored_path(file_url)
        if not source.exists():
            return None

        ext = source.suffix.lower() or ".wav"
        target_dir = self.public_dir / "audio" / user_id
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f"{recording_id}{ext}"

        if source.resolve() != target_path.resolve():
            if target_path.exists():
                target_path = target_dir / f"{recording_id}-{uuid.uuid4().hex[:8]}{ext}"
            shutil.move(str(source), str(target_path))

        return str(target_path)

    def to_public_media_url(self, file_url: str) -> str | None:
        path = self._resolve_stored_path(file_url)
        try:
            relative = path.resolve().relative_to(self.public_dir.resolve())
        except ValueError:
            return None
        return f"/media/{relative.as_posix()}"

    def _resolve_stored_path(self, file_url: str) -> Path:
        path = Path(file_url)
        if path.is_absolute():
            return path

        normalized = file_url.lstrip("/")
        if normalized.startswith("media/"):
            normalized = f"public/{normalized.removeprefix('media/')}"
        return self.upload_dir / normalized

    def _delete_if_exists(self, path: Path) -> None:
        if path.exists():
            os.remove(path)
