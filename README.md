# MaracuyAI

MaracuyAI is a personalized audio classifier for one bird: `Maracuya`.

The product goal is simple:

- a user records or uploads audio of Maracuya
- the system analyzes the sound
- the system returns a binary result: `good` or `bad`
- the response includes a confidence score

This repository currently contains a larger mobile + backend codebase, but that is no longer the product definition. From this point forward, the source of truth is a narrower scope: a reliable binary classifier first, a thin client second.

## Core Product Definition

MaracuyAI answers one question:

`Does Maracuya sound okay, or stressed/negative?`

That means the real value of the project is:

- the dataset
- the labeling quality
- the model and evaluation pipeline
- the inference contract

The UI is important, but it is not the core IP.

## V1 Scope

Version 1 should do only this:

1. Accept a short audio recording.
2. Run a binary classifier specialized for Maracuya.
3. Return:
   - `good` or `bad`
   - confidence score
   - optional short explanation
4. Store enough metadata to review model performance later.

## Not V1

These are explicitly out of scope for the first real version:

- generalized bird wellness platform
- 6-class or 7-class emotional taxonomy
- veterinary diagnosis
- multi-bird identity recognition
- weather and AQI reasoning
- complex app tabs and platform-specific polish before model validation

## Product Principle

This is a `model-first` project.

The order of importance is:

1. data
2. labels
3. evaluation
4. inference API
5. client UX

If the binary classifier is not trustworthy, the rest of the product does not matter yet.

## Recommended System Shape

The target system is intentionally simple:

- `data/` process and dataset definitions
- `model/` training, evaluation, and experiment tracking
- `api/` inference endpoint returning `good|bad + confidence`
- `client/` thin recording/upload interface

The current repository still has a broader structure under `backend/` and `mobile/`. That code can be reused, but the product definition is now narrower than the current implementation.

## Current Reality

What already exists:

- mobile app shell
- FastAPI backend
- audio preprocessing pipeline
- CNN-related code
- statistical fallback code
- training scripts

What still needs to be made rigorous:

- binary label definition
- dataset split strategy
- evaluation protocol
- baseline metrics
- clear promotion criteria for a trained model

## Documentation

The new source-of-truth docs are:

- [docs/product/definition.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/product/definition.md)
- [docs/architecture/system-design.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/architecture/system-design.md)
- [docs/data/labeling-guide.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/data/labeling-guide.md)
- [docs/model/training-and-evaluation.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/model/training-and-evaluation.md)
- [docs/planning/integration-plan.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/planning/integration-plan.md)
- [docs/operations/execution-guide.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/operations/execution-guide.md)
- [docs/operations/local-dashboard.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/operations/local-dashboard.md)
- [docs/deployment/hosting-guide.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/deployment/hosting-guide.md)

See [docs/README.md](/Users/daniel/CODEX/MaracuyaAI%20CODEX/docs/README.md) for the full map.
