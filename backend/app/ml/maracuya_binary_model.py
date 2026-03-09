"""Binary Maracuya CNN adapter based on the provided notebook and inference scripts."""

from __future__ import annotations

import logging
from pathlib import Path

import librosa
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class MaracuyaBinaryModel:
    """Loads and runs the user-provided binary CNN for feliz vs estres."""

    def __init__(self, model_path: str | None = None, threshold: float | None = None):
        self._model_path = Path(model_path or settings.MARACUYA_BINARY_MODEL_PATH)
        self.threshold = float(
            settings.MARACUYA_BINARY_MODEL_THRESHOLD if threshold is None else threshold
        )
        self.sample_rate = settings.AUDIO_SAMPLE_RATE
        self.top_db = 80
        self._model = None

    @property
    def model_path(self) -> Path:
        return self._model_path

    @property
    def is_available(self) -> bool:
        return self.model_path.exists()

    @property
    def model(self):
        if self._model is None:
            self._model = self._load_model()
        return self._model

    def _load_model(self):
        if not self.is_available:
            raise FileNotFoundError(f"Maracuya binary model not found at {self.model_path}")

        from tensorflow import keras  # lazy import keeps startup cheap when model is absent

        logger.info("Loading Maracuya binary CNN from %s", self.model_path)
        return keras.models.load_model(self.model_path)

    def analyze_file(self, file_path: str) -> dict:
        y, _ = librosa.load(file_path, sr=self.sample_rate, mono=True)
        if y.size == 0:
            raise ValueError("Audio file has no usable signal.")

        n_mels, time_bins = self._input_spec()
        segment_seconds = 1.5 if time_bins <= 80 else 3.0
        overlap = 0.0 if segment_seconds <= 1.5 else 0.5

        segments = self._segment_audio(y, segment_seconds=segment_seconds, overlap=overlap)
        batch = np.stack(
            [
                self._preprocess_segment(
                    segment,
                    segment_seconds=segment_seconds,
                    n_mels=n_mels,
                    time_bins=time_bins,
                )
                for segment in segments
            ],
            axis=0,
        )

        probs = self.model.predict(batch, verbose=0).reshape(-1)
        prob_feliz = float(np.mean(probs))
        prob_estres = float(1.0 - prob_feliz)
        binary_label = "feliz" if prob_feliz >= self.threshold else "estres"
        confidence = prob_feliz if binary_label == "feliz" else prob_estres
        energy_level = float(np.mean(librosa.feature.rms(y=y)))

        return {
            "binary_label": binary_label,
            "prob_feliz": prob_feliz,
            "prob_estres": prob_estres,
            "confidence": float(confidence),
            "threshold": self.threshold,
            "duration_seconds": float(len(y) / self.sample_rate),
            "segments_analyzed": len(probs),
            "segment_seconds": segment_seconds,
            "segment_overlap": overlap,
            "probs_per_segment": [round(float(prob), 4) for prob in probs],
            "energy_level": energy_level,
            "sample_rate": self.sample_rate,
            "model_path": str(self.model_path),
            "model_version": "maracuya-binary-cnn",
        }

    def _input_spec(self) -> tuple[int, int]:
        input_shape = self.model.input_shape
        if isinstance(input_shape, list):
            input_shape = input_shape[0]

        if len(input_shape) != 4:
            raise ValueError(f"Unexpected Maracuya model input shape: {input_shape}")

        _, n_mels, time_bins, _ = input_shape
        if n_mels is None or time_bins is None:
            raise ValueError(f"Unsupported dynamic input shape for Maracuya model: {input_shape}")

        return int(n_mels), int(time_bins)

    def _segment_audio(
        self,
        y: np.ndarray,
        *,
        segment_seconds: float,
        overlap: float,
    ) -> list[np.ndarray]:
        segment_samples = max(1, int(round(segment_seconds * self.sample_rate)))
        if len(y) <= segment_samples:
            return [y]

        step = max(1, int(round(segment_samples * (1 - overlap))))
        segments: list[np.ndarray] = []

        for start in range(0, max(1, len(y) - segment_samples + 1), step):
            end = start + segment_samples
            segment = y[start:end]
            if len(segment) < segment_samples:
                break
            segments.append(segment)

        tail = y[-segment_samples:]
        if tail.size and (not segments or not np.array_equal(segments[-1], tail)):
            segments.append(tail)

        return segments or [y]

    def _preprocess_segment(
        self,
        y: np.ndarray,
        *,
        segment_seconds: float,
        n_mels: int,
        time_bins: int,
    ) -> np.ndarray:
        target_len = int(round(segment_seconds * self.sample_rate))
        if len(y) < target_len:
            y = np.pad(y, (0, target_len - len(y)))
        else:
            y = y[:target_len]

        mel = librosa.feature.melspectrogram(y=y, sr=self.sample_rate, n_mels=n_mels)
        log_mel = librosa.power_to_db(mel, ref=np.max, top_db=self.top_db)
        log_mel = (log_mel + self.top_db) / self.top_db

        if log_mel.shape[1] < time_bins:
            pad_width = time_bins - log_mel.shape[1]
            log_mel = np.pad(log_mel, ((0, 0), (0, pad_width)))
        elif log_mel.shape[1] > time_bins:
            log_mel = log_mel[:, :time_bins]

        return log_mel[..., np.newaxis].astype(np.float32)
