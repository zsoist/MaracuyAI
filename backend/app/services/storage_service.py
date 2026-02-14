import io
import os
import uuid
from pathlib import Path

import librosa
import soundfile as sf

from app.core.config import settings


class StorageService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_audio(
        self, contents: bytes, user_id: str, original_filename: str
    ) -> dict:
        file_id = str(uuid.uuid4())
        user_dir = self.upload_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(original_filename).suffix.lower() or ".wav"
        saved_filename = f"{file_id}{ext}"
        file_path = user_dir / saved_filename

        with open(file_path, "wb") as f:
            f.write(contents)

        try:
            y, sr = librosa.load(io.BytesIO(contents), sr=None)
            duration = float(librosa.get_duration(y=y, sr=sr))
            sample_rate = int(sr)
        except Exception:
            duration = 0.0
            sample_rate = None

        if duration > settings.AUDIO_MAX_DURATION_SECONDS:
            os.remove(file_path)
            raise ValueError(
                f"Audio too long ({duration:.0f}s). Max: {settings.AUDIO_MAX_DURATION_SECONDS}s"
            )

        wav_path = user_dir / f"{file_id}.wav"
        if ext != ".wav":
            try:
                y_resampled, _ = librosa.load(
                    io.BytesIO(contents), sr=settings.AUDIO_SAMPLE_RATE, mono=True
                )
                sf.write(str(wav_path), y_resampled, settings.AUDIO_SAMPLE_RATE)
            except Exception:
                wav_path = file_path

        return {
            "file_url": str(wav_path if wav_path.exists() else file_path),
            "duration_seconds": duration,
            "sample_rate": sample_rate,
        }

    async def delete_audio(self, file_url: str) -> None:
        path = Path(file_url)
        if path.exists():
            os.remove(path)
        wav_variant = path.with_suffix(".wav")
        if wav_variant != path and wav_variant.exists():
            os.remove(wav_variant)

    async def get_audio_path(self, file_url: str) -> Path:
        path = Path(file_url)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {file_url}")
        return path
