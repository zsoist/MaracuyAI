# HANDOFF - `claude/review-appstore-readiness`

Last updated: **February 16, 2026 (AI overhaul + UX + Guide mega-update)**

## 1) Branch Snapshot

- Repo: `git@github.com:zsoist/Project-MK-2.git`
- Branch: `claude/review-appstore-readiness-TnT7x`
- Previous branch: `codex/full-hardening-potenciacion`

This handoff is the current source-of-truth for implementation and release state.

## 2) What Was Completed In This Cycle

### 2.1 AI/ML Pipeline Overhaul (backend)

Replaced the primitive if/else heuristic classifier with a real 4-component ensemble ML system:

- **CNN dual-head classifier** (`backend/app/ml/bird_classifier.py`):
  - Conv2D x4 + BatchNorm + GlobalAvgPool + 2 softmax heads
  - Predicts vocalization type (7 classes) and mood (6 classes) simultaneously
  - Input: 128x128 mel spectrogram patches

- **Advanced feature engine** (`backend/app/ml/feature_engine.py`):
  - 100+ features: MFCCs (20 + delta + delta2), spectral (centroid, bandwidth, contrast, flatness, rolloff), pitch, energy, harmonic ratio, chroma, tonnetz
  - Bird-specific: bird_band_energy_ratio (1-8kHz), spectral_entropy, amplitude_modulation_rate

- **Statistical classifier** (`backend/app/ml/statistical_classifier.py`):
  - Gaussian log-likelihood scoring against budgerigar-specific profiles
  - 7 vocalization profiles and 6 mood profiles
  - Bird detection confidence scoring

- **Ensemble predictor** (`backend/app/ml/ensemble.py`):
  - Adaptive weights: CNN available (50/30/20), CNN unavailable (5/65/30)
  - Temporal consistency scoring, bird detection gating
  - Per-mood recommendations including no-bird-detected case

- **Enhanced audio processor** (`backend/app/services/audio_processor.py`):
  - Butterworth bandpass filter (800Hz-10kHz)
  - HPSS (Harmonic-Percussive Source Separation)
  - Adaptive noise reduction (quietest 0.5s window)
  - Voice Activity Detection

- **Rewritten ML service** (`backend/app/services/ml_service.py`):
  - Full pipeline orchestrator: preprocess → segment → per-segment (CNN + statistical) → ensemble → rich output
  - Returns bird_detected, mood_probabilities, vocalization_probabilities, segment_predictions, signal_quality

### 2.2 iOS-Style UX Overhaul (mobile)

- **HomeScreen** (`mobile/src/screens/HomeScreen.tsx`):
  - Rounded green hero header with stat badges (birds count, confidence%, energy%)
  - Dashboard card with bird detection badge, mood indicator, and mini probability chart (top 3 moods)
  - Welcome card for first-time users (no analysis) with prominent Add Bird CTA
  - Dual CTA row: Record (filled green) + Add Bird (outlined)
  - Tappable dashed-border empty state that navigates to AddParakeet

- **AnalysisResultCard** (`mobile/src/components/AnalysisResultCard.tsx`):
  - BirdDetectionBadge component (green/yellow)
  - ProbabilityBar for visual mood/vocalization breakdowns
  - Analysis metadata section (segments, consistency, vocal activity, model version)

- **HistoryScreen** (`mobile/src/screens/HistoryScreen.tsx`):
  - Bird detection warning badge, segment count, bird confidence in each history item

### 2.3 Guide Mega-Overhaul (mobile)

- **Content types** (`mobile/src/content/guide/types.ts`):
  - Added VocalizationRef, HealthCheckItem interfaces
  - Expanded GuideContent with vocalizationGuide, healthChecklist, emergencySigns sections

- **English content** (`mobile/src/content/guide/en.ts`):
  - 7 comprehensive care sections with icons
  - 7 vocalization reference items with sound, mood, and action
  - 7 health checklist items with healthy vs. warning indicators
  - Emergency signs section with 8 urgent signs and action protocol
  - 7-step how-to guide

