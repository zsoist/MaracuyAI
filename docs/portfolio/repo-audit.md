# Repository Audit

## Audit Summary

MaracuyAI is strongest as a personalized bioacoustic classification prototype built around a specific bird, a specific caregiver problem, and a working local inference loop. The repo contains real engineering work across backend, client, model integration, and local operations, but it also carries older "wellness platform" scope that is broader than the current product definition.

This audit is intentionally evidence-based and conservative. It focuses on what the repository demonstrates today, not on what it could someday become.

## What Is Technically Real And Present

### End-to-end backend

- FastAPI application with routes for auth, parakeets, recordings, analysis, and optional context
- SQLAlchemy models and Alembic migrations
- upload pipeline for WAV, MP3, M4A/MP4, OGG, FLAC, WebM, AAC, and CAF
- Postgres-backed persistence for recordings and analysis results
- guest-mode auth flow that enables friction-light local testing

### Model and inference work

- repo-native preprocessing and inference orchestration in `backend/app/services/`
- legacy multi-class / ensemble ML path in `backend/app/ml/`
- training utilities in `backend/app/ml/training/`
- dedicated binary Maracuya adapter that loads an external `.keras` artifact when present
- local model-selection logic that prefers the dedicated binary classifier when available

### User-facing surfaces

- Expo / React Native mobile app with recording, history, profile, and settings flows
- local browser dashboard served by the backend for fast desktop testing
- operator-friendly "Mac microphone + phone playback" local loop

### Operational setup

- Docker-based local stack
- scriptable local startup
- docs for local use, model framing, and architecture

## What Is Partially Implemented

- binary product framing is clear in docs and local dashboard, but parts of the API and mobile app still expose legacy mood-centric concepts
- binary CNN integration is real, but the trained model artifact is not committed to the repo
- training code exists, but repo-published evaluation artifacts are limited
- client surfaces work locally, but there is no strong evidence of hardened production deployment

## What Is Legacy Or Overbuilt Relative To The Current Product

- wider "wellness platform" framing
- multi-mood taxonomy in the legacy backend and mobile surfaces
- weather / AQI / habitat context systems
- alerts and summary flows that depend on broader interpretations than the core binary task needs

These features are not fake, but they are not the strongest foundation for the current portfolio narrative. They should be framed as historical or experimental scope, not as the main story.

## Prototype Capability Vs Validated Capability

### Credible prototype capability

- local recording and upload flow
- audio normalization and storage
- model selection and inference routing
- binary verdict display on the dashboard
- integration between model output, API payloads, persistence, and UI

### Not yet validated by repo evidence

- benchmarked model performance
- reproducible evaluation report committed in-repo
- production-grade model monitoring or regression testing
- generalized bird classification capability
- medical or veterinary diagnostic value

## What Supports A Strong Portfolio Narrative

- narrow real-world problem definition
- collaborative origin around a concrete use case
- applied audio ML rather than generic CRUD work
- evidence of architecture thinking beyond the model itself
- clear local test harness that turns experimentation into a usable workflow
- enough implementation breadth to show full-stack and ML integration skill

## What Weakens Credibility

- lingering platform-scale language around wellness, context, and alerts
- lack of published evaluation artifacts
- locally mounted trained model rather than a repo-versioned model artifact
- absence of an automated backend test suite
- documentation that previously read more like internal reset notes than public technical narrative

## Positioning Decision

The strongest honest framing is:

> MaracuyAI is a collaborative applied ML prototype for personalized bird-vocalization classification, with real backend/client/inference integration and a still-maturing evaluation story.

That framing highlights the repo's strongest evidence while staying honest about maturity and limitations.
