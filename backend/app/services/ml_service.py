"""Orchestrator for the enhanced ML analysis pipeline.

Pipeline flow:
  1. Full audio preprocessing (noise reduction, bandpass, HPSS, VAD)
  2. Segment extraction (preferring vocal-active regions)
  3. Per-segment analysis:
     a. Mel spectrogram -> CNN classifier
     b. Feature extraction -> Statistical classifier
     c. Ensemble blending
  4. Cross-segment aggregation with temporal analysis
  5. Bird detection gating
  6. Rich output generation with probabilities, metadata, and recommendations
"""

from __future__ import annotations

import logging

import numpy as np

from app.ml.bird_classifier import BirdCNN
from app.ml.ensemble import EnsemblePredictor, SegmentPrediction
from app.ml.feature_engine import FeatureEngine
from app.ml.statistical_classifier import StatisticalClassifier
from app.services.audio_processor import AudioProcessor

logger = logging.getLogger(__name__)

# Localized recommendations keyed by mood
RECOMMENDATIONS = {
    "happy": (
        "Your parakeet sounds happy and active! Keep up the good environment "
        "with toys and social interaction."
    ),
    "relaxed": (
        "Your parakeet seems calm and content. This is a sign of a comfortable, "
        "safe environment."
    ),
    "stressed": (
        "Signs of stress detected. Check for loud noises, other pets nearby, "
        "or sudden changes in the environment. Ensure the cage is in a calm area."
    ),
    "scared": (
        "Your parakeet seems frightened. Look for potential threats: sudden "
        "movements, unfamiliar objects, or predator-like shadows. Speak softly "
        "and avoid sudden changes."
    ),
    "sick": (
        "Unusual vocalizations detected that may indicate illness. Monitor for "
        "other symptoms (fluffed feathers, loss of appetite, lethargy). Consider "
        "consulting an avian veterinarian."
    ),
    "neutral": (
        "Normal activity detected. Keep monitoring regularly to build a baseline "
        "profile for your parakeet."
    ),
}


class MLService:
    """Orchestrates the full ML analysis pipeline.

    Components:
      - AudioProcessor: preprocessing, bandpass, HPSS, VAD, segmentation
      - BirdCNN: dual-head CNN classifier on mel spectrograms
      - FeatureEngine: 100+ feature extraction for statistical classifier
      - StatisticalClassifier: Gaussian-distance scorer
      - EnsemblePredictor: blends CNN + statistical + temporal predictions
    """

    def __init__(self):
        self.processor = AudioProcessor()
        self.feature_engine = FeatureEngine(sr=self.processor.sr)
        self.stat_classifier = StatisticalClassifier()
        self._cnn: BirdCNN | None = None
        self._ensemble: EnsemblePredictor | None = None

    @property
    def cnn(self) -> BirdCNN:
        if self._cnn is None:
            self._cnn = BirdCNN()
        return self._cnn

    @property
    def ensemble(self) -> EnsemblePredictor:
        if self._ensemble is None:
            self._ensemble = EnsemblePredictor(
                cnn_has_weights=self.cnn.has_trained_weights
            )
        return self._ensemble

    async def analyze_audio(self, file_path: str) -> dict:
        """Run the complete analysis pipeline on an audio file.

        Returns a rich dict with mood, vocalization, confidence, probabilities,
        bird detection status, energy, segment details, and recommendations.
        """
        # Step 1: Full preprocessing
        processed = self.processor.full_preprocess(file_path)

        # Step 2: Segment extraction (prefer vocal regions)
        segments = self.processor.segment_vocal_regions(
            processed.bird_isolated, processed.vocal_mask
        )

        if not segments:
            return self._silent_result()

        # Step 3: Per-segment analysis
        segment_predictions: list[SegmentPrediction] = []

        # Batch CNN predictions for efficiency
        mel_patches = [
            self.processor.compute_mel_spectrogram(seg)
            for seg in segments
        ]
        cnn_available = self.cnn.has_trained_weights

        if cnn_available:
            try:
                cnn_results = self.cnn.predict_batch(mel_patches)
            except Exception:
                logger.warning("CNN batch prediction failed, falling back to statistical only")
                cnn_results = [None] * len(segments)
        else:
            logger.info("No trained CNN weights detected, using statistical-only ensemble path")
            cnn_results = [None] * len(segments)

        for i, segment in enumerate(segments):
            # Statistical features
            fv = self.feature_engine.extract(segment)
            stat_result = self.stat_classifier.classify(fv)

            # Inject RMS for energy computation in ensemble
            stat_result["rms_mean"] = fv.rms_mean

            # CNN result for this segment
            cnn_result = cnn_results[i] if cnn_results[i] is not None else None

            # Blend
            seg_pred = self.ensemble.blend_segment(
                cnn_result=cnn_result,
                stat_result=stat_result,
                segment_index=i,
            )
            # Override energy from feature vector (more accurate)
            seg_pred.energy_level = fv.rms_mean

            segment_predictions.append(seg_pred)

        # Step 4: Aggregate across segments
        final = self.ensemble.aggregate(segment_predictions)

        # Step 5: Legacy feature summary for backward compatibility
        legacy_features = self.processor.extract_features(processed.cleaned)
        quality = self.processor.get_signal_quality(legacy_features)

        # Step 6: Build rich output
        return {
            "mood": final.mood,
            "vocalization_type": final.vocalization_type,
            "confidence": final.mood_confidence,
            "energy_level": final.energy_level,
            "recommendations": final.recommendations,
            "details": {
                # Core analysis metadata
                "bird_detected": final.bird_detected,
                "bird_confidence": final.bird_confidence,
                "temporal_consistency": final.temporal_consistency,
                "vocal_activity_ratio": round(processed.vocal_ratio, 3),

                # Probability distributions
                "mood_probabilities": final.mood_probabilities,
                "vocalization_probabilities": final.vocalization_probabilities,

                # Classifier info
                "classifier_weights": final.classifier_weights,
                "cnn_weights_loaded": self.cnn.has_trained_weights,
                "model_version": "v2-ensemble",

                # Segment breakdown
                "segment_count": len(segments),
                "segment_predictions": final.segment_predictions,

                # Signal quality
                "signal_quality": quality["signal_quality"],
                "noise_profile": quality["noise_profile"],

                # Audio metadata
                "duration": round(processed.duration, 2),
                "sample_rate": processed.sample_rate,

                # Legacy feature summary
                "spectral_centroid_mean": float(np.mean(legacy_features.spectral_centroid)),
                "pitch_mean": legacy_features.pitch_mean,
                "pitch_std": legacy_features.pitch_std,
                "rms_mean": float(np.mean(legacy_features.rms_energy)),
            },
        }

    def _silent_result(self) -> dict:
        return {
            "mood": "neutral",
            "vocalization_type": "silence",
            "confidence": 0.5,
            "energy_level": 0.0,
            "recommendations": RECOMMENDATIONS["neutral"],
            "details": {
                "bird_detected": False,
                "bird_confidence": 0.0,
                "temporal_consistency": 1.0,
                "vocal_activity_ratio": 0.0,
                "mood_probabilities": {"neutral": 1.0},
                "vocalization_probabilities": {"silence": 1.0},
                "classifier_weights": {},
                "cnn_weights_loaded": False,
                "model_version": "v2-ensemble",
                "segment_count": 0,
                "segment_predictions": [],
                "signal_quality": {"score": 0.1, "label": "low"},
                "noise_profile": {"label": "low_noise", "zcr_mean": 0.0, "rms_mean": 0.0},
                "duration": 0,
                "sample_rate": self.processor.sr,
            },
        }