- **Spanish content** (`mobile/src/content/guide/es.ts`):
  - Complete translation of all content above

- **GuideScreen** (`mobile/src/screens/GuideScreen.tsx`):
  - iOS-style hero header with green background
  - Collapsible care section cards with icons and chevrons
  - Vocalization reference: expandable cards with sound description, mood, and action
  - Health checklist: card with green/red indicators per body area
  - Emergency red box with warning signs and action protocol
  - How-to card and safety disclaimer

### 2.4 i18n Updates

- Added 9 new HomeScreen keys to `en.ts` and `es.ts` (stat badges, welcome card, CTA labels, a11y)
- Added 9 analysis detail keys (bird detection, confidence, segments, probabilities)
- Updated AI model label to "Ensemble v2 (CNN + Statistical + Temporal)"

### 2.5 Backend Fixes

- Fixed hardcoded Spanish alert messages in `analysis_service.py` to English
- Added bird-not-detected alert type
- Added `backend/app/ml/weights/.gitkeep` for CNN model weights

## 3) Current Runtime Architecture

### 3.1 Backend

Core routes:
- `/api/v1/auth/*`
- `/api/v1/parakeets/*`
- `/api/v1/recordings/*`
- `/api/v1/analysis/*`
- `/api/v1/context/*`

ML pipeline:
- AudioProcessor → FeatureEngine → StatisticalClassifier → BirdCNN → EnsemblePredictor
- Orchestrated by MLService

Identity model:
- Guest mode via `X-Guest-Id` + `X-Guest-Secret`
- Account mode via `Authorization: Bearer <jwt>`
- Domain data ownership via `AuthContext.owner_id`

Context providers:
- weather: NOAA -> Open-Meteo fallback
- AQI: AirNow (if key) -> Open-Meteo fallback

### 3.2 Mobile

Main app tabs:
- Home (iOS-style dashboard with stats, CTA, bird detection)
- Record
- History (with bird detection badges)
- Guide (collapsible sections, vocalization decoder, health checklist, emergency box)
- Settings

State/services:
- Zustand global store
- Axios API client with auth/guest headers
- SecureStore for auth token, guest id, guest secret, language preference

## 4) Environment and Runbook

### 4.1 Backend local dev

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Optional migration workflow:

```bash
cd backend
alembic upgrade head
```

### 4.2 Mobile local dev

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

For physical device testing:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_MAC_LAN_IP>:8000/api/v1
```

## 5) Validation Status

Latest validation on this branch:

```bash
python3 -m compileall backend/app backend/migrations backend/scripts
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile audit --audit-level=high
```

## 6) Remaining Risks / Non-Blockers

- CNN weights are placeholder (statistical classifier provides fallback).
- No automated backend/mobile test suite yet (unit/integration/e2e gap).
- Redis rate limiting must be enabled in production config.
- Operational migration execution must still be performed in target environments.

## 7) iOS Release Verdict (Updated)

Status: **CONDITIONALLY READY**

Why not fully READY yet:
- CNN model needs training on real budgerigar vocalization dataset (statistical fallback works in the meantime).
- Operational migration steps must be executed in target environment.
- Test coverage remains below production-hardening expectations.

## 8) Recommended Next Steps

1. Train CNN on labeled budgerigar audio dataset and place weights in `backend/app/ml/weights/`.
2. Execute migration + normalization in staging.
3. Add backend integration tests for ML pipeline.
4. Add mobile smoke tests for guide rendering and analysis flow.
5. Polish AddParakeetScreen and RecordScreen visual design.
6. Run full iOS build + TestFlight validation.

## 9) Documentation Updated In This Cycle

- `HANDOFF.md` (this file)
- `README.md` (updated with ensemble ML architecture, new features)
- `mockup.html` (updated with new UI sections)
- Guide content: `mobile/src/content/guide/en.ts`, `es.ts`, `types.ts`
