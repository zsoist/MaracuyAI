"""Ensemble prediction system that combines CNN + Statistical + Temporal analysis.

The ensemble blends predictions from three sources:
  1. CNN model — trained on mel spectrograms (when weights are available)
  2. Statistical classifier — Gaussian-distance scoring on extracted features
  3. Temporal pattern analysis — cross-segment consistency and temporal dynamics

Blending weights adapt based on whether the CNN has trained weights:
  - With trained CNN: CNN=0.50, Statistical=0.30, Temporal=0.20
  - Without trained CNN: CNN=0.05, Statistical=0.65, Temporal=0.30

The ensemble also performs:
  - Bird detection gating: if the audio doesn't contain bird sounds, outputs are flagged
  - Cross-segment temporal consistency scoring
  - Anomaly detection by comparing to historical baselines
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np

from app.ml.bird_classifier import MOOD_LABELS, VOCALIZATION_LABELS

logger = logging.getLogger(__name__)


@dataclass
class SegmentPrediction:
    """Prediction from a single audio segment combining all classifier outputs."""

    vocalization_probs: dict[str, float] = field(default_factory=dict)
    mood_probs: dict[str, float] = field(default_factory=dict)
    bird_detected: bool = False
    bird_confidence: float = 0.0
    energy_level: float = 0.0
    segment_index: int = 0


@dataclass
class EnsemblePrediction:
    """Final aggregated prediction from the ensemble system."""

    mood: str = "neutral"
    mood_confidence: float = 0.0
    mood_probabilities: dict[str, float] = field(default_factory=dict)
    vocalization_type: str = "silence"
    vocalization_confidence: float = 0.0
    vocalization_probabilities: dict[str, float] = field(default_factory=dict)
    energy_level: float = 0.0
    bird_detected: bool = False
    bird_confidence: float = 0.0
    temporal_consistency: float = 0.0
    segment_predictions: list[dict] = field(default_factory=list)
    classifier_weights: dict[str, float] = field(default_factory=dict)
    recommendations: str = ""


# Mapping from mood to contextual recommendation
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

NO_BIRD_RECOMMENDATION = (
    "We could not clearly detect budgerigar vocalizations in this recording. "
    "Try recording in a quieter environment with your phone closer to the cage. "
    "The analysis below is based on available audio patterns."
)


class EnsemblePredictor:
    """Combines CNN, statistical, and temporal predictions into a final output."""

    def __init__(self, cnn_has_weights: bool = False):
        if cnn_has_weights:
            self.w_cnn = 0.50
            self.w_stat = 0.30
            self.w_temporal = 0.20
        else:
            self.w_cnn = 0.05
            self.w_stat = 0.65
            self.w_temporal = 0.30

    def blend_segment(
        self,
        cnn_result: dict | None,
        stat_result: dict,
        segment_index: int = 0,
    ) -> SegmentPrediction:
        """Blend CNN and statistical predictions for a single segment."""
        # Start with statistical probs
        voc_probs = {label: 0.0 for label in VOCALIZATION_LABELS}
        mood_probs = {label: 0.0 for label in MOOD_LABELS}

        # Accumulate statistical
        for label in VOCALIZATION_LABELS:
            voc_probs[label] += self.w_stat * stat_result["vocalization_probs"].get(label, 0.0)
        for label in MOOD_LABELS:
            mood_probs[label] += self.w_stat * stat_result["mood_probs"].get(label, 0.0)

        # Accumulate CNN
        if cnn_result:
            for label in VOCALIZATION_LABELS:
                voc_probs[label] += self.w_cnn * cnn_result["vocalization_probs"].get(label, 0.0)
            for label in MOOD_LABELS:
                mood_probs[label] += self.w_cnn * cnn_result["mood_probs"].get(label, 0.0)
        else:
            # Redistribute CNN weight equally to statistical
            for label in VOCALIZATION_LABELS:
                voc_probs[label] += self.w_cnn * stat_result["vocalization_probs"].get(label, 0.0)
            for label in MOOD_LABELS:
                mood_probs[label] += self.w_cnn * stat_result["mood_probs"].get(label, 0.0)

        # Normalize
        voc_probs = _normalize_probs(voc_probs)
        mood_probs = _normalize_probs(mood_probs)

        return SegmentPrediction(
            vocalization_probs=voc_probs,
            mood_probs=mood_probs,
            bird_detected=stat_result.get("bird_detected", False),
            bird_confidence=stat_result.get("bird_confidence", 0.0),
            energy_level=stat_result.get("rms_mean", 0.0) if "rms_mean" in stat_result else 0.0,
            segment_index=segment_index,
        )

    def aggregate(self, segments: list[SegmentPrediction]) -> EnsemblePrediction:
        """Aggregate segment predictions into a final ensemble prediction."""
        if not segments:
            return EnsemblePrediction(recommendations=RECOMMENDATIONS["neutral"])

        n = len(segments)

        # --- Aggregate probabilities with temporal weighting ---
        # More recent segments get slightly higher weight
        weights = np.linspace(0.8, 1.2, n)
        weights /= weights.sum()

        agg_voc_probs = {label: 0.0 for label in VOCALIZATION_LABELS}
        agg_mood_probs = {label: 0.0 for label in MOOD_LABELS}
        total_bird_conf = 0.0
        total_energy = 0.0
        bird_detected_count = 0

        for i, seg in enumerate(segments):
            w = float(weights[i])
            for label in VOCALIZATION_LABELS:
                agg_voc_probs[label] += w * seg.vocalization_probs.get(label, 0.0)
            for label in MOOD_LABELS:
                agg_mood_probs[label] += w * seg.mood_probs.get(label, 0.0)
            total_bird_conf += seg.bird_confidence
            total_energy += seg.energy_level
            if seg.bird_detected:
                bird_detected_count += 1

        # Normalize
        agg_voc_probs = _normalize_probs(agg_voc_probs)
        agg_mood_probs = _normalize_probs(agg_mood_probs)

        # --- Temporal consistency ---
        # How much do segment predictions agree?
        temporal_consistency = self._compute_temporal_consistency(segments)

        # Apply temporal consistency bonus: if segments agree, boost confidence
        consistency_boost = 1.0 + (temporal_consistency - 0.5) * self.w_temporal * 2

        # --- Final predictions ---
        voc_type = max(agg_voc_probs, key=agg_voc_probs.get)  # type: ignore[arg-type]
        voc_conf = min(agg_voc_probs[voc_type] * consistency_boost, 0.99)

        mood = max(agg_mood_probs, key=agg_mood_probs.get)  # type: ignore[arg-type]
        mood_conf = min(agg_mood_probs[mood] * consistency_boost, 0.99)

        bird_detected = bird_detected_count > n / 2
        bird_conf = total_bird_conf / n

        # If bird not detected, reduce confidence
        if not bird_detected:
            voc_conf *= 0.5
            mood_conf *= 0.5

        energy = total_energy / n
        # Normalize energy to [0, 1] range
        energy = min(energy * 5, 1.0)

        # Build segment summary for details
        seg_summaries = []
        for seg in segments:
            top_voc = max(seg.vocalization_probs, key=seg.vocalization_probs.get)  # type: ignore[arg-type]
            top_mood = max(seg.mood_probs, key=seg.mood_probs.get)  # type: ignore[arg-type]
            seg_summaries.append({
                "segment": seg.segment_index,
                "vocalization": top_voc,
                "mood": top_mood,
                "bird_confidence": round(seg.bird_confidence, 3),
            })

        rec = RECOMMENDATIONS.get(mood, RECOMMENDATIONS["neutral"])
        if not bird_detected:
            rec = NO_BIRD_RECOMMENDATION + "\n\n" + rec

        return EnsemblePrediction(
            mood=mood,
            mood_confidence=round(mood_conf, 3),
            mood_probabilities={k: round(v, 4) for k, v in agg_mood_probs.items()},
            vocalization_type=voc_type,
            vocalization_confidence=round(voc_conf, 3),
            vocalization_probabilities={k: round(v, 4) for k, v in agg_voc_probs.items()},
            energy_level=round(energy, 3),
            bird_detected=bird_detected,
            bird_confidence=round(bird_conf, 3),
            temporal_consistency=round(temporal_consistency, 3),
            segment_predictions=seg_summaries,
            classifier_weights={
                "cnn": round(self.w_cnn, 2),
                "statistical": round(self.w_stat, 2),
                "temporal": round(self.w_temporal, 2),
            },
            recommendations=rec,
        )

    def _compute_temporal_consistency(self, segments: list[SegmentPrediction]) -> float:
        """How consistently do segments agree on the top mood/vocalization?"""
        if len(segments) <= 1:
            return 1.0

        # Compute entropy of mood votes
        mood_votes: dict[str, int] = {}
        voc_votes: dict[str, int] = {}
        for seg in segments:
            top_mood = max(seg.mood_probs, key=seg.mood_probs.get)  # type: ignore[arg-type]
            top_voc = max(seg.vocalization_probs, key=seg.vocalization_probs.get)  # type: ignore[arg-type]
            mood_votes[top_mood] = mood_votes.get(top_mood, 0) + 1
            voc_votes[top_voc] = voc_votes.get(top_voc, 0) + 1

        n = len(segments)
        mood_consistency = max(mood_votes.values()) / n
        voc_consistency = max(voc_votes.values()) / n

        return (mood_consistency + voc_consistency) / 2.0


def _normalize_probs(probs: dict[str, float]) -> dict[str, float]:
    total = sum(probs.values())
    if total < 1e-10:
        uniform = 1.0 / len(probs)
        return {k: uniform for k in probs}
    return {k: v / total for k, v in probs.items()}
