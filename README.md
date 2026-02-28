# Parakeet Wellness AI

A mobile + backend system that helps parakeet owners monitor vocal behavior trends with AI-assisted audio analysis.

This is an iOS-first product (Android is supported as parity where possible).

## 1. Beginner TL;DR (No Technical Background Needed)

If you do not code, this is the simple version:

1. You add your parakeet profile in the app.
2. You record your bird's sounds (or upload audio).
3. The app sends audio to the server.
4. The server analyzes signal patterns and returns:
- mood estimate (happy, relaxed, stressed, scared, sick, neutral)
- confidence score
- energy level
- vocalization type (singing, chattering, alarm, silence, distress, contact call, beak grinding)
- bird detection confidence
- mood and vocalization probability breakdowns
- recommendations
5. The app stores history so you can see trends over time.
6. The app can also add environmental context (weather + AQI) if habitat coordinates are configured.

Important: this app is educational and trend-based support. It does **not** replace an avian veterinarian.

## 2. What The Product Can Do Today

### Mobile capabilities
- Guest-first onboarding (account optional).
- Optional account register/login.
- Guest to account merge (data continuity).
- Add/edit parakeets and upload profile photos.
- **iOS-style dashboard HomeScreen** with stat badges, mood probability mini-chart, bird detection badges, and dual CTA (Record + Add Bird).
- Welcome card for first-time users with prominent Add Bird onboarding.
- Record audio in-app.
- Upload audio files from device.
- Analyze recordings and view results with probability breakdowns.
- View analysis history with bird detection status and segment info.
- **Comprehensive Guide tab** with:
  - 7 collapsible care sections with icons (Species, Habitat, Nutrition, Daily Care, Behavior, Risks, Enrichment).
  - Vocalization Reference: 7 interactive cards explaining each vocalization type.
  - Health Checklist: 7-point daily health check with healthy vs. warning indicators.
  - Emergency Signs: red box with 8 urgent signs and action protocol.
  - How to Use guide and safety disclaimer.
- Full bilingual UX: English + Spanish.
- Language auto-detect + manual override persisted in SecureStore.
- In-app educational tip banners on Home/Record/History/Settings.
- Account deletion action from Settings.

### Backend capabilities
- FastAPI REST API with PostgreSQL.
- Guest identity via `X-Guest-Id` + `X-Guest-Secret` and account identity via JWT Bearer token.
- Ownership enforcement for parakeets, recordings, analyses.
- Audio upload validation:
  - file type checks
  - size limits
  - minimum/maximum duration
  - invalid/no-signal rejection
- Context engine with provider fallback:
  - NOAA -> Open-Meteo (weather)
  - AirNow (if API key) -> Open-Meteo AQI
- Background context refresh loop (feature-flag controlled).
- Canonical media URL serving via `/media`.
- Legacy recording paths self-heal to canonical media paths on read.
- Rate limiting supports memory mode and Redis shared mode.
- Account lifecycle endpoints:
  - merge guest data
  - export account data
  - delete account and media

## 3. AI / Machine Learning Capabilities (Detailed But Simple)

This section explains the current AI layer in plain language.

### 3.1 What kind of AI is currently implemented

Current analysis is a 4-component ensemble ML stack:

1. **CNN dual-head classifier** (TensorFlow/Keras): Conv2D x4 with BatchNorm, trained on mel spectrograms to predict vocalization type and mood simultaneously.
2. **Statistical classifier**: Gaussian log-likelihood scoring against budgerigar-specific acoustic profiles for each mood and vocalization class.
3. **Advanced feature engine**: Extracts 100+ audio features (MFCCs + deltas, spectral features, pitch, energy, bird-band energy ratio, harmonic ratio, chroma, tonnetz, and more).
4. **Ensemble predictor**: Blends CNN + Statistical + Temporal predictions with adaptive weights. CNN available: 50/30/20 weighting. CNN unavailable: 5/65/30.

### 3.2 Audio analysis pipeline (step by step)

When audio reaches the backend, this happens:

1. **Load + normalize audio**
   - convert to mono target rate
   - normalize amplitude
   - adaptive noise reduction (quietest 0.5s window)

2. **Bandpass filter**
   - Butterworth filter 800Hz-10kHz (budgerigar vocal range)

3. **HPSS (Harmonic-Percussive Source Separation)**
   - Isolate bird vocalizations from percussive noise

4. **Voice Activity Detection (VAD)**
   - Identify vocal segments vs. silence

5. **Segment vocal regions**
   - Split into meaningful windows for per-segment analysis

6. **Per-segment processing**
   - Mel spectrogram -> CNN prediction (vocalization + mood)
   - Feature extraction -> Statistical classifier prediction
   - Temporal consistency scoring across segments
   - Bird detection confidence scoring

7. **Ensemble aggregation**
   - Blend all classifiers with adaptive weights
   - Apply bird detection gating (halves confidence if no bird detected)
   - Generate mood probabilities, vocalization probabilities
   - Produce recommendations per detected mood

8. **Return rich output**
   - mood, vocalization_type, confidence, energy_level, recommendations
   - bird_detected, bird_confidence, temporal_consistency, vocal_activity_ratio
   - mood_probabilities, vocalization_probabilities, classifier_weights
   - segment_predictions, signal_quality, model_version

### 3.3 Why this AI design is useful

- Ensemble approach is robust even without trained CNN weights (statistical fallback).
- Bird detection prevents false readings from non-bird audio.
- Temporal consistency scoring catches erratic/noisy segments.
- Outputs are explainable (you can trace why a result happened).
- Strong foundation for future model training with real-world data.

