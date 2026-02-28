"""Training utilities for the Parakeet Wellness AI model.

Provides tools to re-train the BirdCNN dual-head classifier using
v2 Maracuyá audio data (binary feliz/estrés labels mapped to the
repo's multi-class label set via soft labels).

Modules:
  - label_mapper: Maps v2 binary labels to soft multi-class labels
  - train_from_v2_data: Full training pipeline from v2 audio data
"""
