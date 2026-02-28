"""CNN-based bird vocalization classifier using TensorFlow/Keras.

Architecture: A lightweight 2D-CNN that processes mel-spectrogram patches to classify
budgerigar vocalizations by type and mood. Designed to run on modest server hardware
and produce inference in under 500ms per segment.

The model supports two heads:
  1. Vocalization type (singing, chattering, alarm, distress, contact_call, beak_grinding, silence)
  2. Mood estimation (happy, relaxed, stressed, scared, sick, neutral)

When no pre-trained weights exist the model initialises with random weights and predictions
are blended with the statistical classifier via the ensemble layer. As labelled data is
collected through the app the model can be fine-tuned without changing the API contract.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Labels must match the enum order used in the rest of the backend
VOCALIZATION_LABELS = [
    "singing",
    "chattering",
    "alarm",
    "silence",
    "distress",
    "contact_call",
    "beak_grinding",
]

MOOD_LABELS = ["happy", "relaxed", "stressed", "scared", "sick", "neutral"]

# Spectrogram input shape: (n_mels, time_frames, 1)
N_MELS = 128
SPEC_TIME_FRAMES = 128  # ~3 s at 22050 Hz with hop_length=512
INPUT_SHAPE = (N_MELS, SPEC_TIME_FRAMES, 1)


def _build_model():
    """Build a dual-head CNN for vocalization and mood classification."""
    import tensorflow as tf  # lazy import keeps startup fast when model is unused

    inp = tf.keras.Input(shape=INPUT_SHAPE, name="mel_input")

    # --- Shared feature backbone ---
    x = tf.keras.layers.Conv2D(32, (3, 3), padding="same", activation="relu")(inp)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)
    x = tf.keras.layers.Dropout(0.25)(x)

    x = tf.keras.layers.Conv2D(64, (3, 3), padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)
    x = tf.keras.layers.Dropout(0.25)(x)

    x = tf.keras.layers.Conv2D(128, (3, 3), padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)
    x = tf.keras.layers.Dropout(0.3)(x)

    x = tf.keras.layers.Conv2D(128, (3, 3), padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.4)(x)

    shared = tf.keras.layers.Dense(256, activation="relu", name="shared_dense")(x)

    # --- Vocalization head ---
    voc_dense = tf.keras.layers.Dense(128, activation="relu")(shared)
    voc_out = tf.keras.layers.Dense(
        len(VOCALIZATION_LABELS), activation="softmax", name="vocalization"
    )(voc_dense)

    # --- Mood head ---
    mood_dense = tf.keras.layers.Dense(128, activation="relu")(shared)
    mood_out = tf.keras.layers.Dense(
        len(MOOD_LABELS), activation="softmax", name="mood"
    )(mood_dense)

    model = tf.keras.Model(inputs=inp, outputs=[voc_out, mood_out])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss={
            "vocalization": "categorical_crossentropy",
            "mood": "categorical_crossentropy",
        },
        loss_weights={"vocalization": 1.0, "mood": 0.8},
        metrics={"vocalization": "accuracy", "mood": "accuracy"},
    )
    return model


class BirdCNN:
    """Wrapper around the dual-head CNN model.

    Handles weight loading (if available) and inference on mel spectrogram patches.
    """

    def __init__(self, weights_dir: Optional[str] = None):
        self._model = None
        self._weights_loaded = False
        self._weights_dir = weights_dir or os.environ.get(
            "ML_WEIGHTS_DIR", str(Path(__file__).parent / "weights")
        )

    @property
    def model(self):
        if self._model is None:
            self._model = _build_model()
            self._try_load_weights()
        return self._model

    @property
    def has_trained_weights(self) -> bool:
        """Return True if real trained weights were loaded successfully."""
        # Force lazy init
        _ = self.model
        return self._weights_loaded

    def _try_load_weights(self):
        weights_path = Path(self._weights_dir) / "bird_classifier.weights.h5"
        if weights_path.exists():
            try:
                self._model.load_weights(str(weights_path))
                self._weights_loaded = True
                logger.info("Loaded trained bird classifier weights from %s", weights_path)
            except Exception:
                logger.warning("Failed to load weights from %s, using random init", weights_path)
                self._weights_loaded = False
        else:
            logger.info(
                "No pre-trained weights at %s — CNN predictions will be blended "
                "with statistical classifier via ensemble",
                weights_path,
            )
            self._weights_loaded = False

    def predict(self, mel_patch: np.ndarray) -> dict:
        """Run inference on a single mel spectrogram patch.

        Args:
            mel_patch: numpy array of shape (N_MELS, time_frames) — a single segment.

        Returns:
            dict with 'vocalization_probs', 'mood_probs', and decoded top labels.
        """
        patch = self._prepare_input(mel_patch)
        voc_probs, mood_probs = self.model.predict(patch, verbose=0)
        voc_probs = voc_probs[0]
        mood_probs = mood_probs[0]

        voc_idx = int(np.argmax(voc_probs))
        mood_idx = int(np.argmax(mood_probs))

        return {
            "vocalization_type": VOCALIZATION_LABELS[voc_idx],
            "vocalization_confidence": float(voc_probs[voc_idx]),
            "vocalization_probs": {
                label: float(prob)
                for label, prob in zip(VOCALIZATION_LABELS, voc_probs)
            },
            "mood": MOOD_LABELS[mood_idx],
            "mood_confidence": float(mood_probs[mood_idx]),
            "mood_probs": {
                label: float(prob)
                for label, prob in zip(MOOD_LABELS, mood_probs)
            },
        }

    def predict_batch(self, mel_patches: list[np.ndarray]) -> list[dict]:
        """Run inference on multiple mel spectrogram patches at once."""
        if not mel_patches:
            return []

        batch = np.stack([self._prepare_input(p)[0] for p in mel_patches])
        voc_probs_batch, mood_probs_batch = self.model.predict(batch, verbose=0)

        results = []
        for voc_probs, mood_probs in zip(voc_probs_batch, mood_probs_batch):
            voc_idx = int(np.argmax(voc_probs))
            mood_idx = int(np.argmax(mood_probs))
            results.append(
                {
                    "vocalization_type": VOCALIZATION_LABELS[voc_idx],
                    "vocalization_confidence": float(voc_probs[voc_idx]),
                    "vocalization_probs": {
                        label: float(prob)
                        for label, prob in zip(VOCALIZATION_LABELS, voc_probs)
                    },
                    "mood": MOOD_LABELS[mood_idx],
                    "mood_confidence": float(mood_probs[mood_idx]),
                    "mood_probs": {
                        label: float(prob)
                        for label, prob in zip(MOOD_LABELS, mood_probs)
                    },
                }
            )
        return results

    def _prepare_input(self, mel_patch: np.ndarray) -> np.ndarray:
        """Normalize and reshape a mel spectrogram for model input."""
        # Ensure correct time dimension
        if mel_patch.shape[1] < SPEC_TIME_FRAMES:
            pad_width = SPEC_TIME_FRAMES - mel_patch.shape[1]
            mel_patch = np.pad(mel_patch, ((0, 0), (0, pad_width)), mode="constant")
        elif mel_patch.shape[1] > SPEC_TIME_FRAMES:
            mel_patch = mel_patch[:, :SPEC_TIME_FRAMES]

        # Ensure correct mel dimension
        if mel_patch.shape[0] < N_MELS:
            pad_height = N_MELS - mel_patch.shape[0]
            mel_patch = np.pad(mel_patch, ((0, pad_height), (0, 0)), mode="constant")
        elif mel_patch.shape[0] > N_MELS:
            mel_patch = mel_patch[:N_MELS, :]

        # Normalize to [0, 1]
        vmin = mel_patch.min()
        vmax = mel_patch.max()
        if vmax - vmin > 1e-6:
            mel_patch = (mel_patch - vmin) / (vmax - vmin)
        else:
            mel_patch = np.zeros_like(mel_patch)

        # Add batch and channel dims
        return mel_patch[np.newaxis, ..., np.newaxis].astype(np.float32)