### 3.4 What AI does NOT do yet

- It does not diagnose disease.
- It does not identify exact individual bird voices automatically in mixed audio.
- CNN weights are placeholder until trained on real budgerigar dataset.
- It does not guarantee medical-grade precision.

### 3.5 Planned AI evolution

Roadmap direction:
- Train CNN on labeled budgerigar vocalization dataset
- hybrid reasoning (rules + richer model outputs + context)
- better confidence handling and explainability
- smarter discovery/watchlist behavior
- improved robustness and telemetry

## 4. System Architecture

Monorepo root:
- `backend/` - Python FastAPI server
- `mobile/` - Expo / React Native app

### Backend stack
- Python 3.12
- FastAPI
- SQLAlchemy async + PostgreSQL
- librosa, noisereduce, scipy, tensorflow

### Mobile stack
- Expo / React Native / TypeScript
- React Navigation
- Zustand
- Axios
- Expo SecureStore

## 5. API Overview

Base prefix: `/api/v1`

### Auth / identity
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/merge-guest`
- `GET /auth/export-data`
- `DELETE /auth/me`

### Parakeets
- `POST /parakeets/`
- `GET /parakeets/`
- `GET /parakeets/{id}`
- `PUT /parakeets/{id}`
- `DELETE /parakeets/{id}`
- `POST /parakeets/{id}/photo`

### Recordings / analysis
- `POST /recordings/upload`
- `GET /recordings/`
- `GET /recordings/{id}`
- `DELETE /recordings/{id}`
- `POST /analysis/analyze`
- `GET /analysis/history/{parakeet_id}`
- `GET /analysis/summary/{parakeet_id}`
- `GET /analysis/alerts`

### Context engine
- `GET /context/habitat`
- `PUT /context/habitat`
- `POST /context/refresh`
- `GET /context/current`
- `GET /context/history`
- `GET /context/risk-events`

## 6. Quick Start (Step-by-Step)

## 6.1 Start backend

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Backend URL:
- `http://localhost:8000`
- docs: `http://localhost:8000/docs`

## 6.2 Start mobile app

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

If testing on a physical phone:
- set `EXPO_PUBLIC_API_BASE_URL` to your Mac LAN IP, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:8000/api/v1
```

## 6.3 First realistic user flow

1. Launch app (guest mode is automatic).
2. Open `Settings` and set language if needed.
3. Add a parakeet via the prominent "Add Bird" button on Home.
4. Upload photo in profile.
5. Open `Guide` and explore care sections, vocalization reference, and health checklist.
6. Open `Record`, select target bird, record 30+ seconds.
7. Review analysis result: mood, vocalization type, probability breakdowns, bird detection status.
8. Check `History` weekly for trend direction.
9. Optionally configure habitat coordinates for context alerts.

## 7. Configuration Notes

### Backend `.env`
Key variables:
- `DATABASE_URL`
- `SECRET_KEY`
- `DEBUG`
- `ENFORCE_ALEMBIC_HEAD`
- `UPLOAD_DIR`
- `CORS_ORIGINS`
- `AUDIO_MIN_DURATION_SECONDS`
- rate limit settings (`RATE_LIMIT_*`)
- feature flags (`FEATURE_*`)
- context settings (`AIRNOW_API_KEY`, `CONTEXT_*`)

### Mobile `.env`
Key variables:
- `EXPO_PUBLIC_API_BASE_URL`
- mobile feature flags (`EXPO_PUBLIC_FEATURE_*`)

## 8. Security and Privacy Notes

Implemented:
- secure token and guest id storage (SecureStore)
- secure per-device guest secret storage (SecureStore)
- ownership checks per user context
- input validation on uploads and auth payloads
- account data export endpoint
- account deletion endpoint
- release-env prebuild gate for EAS profiles (`check-release-env`)

Still recommended before App Store release:
- execute Alembic migrations in target release environments
- run one-time legacy media normalization script for faster backfill reporting (optional but recommended)
- configure Redis rate limit backend in production
- run iOS regression sweep for Expo 54 build profiles

## 9. Release Readiness Snapshot (Current)

Latest local checks:
- `python3 -m compileall backend/app backend/migrations backend/scripts`: pass
- `npm --prefix mobile run typecheck`: pass
- `npm --prefix mobile run lint`: pass
- `npm --prefix mobile audit --audit-level=high`: pass (`0 vulnerabilities`)

Current iOS verdict status:
- **CONDITIONALLY READY** after code-level blocker fixes; release execution steps still required (migration run + media normalization verification).

## 10. Troubleshooting (Beginner-Friendly)

### App opens but cannot analyze
- Check backend is running at `http://localhost:8000`.
- Verify `EXPO_PUBLIC_API_BASE_URL` in mobile `.env`.
- If phone testing, use LAN IP, not `localhost`.

### Error: missing guest identity
- Reinstall app or clear secure store data.
- Ensure request interceptor is active in `mobile/src/services/api.ts`.
- Ensure both `X-Guest-Id` and `X-Guest-Secret` headers are being sent.

### Context card has no data
- In Settings, save latitude + longitude.
- Make sure context feature flag is enabled.
- If AirNow key is missing, fallback should still use Open-Meteo.

### Recording rejected as too short
- Record at least the configured minimum duration.
- Keep stable distance and reduce background noise.

## 11. Important Product Limitation Reminder

This app helps with trend visibility and early pattern awareness.
It is not a diagnostic medical device.
For breathing issues, appetite loss, severe lethargy, or persistent distress signals, consult an avian veterinarian.
