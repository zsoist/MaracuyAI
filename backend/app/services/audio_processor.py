"""Enhanced audio processor with bird vocalization isolation, voice activity
detection, and advanced preprocessing tailored for budgerigar analysis.

Key improvements over v1:
  - Bandpass filtering to isolate the budgerigar vocal range (800 Hz – 10 kHz)
  - Harmonic-percussive source separation (HPSS) for cleaner tonal extraction
  - Voice Activity Detection (VAD) to focus analysis on vocal segments only
  - Adaptive noise reduction calibrated to the first 0.5 s of each recording
  - Mel spectrogram generation tuned for the CNN classifier input shape
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import librosa
import numpy as np
import noisereduce as nr
from scipy.signal import butter, sosfiltfilt

from app.core.config import settings

logger = logging.getLogger(__name__)

# Budgerigar vocal range
BIRD_FREQ_LOW = 800   # Hz
BIRD_FREQ_HIGH = 10000  # Hz

# VAD thresholds
VAD_RMS_THRESHOLD = 0.015  # frames below this are considered silent
VAD_MIN_VOCAL_FRAMES = 3   # minimum consecutive active frames to keep


@dataclass
class AudioFeatures:
    """Legacy feature dataclass kept for backward compatibility."""

    mel_spectrogram: np.ndarray
    mfccs: np.ndarray
    spectral_centroid: np.ndarray
    spectral_rolloff: np.ndarray
    zero_crossing_rate: np.ndarray
    rms_energy: np.ndarray
    chroma: np.ndarray
    pitch_mean: float
    pitch_std: float
    duration: float
    sample_rate: int


@dataclass
class ProcessedAudio:
    """Result of the enhanced preprocessing pipeline."""

    raw: np.ndarray            # original loaded + normalized audio
    cleaned: np.ndarray        # after noise reduction
    bird_isolated: np.ndarray  # after bandpass + HPSS
    vocal_mask: np.ndarray     # boolean frame-level VAD mask
    vocal_ratio: float         # fraction of frames with vocal activity
    duration: float
    sample_rate: int


class AudioProcessor:
    """Enhanced audio processor for budgerigar vocalization analysis."""

    def __init__(self):
        self.sr = settings.AUDIO_SAMPLE_RATE
        self.segment_duration = settings.AUDIO_SEGMENT_DURATION

    # ------------------------------------------------------------------
    # Enhanced preprocessing pipeline
    # ------------------------------------------------------------------

    def full_preprocess(self, file_path: str) -> ProcessedAudio:
        """Run the complete preprocessing pipeline on an audio file.

        Steps:
          1. Load as mono at target sample rate
          2. Normalize amplitude
          3. Adaptive noise reduction
          4. Bandpass filter to bird vocal range
          5. Harmonic-percussive source separation
          6. Voice activity detection
        """
        # Load
        y_raw, _ = librosa.load(file_path, sr=self.sr, mono=True)
        y = librosa.util.normalize(y_raw)

        # Adaptive noise reduction — use the quietest 0.5 s as noise profile
        noise_clip_samples = min(int(0.5 * self.sr), len(y) // 4)
        if noise_clip_samples > 0:
            # Find quietest 0.5 s window
            rms_frames = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
            window_frames = max(1, noise_clip_samples // 512)
            if len(rms_frames) > window_frames:
                min_energy_idx = 0
                min_energy = float("inf")
                for i in range(len(rms_frames) - window_frames):
                    w_energy = float(np.mean(rms_frames[i : i + window_frames]))
                    if w_energy < min_energy:
                        min_energy = w_energy
                        min_energy_idx = i
                noise_start = min_energy_idx * 512
                noise_clip = y[noise_start : noise_start + noise_clip_samples]
            else:
                noise_clip = y[:noise_clip_samples]
            y_cleaned = nr.reduce_noise(
                y=y, sr=self.sr, y_noise=noise_clip, prop_decrease=0.8
            )
        else:
            y_cleaned = nr.reduce_noise(y=y, sr=self.sr, prop_decrease=0.7)

        y_cleaned = librosa.util.normalize(y_cleaned)

        # Bandpass filter for bird vocal range
        y_filtered = self._bandpass_filter(y_cleaned, BIRD_FREQ_LOW, BIRD_FREQ_HIGH)

        # Harmonic-percussive source separation — keep harmonic (tonal) component
        y_harmonic, _ = librosa.effects.hpss(y_filtered)

        # Voice Activity Detection
        vocal_mask = self._voice_activity_detection(y_harmonic)
        vocal_ratio = float(np.mean(vocal_mask)) if len(vocal_mask) > 0 else 0.0

        return ProcessedAudio(
            raw=y_raw,
            cleaned=y_cleaned,
            bird_isolated=y_harmonic,
            vocal_mask=vocal_mask,
            vocal_ratio=vocal_ratio,
            duration=float(len(y_raw) / self.sr),
            sample_rate=self.sr,
        )

    def _bandpass_filter(self, y: np.ndarray, low_hz: int, high_hz: int) -> np.ndarray:
        """Apply a Butterworth bandpass filter."""
        nyquist = self.sr / 2.0
        low = max(low_hz / nyquist, 0.001)
        high = min(high_hz / nyquist, 0.999)
        if low >= high:
            return y
        sos = butter(4, [low, high], btype="band", output="sos")
        return sosfiltfilt(sos, y).astype(np.float32)

    def _voice_activity_detection(self, y: np.ndarray) -> np.ndarray:
        """Simple energy-based VAD tuned for bird vocalizations.

        Returns a boolean mask at frame level (hop_length=512).
        """
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        # Adaptive threshold: max of fixed minimum and percentile-based
        adaptive_threshold = max(
            VAD_RMS_THRESHOLD,
            float(np.percentile(rms, 25)) * 1.5,
        )
        active = rms > adaptive_threshold

        # Remove very short activations (noise spikes)
        cleaned = np.copy(active)
        i = 0
        while i < len(cleaned):
            if cleaned[i]:
                j = i
                while j < len(cleaned) and cleaned[j]:
                    j += 1
                if (j - i) < VAD_MIN_VOCAL_FRAMES:
                    cleaned[i:j] = False
                i = j
            else:
                i += 1

        return cleaned

    # ------------------------------------------------------------------
    # Segment extraction
    # ------------------------------------------------------------------

    def segment_audio(self, y: np.ndarray) -> list[np.ndarray]:
        """Split audio into fixed-duration segments."""
        segment_samples = int(self.segment_duration * self.sr)
        segments = []
        for start in range(0, len(y), segment_samples):
            segment = y[start : start + segment_samples]
            if len(segment) >= segment_samples // 2:
                if len(segment) < segment_samples:
                    segment = np.pad(segment, (0, segment_samples - len(segment)))
                segments.append(segment)
        return segments

    def segment_vocal_regions(
        self, y: np.ndarray, vocal_mask: np.ndarray
    ) -> list[np.ndarray]:
        """Extract segments that overlap with vocal activity.

        Falls back to uniform segmentation if no vocal regions found.
        """
        hop = 512
        segment_samples = int(self.segment_duration * self.sr)
        segment_frames = segment_samples // hop

        segments = []
        for start_frame in range(0, len(vocal_mask), segment_frames):
            end_frame = min(start_frame + segment_frames, len(vocal_mask))
            region_mask = vocal_mask[start_frame:end_frame]
            vocal_ratio = float(np.mean(region_mask)) if len(region_mask) > 0 else 0.0

            start_sample = start_frame * hop
            end_sample = min(start_sample + segment_samples, len(y))
            segment = y[start_sample:end_sample]

            if len(segment) < segment_samples // 2:
                continue

            if len(segment) < segment_samples:
                segment = np.pad(segment, (0, segment_samples - len(segment)))

            # Only include segments with at least 20% vocal activity
            # or include all if total vocal ratio is very low (don't drop everything)
            if vocal_ratio >= 0.2:
                segments.append(segment)

        if not segments:
            # Fallback: use standard segmentation
            return self.segment_audio(y)

        return segments

    # ------------------------------------------------------------------
    # Mel spectrogram for CNN
    # ------------------------------------------------------------------

    def compute_mel_spectrogram(self, y: np.ndarray, n_mels: int = 128) -> np.ndarray:
        """Compute a mel spectrogram in dB scale for CNN input."""
        mel = librosa.feature.melspectrogram(
            y=y, sr=self.sr, n_mels=n_mels, fmax=self.sr // 2
        )
        return librosa.power_to_db(mel, ref=np.max)

    # ------------------------------------------------------------------
    # Legacy feature extraction (kept for backward compatibility)
    # ------------------------------------------------------------------

    def load_and_preprocess(self, file_path: str) -> np.ndarray:
        """Legacy: simple load + normalize + noise reduce."""
        y, _ = librosa.load(file_path, sr=self.sr, mono=True)
        y = librosa.util.normalize(y)
        y = nr.reduce_noise(y=y, sr=self.sr, prop_decrease=0.7)
        return y

    def extract_features(self, y: np.ndarray) -> AudioFeatures:
        """Legacy feature extraction."""
        mel_spec = librosa.feature.melspectrogram(
            y=y, sr=self.sr, n_mels=128, fmax=self.sr // 2
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

        mfccs = librosa.feature.mfcc(y=y, sr=self.sr, n_mfcc=13)
        mfcc_delta = librosa.feature.delta(mfccs)
        mfccs_full = np.vstack([mfccs, mfcc_delta])

        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=self.sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=self.sr)[0]
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        rms = librosa.feature.rms(y=y)[0]
        chroma = librosa.feature.chroma_stft(y=y, sr=self.sr)

        pitches, magnitudes = librosa.piptrack(y=y, sr=self.sr)
        pitch_values = []
        for t in range(pitches.shape[1]):
            idx = magnitudes[:, t].argmax()
            pitch = pitches[idx, t]
            if pitch > 0:
                pitch_values.append(pitch)

        pitch_mean = float(np.mean(pitch_values)) if pitch_values else 0.0
        pitch_std = float(np.std(pitch_values)) if pitch_values else 0.0

        return AudioFeatures(
            mel_spectrogram=mel_spec_db,
            mfccs=mfccs_full,
            spectral_centroid=spectral_centroid,
            spectral_rolloff=spectral_rolloff,
            zero_crossing_rate=zcr,
            rms_energy=rms,
            chroma=chroma,
            pitch_mean=pitch_mean,
            pitch_std=pitch_std,
            duration=float(librosa.get_duration(y=y, sr=self.sr)),
            sample_rate=self.sr,
        )

    def get_feature_summary(self, features: AudioFeatures) -> dict:
        quality = self.get_signal_quality(features)
        return {
            "spectral_centroid_mean": float(np.mean(features.spectral_centroid)),
            "spectral_centroid_std": float(np.std(features.spectral_centroid)),
            "spectral_rolloff_mean": float(np.mean(features.spectral_rolloff)),
            "zcr_mean": float(np.mean(features.zero_crossing_rate)),
            "zcr_std": float(np.std(features.zero_crossing_rate)),
            "rms_mean": float(np.mean(features.rms_energy)),
            "rms_std": float(np.std(features.rms_energy)),
            "pitch_mean": features.pitch_mean,
            "pitch_std": features.pitch_std,
            "mfcc_means": [float(m) for m in np.mean(features.mfccs, axis=1)],
            "duration": features.duration,
            "signal_quality": quality["signal_quality"],
            "noise_profile": quality["noise_profile"],
        }

    def get_signal_quality(self, features: AudioFeatures) -> dict:
        rms_mean = float(np.mean(features.rms_energy))
        rms_std = float(np.std(features.rms_energy))
        zcr_mean = float(np.mean(features.zero_crossing_rate))

        score = 0.0
        if rms_mean >= 0.02:
            score += 0.4
        elif rms_mean >= 0.01:
            score += 0.25
        else:
            score += 0.1

        if rms_std >= 0.01:
            score += 0.25
        else:
            score += 0.1

        if zcr_mean <= 0.12:
            score += 0.25
        elif zcr_mean <= 0.2:
            score += 0.15
        else:
            score += 0.05

        score = round(min(score, 0.95), 2)
        if score < 0.4:
            label = "low"
        elif score < 0.7:
            label = "medium"
        else:
            label = "high"

        if zcr_mean > 0.2:
            noise_label = "high_noise"
        elif zcr_mean > 0.12:
            noise_label = "moderate_noise"
        else:
            noise_label = "low_noise"

        return {
            "signal_quality": {"score": score, "label": label},
            "noise_profile": {
                "label": noise_label,
                "zcr_mean": round(zcr_mean, 4),
                "rms_mean": round(rms_mean, 4),
            },
        }
