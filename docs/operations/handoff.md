# HANDOFF - Parakeet Wellness AI

Last updated: **March 9, 2026 (main branch normalization + repository cleanup)**

## 1) Branch Snapshot

- Repo: `git@github.com:zsoist/MaracuyAI.git`
- Branch: `main`
- Previous branch: `claude/integrate-new-model-RgYYF`

This handoff is the current source-of-truth for implementation and release state.

## 2) What Was Completed

### 2.1 AI/ML Pipeline (backend)

Full 4-component ensemble ML system:

- **CNN dual-head classifier** (`backend/app/ml/bird_classifier.py`):
  - Conv2D x4 + BatchNorm + GlobalAvgPool + 2 softmax heads
  - Predicts vocalization type (7 classes) and mood (6 classes) simultaneously
  - Input: 128x128 mel spectrogram patches
  - Lazy model loading (TensorFlow imported only when needed)

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

- **ML service** (`backend/app/services/ml_service.py`):
  - Full pipeline orchestrator: preprocess -> segment -> per-segment (CNN + statistical) -> ensemble -> rich output
  - Returns bird_detected, mood_probabilities, vocalization_probabilities, segment_predictions, signal_quality

### 2.2 Training Pipeline Integration (NEW)

Training module at `backend/app/ml/training/`:

- **`label_mapper.py`**: Maps v2 binary labels (feliz/estres) to soft multi-class labels. Imports labels directly from `bird_classifier.py` (always in sync).
- **`train_from_v2_data.py`**: Full training pipeline. Imports `_build_model()` from `bird_classifier.py` (architecture always identical to inference).

Key improvements:
- No label duplication between training and inference
- No model architecture duplication between training and inference
- Training dependencies (`matplotlib`, `scikit-learn`) added to `requirements.txt`

### 2.3 iOS-Style UX (mobile)

- **HomeScreen**: Rounded green hero header with stat badges, dashboard card with bird detection badge, mood indicator, probability chart, dual CTA
- **GuideScreen**: 7 care sections, vocalization reference (7 cards), health checklist (7 items), emergency signs, how-to guide
- **AnalysisResultCard**: BirdDetectionBadge, ProbabilityBar, analysis metadata
- **HistoryScreen**: Bird detection badges, segment count, bird confidence per item

### 2.4 Full Feature Set

- Guest-first identity (account optional)
- Bilingual UX (English + Spanish)
- Context engine (weather + AQI with provider fallback)
- Rate limiting (memory + Redis modes)
- Account lifecycle (merge, export, delete)
- Audio validation (type, size, duration)

## 3) Current Runtime Architecture

### 3.1 Backend

```
backend/
├── app/
│   ├── main.py              # FastAPI + lifespan
│   ├── api/routes/           # auth, parakeets, recordings, analysis, context
│   ├── core/                 # config, database, security, rate_limit, migrations
│   ├── models/               # User, Parakeet, Recording, AnalysisResult, HabitatProfile, EnvironmentSnapshot, RiskEvent
│   ├── services/             # ml_service, audio_processor, analysis_service, context_service, storage_service, parakeet_service, recording_service
│   ├── ml/
│   │   ├── bird_classifier.py       # CNN dual-head
│   │   ├── ensemble.py              # Prediction blending
│   │   ├── feature_engine.py        # 100+ features
│   │   ├── statistical_classifier.py # Gaussian scoring
│   │   ├── training/                # Training pipeline
│   │   │   ├── label_mapper.py      # v2 -> multi-class labels
│   │   │   └── train_from_v2_data.py # Full training script
│   │   └── weights/                 # Trained model weights
│   └── jobs/                 # context_refresh background task
├── migrations/               # Alembic
├── docker-compose.yml        # API + PostgreSQL + Redis
├── Dockerfile
└── requirements.txt
```

ML pipeline: AudioProcessor -> FeatureEngine -> StatisticalClassifier -> BirdCNN -> EnsemblePredictor (orchestrated by MLService)

Identity model:
- Guest mode via `X-Guest-Id` + `X-Guest-Secret`
- Account mode via `Authorization: Bearer <jwt>`

### 3.2 Mobile

```
mobile/src/
├── screens/         # Home, Record, History, Settings, Guide, ParakeetProfile, AddParakeet, Login
├── components/      # AnalysisResultCard, AlertFeed, ContextCard, RecordingQualityMeter, WellnessChart, MoodIndicator, ParakeetCard, TipBanner, ParakeetTargetSelector
├── hooks/           # useAuth, useHomeDashboard, useRecordAnalysis, useRecordingQuality
├── services/        # api.ts (Axios client)
├── store/           # useStore.ts (Zustand)
├── i18n/            # en.ts, es.ts (full bilingual)
├── content/guide/   # en.ts, es.ts, types.ts
├── config/          # env.ts (feature flags)
├── theme/           # tokens.ts, accessibility.ts
└── types/           # index.ts, navigation.ts
```

## 4) Validation Status

Full audit completed (February 28, 2026):

- **Backend Python (42 files)**: 0 syntax errors, 0 import errors, 0 circular dependencies, 0 type mismatches
- **Mobile TypeScript**: 0 critical issues, 0 missing components, 0 navigation errors, 0 i18n key mismatches
- **Label consistency**: MoodType enum (6) = MOOD_LABELS = soft label distributions = statistical profiles
- **Label consistency**: VocalizationType enum (7) = VOCALIZATION_LABELS = soft label distributions = statistical profiles
- **Training module**: Imports verified, architecture sync confirmed

## 5) Remaining Work

- Train CNN on real budgerigar audio dataset and place weights in `backend/app/ml/weights/`
- Execute Alembic migration in staging/production
- Add backend integration tests for ML pipeline
- Add mobile smoke tests for guide rendering and analysis flow
- Run full iOS build + TestFlight validation
- Configure Redis rate limit backend in production

## 6) Quick Start

```bash
# Backend
cd backend && cp .env.example .env && docker compose up --build

# Mobile
cd mobile && cp .env.example .env && npm install && npx expo start

# Train CNN (optional)
cd backend
python -m app.ml.training.train_from_v2_data \
    --data-dir /path/to/Archivos_audio \
    --output-dir ./app/ml/weights \
    --augment
```

## 7) Documentation

- `README.md` - Full product documentation
- `docs/operations/handoff.md` - This file (implementation state)
- `docs/operations/execution-guide.md` - Step-by-step training guide
- `docs/deployment/hosting-guide.md` - Deployment options (local, Oracle, Hetzner)
- `docs/planning/integration-plan.md` - v2 -> v3 migration analysis
