"""Maps v2 binary labels (feliz/estrés) to the multi-class labels used by Project-MK-2.

The repo's BirdCNN has two heads:
  - Vocalization: 7 classes (singing, chattering, alarm, silence, distress, contact_call, beak_grinding)
  - Mood: 6 classes (happy, relaxed, stressed, scared, sick, neutral)

With only 2 source classes we use soft labels to bootstrap the model:
  - feliz  → mood: happy=0.7, relaxed=0.2, neutral=0.1
           → voc:  singing=0.6, chattering=0.3, contact_call=0.1
  - estrés → mood: stressed=0.6, scared=0.2, sick=0.1, neutral=0.1
           → voc:  distress=0.5, alarm=0.3, chattering=0.2
  - silence → mood: neutral=0.8, relaxed=0.2
            → voc:  silence=1.0

Soft labels let the model learn reasonable probability distributions
even with limited class coverage. As users label data in the app,
the model progressively refines these initial distributions.
"""

from __future__ import annotations

import numpy as np

from app.ml.bird_classifier import MOOD_LABELS, VOCALIZATION_LABELS

NUM_VOC = len(VOCALIZATION_LABELS)
NUM_MOOD = len(MOOD_LABELS)


def _label_index(labels: list[str], name: str) -> int:
    return labels.index(name)


def _soft_vector(labels: list[str], distribution: dict[str, float]) -> np.ndarray:
    """Create a soft label vector from a {class: prob} dictionary."""
    vec = np.zeros(len(labels), dtype=np.float32)
    for name, prob in distribution.items():
        vec[_label_index(labels, name)] = prob
    # Normalize to sum=1
    total = vec.sum()
    if total > 0:
        vec /= total
    return vec


# ── Pre-computed soft labels ───────────────────────────

MOOD_SOFT = {
    "feliz": _soft_vector(MOOD_LABELS, {
        "happy": 0.70,
        "relaxed": 0.20,
        "neutral": 0.10,
    }),
    "estres": _soft_vector(MOOD_LABELS, {
        "stressed": 0.60,
        "scared": 0.20,
        "sick": 0.10,
        "neutral": 0.10,
    }),
    "silencio": _soft_vector(MOOD_LABELS, {
        "neutral": 0.80,
        "relaxed": 0.20,
    }),
}

VOC_SOFT = {
    "feliz": _soft_vector(VOCALIZATION_LABELS, {
        "singing": 0.60,
        "chattering": 0.30,
        "contact_call": 0.10,
    }),
    "estres": _soft_vector(VOCALIZATION_LABELS, {
        "distress": 0.50,
        "alarm": 0.30,
        "chattering": 0.20,
    }),
    "silencio": _soft_vector(VOCALIZATION_LABELS, {
        "silence": 1.00,
    }),
}


def map_v2_label(binary_label: int, rms_energy: float = 0.05) -> tuple[np.ndarray, np.ndarray]:
    """Convert a v2 binary label to (mood_soft, voc_soft) for the repo's dual-head CNN.

    Args:
        binary_label: 0 = estrés, 1 = feliz (from v2 dataset)
        rms_energy: RMS energy of the segment. If < 0.01, treated as silence.

    Returns:
        (mood_soft_labels, vocalization_soft_labels) each of shape (N_classes,)
    """
    if rms_energy < 0.01:
        return MOOD_SOFT["silencio"], VOC_SOFT["silencio"]
    elif binary_label == 1:
        return MOOD_SOFT["feliz"], VOC_SOFT["feliz"]
    else:
        return MOOD_SOFT["estres"], VOC_SOFT["estres"]


def build_soft_labels(
    binary_labels: np.ndarray,
    rms_values: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Batch-convert v2 binary labels to soft multi-class labels.

    Args:
        binary_labels: array of 0s and 1s, shape (N,)
        rms_values: optional array of RMS energies, shape (N,)

    Returns:
        (mood_labels, voc_labels) of shapes (N, 6) and (N, 7)
    """
    n = len(binary_labels)
    mood_labels = np.zeros((n, NUM_MOOD), dtype=np.float32)
    voc_labels = np.zeros((n, NUM_VOC), dtype=np.float32)

    for i in range(n):
        rms = float(rms_values[i]) if rms_values is not None else 0.05
        mood_labels[i], voc_labels[i] = map_v2_label(int(binary_labels[i]), rms)

    return mood_labels, voc_labels
