"""Advanced audio feature extraction engine for budgerigar vocalization analysis.

Extracts a rich, multi-domain feature vector from raw audio for use by the
statistical classifier arm of the ensemble. Features are specifically tuned
to budgerigar (Melopsittacus undulatus) vocal characteristics:
  - Fundamental frequency range: ~1 kHz – 8 kHz
  - Typical call duration: 0.1 – 2 s
  - Contact calls: brief, tonal, ~2-4 kHz
  - Alarm calls: loud broadband bursts, high spectral centroid
  - Singing/warbling: complex frequency modulation, high pitch variance
  - Beak grinding: low-amplitude, rhythmic broadband clicks (~10-20 Hz rhythm)
"""

from __future__ import annotations

from dataclasses import dataclass, field

import librosa
import numpy as np
from scipy import signal as scipy_signal
from scipy.stats import kurtosis, skew


@dataclass
class BirdFeatureVector:
    """Comprehensive feature vector for a single audio segment."""

    # --- Spectral ---
    spectral_centroid_mean: float = 0.0
    spectral_centroid_std: float = 0.0
    spectral_bandwidth_mean: float = 0.0
    spectral_bandwidth_std: float = 0.0
    spectral_contrast_mean: float = 0.0
    spectral_flatness_mean: float = 0.0
    spectral_rolloff_mean: float = 0.0

    # --- MFCC statistics (first 20 coefficients) ---
    mfcc_means: list[float] = field(default_factory=list)
    mfcc_stds: list[float] = field(default_factory=list)
    mfcc_delta_means: list[float] = field(default_factory=list)
    mfcc_delta2_means: list[float] = field(default_factory=list)

    # --- Energy / dynamics ---
    rms_mean: float = 0.0
    rms_std: float = 0.0
    rms_max: float = 0.0
    rms_dynamic_range: float = 0.0
    zcr_mean: float = 0.0
    zcr_std: float = 0.0

    # --- Pitch / tonality ---
    pitch_mean: float = 0.0
    pitch_std: float = 0.0
    pitch_min: float = 0.0
    pitch_max: float = 0.0
    pitch_range: float = 0.0
    pitch_confidence: float = 0.0
    harmonic_ratio: float = 0.0

    # --- Temporal ---
    onset_count: int = 0
    onset_rate: float = 0.0
    tempo: float = 0.0
    duration: float = 0.0

    # --- Chroma ---
    chroma_mean: float = 0.0
    chroma_std: float = 0.0
    tonnetz_mean: float = 0.0

    # --- Bird-specific ---
    bird_band_energy_ratio: float = 0.0  # energy in 1-8 kHz / total energy
    high_freq_energy_ratio: float = 0.0  # energy above 4 kHz / total
    spectral_entropy: float = 0.0
    amplitude_modulation_rate: float = 0.0

    # --- Statistical shape ---
    rms_skew: float = 0.0
    rms_kurtosis: float = 0.0
    spectral_centroid_skew: float = 0.0

    def to_vector(self) -> np.ndarray:
        """Flatten all numeric features into a 1-D numpy array."""
        vals = []
        for v in [
            self.spectral_centroid_mean, self.spectral_centroid_std,
            self.spectral_bandwidth_mean, self.spectral_bandwidth_std,
            self.spectral_contrast_mean, self.spectral_flatness_mean,
            self.spectral_rolloff_mean,
            self.rms_mean, self.rms_std, self.rms_max, self.rms_dynamic_range,
            self.zcr_mean, self.zcr_std,
            self.pitch_mean, self.pitch_std, self.pitch_min, self.pitch_max,
            self.pitch_range, self.pitch_confidence, self.harmonic_ratio,
            self.onset_count, self.onset_rate, self.tempo, self.duration,
            self.chroma_mean, self.chroma_std, self.tonnetz_mean,
            self.bird_band_energy_ratio, self.high_freq_energy_ratio,
            self.spectral_entropy, self.amplitude_modulation_rate,
            self.rms_skew, self.rms_kurtosis, self.spectral_centroid_skew,
        ]:
            vals.append(float(v))
        vals.extend(self.mfcc_means)
        vals.extend(self.mfcc_stds)
        vals.extend(self.mfcc_delta_means)
        vals.extend(self.mfcc_delta2_means)
        return np.array(vals, dtype=np.float32)


