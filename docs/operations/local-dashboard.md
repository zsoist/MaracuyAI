# Local Dashboard Guide

## Purpose

The local dashboard is the fastest way to validate the product loop on a Mac:

- capture or upload audio
- run local inference
- inspect the verdict and model metadata

It is a testing and demo surface, not evidence of production deployment.

## Workflow

1. start the local stack
2. open the dashboard in a browser
3. allow microphone access
4. record from the Mac or upload an audio file
5. inspect the binary verdict, confidence, and debug metadata

## Local Run

From the repo root:

```bash
./scripts/run_local_dashboard.sh
```

Then open:

```text
http://localhost:8000/dashboard/
```

## Model Selection Behavior

- if `~/Downloads/modelo_periquitos.keras` exists, the backend prefers the dedicated binary Maracuya CNN
- otherwise the backend uses the repo fallback path and the dashboard maps its broader output into `good` / `bad`

## Why This Surface Matters

The dashboard is useful portfolio evidence because it shows the project can move from:

- audio capture
- to upload
- to inference
- to persisted result

without requiring a notebook or ad hoc script execution.

## Suggested Demo Assets

- TODO: add a dashboard screenshot with a successful binary result
- TODO: add a short GIF of the microphone-recording workflow
