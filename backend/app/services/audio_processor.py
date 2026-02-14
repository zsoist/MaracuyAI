import io
from dataclasses import dataclass

import librosa
import numpy as np
import noisereduce as nr

from app.core.config import settings


@dataclass
class AudioFeatures:
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


class AudioProcessor:
    def __init__(self):
        self.sr = settings.AUDIO_SAMPLE_RATE
        self.segment_duration = settings.AUDIO_SEGMENT_DURATION

    def load_and_preprocess(self, file_path: str) -> np.ndarray:
        y, _ = librosa.load(file_path, sr=self.sr, mono=True)
        y = librosa.util.normalize(y)
        y = nr.reduce_noise(y=y, sr=self.sr, prop_decrease=0.7)
        return y

    def extract_features(self, y: np.ndarray) -> AudioFeatures:
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

    def segment_audio(self, y: np.ndarray) -> list[np.ndarray]:
        segment_samples = int(self.segment_duration * self.sr)
        segments = []
        for start in range(0, len(y), segment_samples):
            segment = y[start : start + segment_samples]
            if len(segment) >= segment_samples // 2:
                if len(segment) < segment_samples:
                    segment = np.pad(segment, (0, segment_samples - len(segment)))
                segments.append(segment)
        return segments

    def get_feature_summary(self, features: AudioFeatures) -> dict:
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
        }