class FeatureEngine:
    """Extracts the BirdFeatureVector from a raw audio segment."""

    def __init__(self, sr: int = 22050):
        self.sr = sr

    def extract(self, y: np.ndarray) -> BirdFeatureVector:
        fv = BirdFeatureVector()
        duration = float(len(y) / self.sr)
        fv.duration = duration

        if len(y) < self.sr * 0.05:  # less than 50 ms
            return fv

        # --- Spectral features ---
        centroid = librosa.feature.spectral_centroid(y=y, sr=self.sr)[0]
        fv.spectral_centroid_mean = float(np.mean(centroid))
        fv.spectral_centroid_std = float(np.std(centroid))
        fv.spectral_centroid_skew = float(skew(centroid)) if len(centroid) > 2 else 0.0

        bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=self.sr)[0]
        fv.spectral_bandwidth_mean = float(np.mean(bandwidth))
        fv.spectral_bandwidth_std = float(np.std(bandwidth))

        contrast = librosa.feature.spectral_contrast(y=y, sr=self.sr)
        fv.spectral_contrast_mean = float(np.mean(contrast))

        flatness = librosa.feature.spectral_flatness(y=y)[0]
        fv.spectral_flatness_mean = float(np.mean(flatness))

        rolloff = librosa.feature.spectral_rolloff(y=y, sr=self.sr)[0]
        fv.spectral_rolloff_mean = float(np.mean(rolloff))

        # --- MFCC: 20 coefficients + delta + delta-delta ---
        n_mfcc = 20
        mfccs = librosa.feature.mfcc(y=y, sr=self.sr, n_mfcc=n_mfcc)
        mfcc_delta = librosa.feature.delta(mfccs)
        mfcc_delta2 = librosa.feature.delta(mfccs, order=2)

        fv.mfcc_means = [float(np.mean(mfccs[i])) for i in range(n_mfcc)]
        fv.mfcc_stds = [float(np.std(mfccs[i])) for i in range(n_mfcc)]
        fv.mfcc_delta_means = [float(np.mean(mfcc_delta[i])) for i in range(n_mfcc)]
        fv.mfcc_delta2_means = [float(np.mean(mfcc_delta2[i])) for i in range(n_mfcc)]

        # --- Energy / dynamics ---
        rms = librosa.feature.rms(y=y)[0]
        fv.rms_mean = float(np.mean(rms))
        fv.rms_std = float(np.std(rms))
        fv.rms_max = float(np.max(rms))
        fv.rms_dynamic_range = float(np.max(rms) - np.min(rms))
        if len(rms) > 2:
            fv.rms_skew = float(skew(rms))
            fv.rms_kurtosis = float(kurtosis(rms))

        zcr = librosa.feature.zero_crossing_rate(y)[0]
        fv.zcr_mean = float(np.mean(zcr))
        fv.zcr_std = float(np.std(zcr))

        # --- Pitch ---
        pitches, magnitudes = librosa.piptrack(y=y, sr=self.sr)
        pitch_values = []
        pitch_confs = []
        for t in range(pitches.shape[1]):
            idx = magnitudes[:, t].argmax()
            pitch = pitches[idx, t]
            mag = magnitudes[idx, t]
            if pitch > 0:
                pitch_values.append(pitch)
                pitch_confs.append(mag)

        if pitch_values:
            fv.pitch_mean = float(np.mean(pitch_values))
            fv.pitch_std = float(np.std(pitch_values))
            fv.pitch_min = float(np.min(pitch_values))
            fv.pitch_max = float(np.max(pitch_values))
            fv.pitch_range = fv.pitch_max - fv.pitch_min
            fv.pitch_confidence = float(np.mean(pitch_confs))

        # --- Harmonic ratio ---
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        harmonic_energy = float(np.sum(y_harmonic ** 2))
        total_energy = float(np.sum(y ** 2))
        fv.harmonic_ratio = harmonic_energy / max(total_energy, 1e-10)

        # --- Temporal ---
        onset_frames = librosa.onset.onset_detect(y=y, sr=self.sr)
        fv.onset_count = len(onset_frames)
        fv.onset_rate = len(onset_frames) / max(duration, 0.01)

        tempo_arr = librosa.beat.tempo(y=y, sr=self.sr)
        fv.tempo = float(tempo_arr[0]) if len(tempo_arr) > 0 else 0.0

        # --- Chroma and Tonnetz ---
        chroma = librosa.feature.chroma_stft(y=y, sr=self.sr)
        fv.chroma_mean = float(np.mean(chroma))
        fv.chroma_std = float(np.std(chroma))

        tonnetz = librosa.feature.tonnetz(y=y_harmonic, sr=self.sr)
        fv.tonnetz_mean = float(np.mean(tonnetz))

        # --- Bird-specific features ---
        fv.bird_band_energy_ratio = self._band_energy_ratio(y, 1000, 8000)
        fv.high_freq_energy_ratio = self._band_energy_ratio(y, 4000, self.sr // 2)
        fv.spectral_entropy = self._spectral_entropy(y)
        fv.amplitude_modulation_rate = self._amplitude_modulation_rate(rms)

        return fv

    def _band_energy_ratio(self, y: np.ndarray, low_hz: int, high_hz: int) -> float:
        """Ratio of energy within [low_hz, high_hz] to total energy."""
        S = np.abs(librosa.stft(y)) ** 2
        freqs = librosa.fft_frequencies(sr=self.sr)
        total = float(np.sum(S))
        if total < 1e-10:
            return 0.0
        mask = (freqs >= low_hz) & (freqs <= high_hz)
        band = float(np.sum(S[mask, :]))
        return band / total

    def _spectral_entropy(self, y: np.ndarray) -> float:
        """Shannon entropy of the power spectrum — measures spectral complexity."""
        S = np.abs(librosa.stft(y)) ** 2
        power = np.sum(S, axis=1)
        total = np.sum(power)
        if total < 1e-10:
            return 0.0
        p = power / total
        p = p[p > 0]
        return -float(np.sum(p * np.log2(p)))

    def _amplitude_modulation_rate(self, rms: np.ndarray) -> float:
        """Dominant amplitude modulation frequency — captures rhythmic patterns
        like beak grinding or repetitive contact calls."""
        if len(rms) < 8:
            return 0.0
        rms_centered = rms - np.mean(rms)
        # Use Welch PSD to find dominant modulation frequency
        # RMS frames are at ~43 Hz (sr=22050, hop=512)
        frame_rate = self.sr / 512.0
        freqs, psd = scipy_signal.welch(rms_centered, fs=frame_rate, nperseg=min(len(rms_centered), 64))
        if len(psd) == 0:
            return 0.0
        dominant_idx = int(np.argmax(psd[1:])) + 1  # skip DC
        return float(freqs[dominant_idx]) if dominant_idx < len(freqs) else 0.0
