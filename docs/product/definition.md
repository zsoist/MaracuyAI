# Product Definition

## One-Sentence Definition

MaracuyAI is a personalized audio-classification system that helps classify whether `Maracuya` sounds okay or stressed based on recorded vocalizations.

## Product Question

The entire product should stay anchored to one question:

> Does this recording sound okay, or does it sound stressed / negative?

That framing is intentionally narrower than a generalized bird-health or emotion platform.

## Problem

Caretakers often notice changes in a bird's vocal behavior before they can explain them precisely. Those judgments are subjective and inconsistent. MaracuyAI turns that ambiguity into a binary ML task so recordings can be reviewed more systematically.

## Primary User

The owner or caretaker of Maracuya, or a close collaborator helping evaluate the recordings and model behavior.

## Intended User Flow

1. capture or upload an audio clip
2. run inference
3. return a binary answer plus confidence
4. retain enough metadata to review results over time

## V1 Output Contract

The product-facing contract should remain simple:

- `label`: `good` or `bad`
- `confidence`: `0.0` to `1.0`
- `model_version`: identifier of the active inference path
- `recording_id`: traceable identifier for later review
- `notes`: optional short explanation or operational context

## Success Criteria

The project is succeeding when it can:

- outperform chance on held-out recordings
- behave consistently on similar repeated samples
- stay understandable to a non-technical caretaker
- support a clean recording-to-result loop without requiring notebook access

## Non-Goals

This project should not currently be framed as:

- veterinary diagnosis
- generalized species classification
- multi-bird identity recognition
- full emotional-state modeling
- a broad pet-health platform

## Product Position

MaracuyAI is best positioned as:

- a model-first prototype
- a personalized bioacoustic classification project
- a serious applied ML workflow wrapped in usable local interfaces

The repo may contain broader historical features, but they are secondary to this definition.
