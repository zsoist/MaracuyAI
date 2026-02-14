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
- vocalization type
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
- Record audio in-app.
- Upload audio files from device.
- Analyze recordings and view results.
- View analysis history and wellness trend chart.
- View risk alerts generated from analysis and context.
- Guide tab with Australian budgerigar education:
- info, history, care, tips, risks, common signs, uncommon advice, app tutorial.
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

Current analysis is a practical AI stack with two parts:

1. **Signal processing + feature extraction** (real audio DSP)
2. **Heuristic classifier** (rule-based decision logic)

So today, it is not yet a large trained deep model in production; it is a deterministic AI pipeline that uses meaningful acoustic features and produces explainable outputs.

### 3.2 Audio analysis pipeline (step by step)

When audio reaches the backend, this happens:

1. **Load + normalize audio**
- convert to mono target rate
- normalize amplitude
- apply noise reduction

2. **Segment audio**
- split into fixed windows for local analysis

3. **Extract features per segment**
- mel spectrogram
- MFCC + delta MFCC
- spectral centroid / rolloff
- zero crossing rate
- RMS energy
- chroma
- pitch mean / pitch variance

4. **Classify each segment**
- heuristic logic maps acoustic patterns to mood/vocalization candidates

5. **Aggregate segment outputs**
- dominant mood
- average confidence
- average energy
- dominant vocalization type

6. **Compute quality metadata**
- signal quality score and label
- noise profile
- segment count and segment mood list

7. **Return user-facing output**
- mood, confidence, energy, vocalization type, recommendations, details

### 3.3 Why this AI design is useful now

- Fast iteration with low infrastructure complexity.
- Outputs are explainable (you can trace why a result happened).
- Stable for MVP while collecting better real-world data.
- Strong foundation for future model upgrades.

### 3.4 What AI does NOT do yet

- It does not diagnose disease.
- It does not identify exact individual bird voices automatically in mixed audio.
- It does not run a production deep neural network classifier yet.
- It does not guarantee medical-grade precision.

### 3.5 Planned AI evolution

Roadmap direction (already documented in handoff/plans):
- hybrid reasoning (rules + richer model outputs + context)
- better confidence handling and explainability
- smarter discovery/watchlist behavior
- improved robustness and telemetry

## 4. System Architecture

Monorepo root:
- `/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/backend`
- `/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/mobile`

### Backend stack
- Python 3.12
- FastAPI
- SQLAlchemy async + PostgreSQL
- librosa, noisereduce, scipy, tensorflow (future model path)

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
cd "/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/backend"
cp .env.example .env
docker compose up --build
```

Backend URL:
- `http://localhost:8000`
- docs: `http://localhost:8000/docs`

## 6.2 Start mobile app

```bash
cd "/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/mobile"
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
3. Add a parakeet in `Home` > `+ Add`.
4. Upload photo in profile.
5. Open `Guide` and read care/risk sections.
6. Open `Record`, select target bird, record 30+ seconds.
7. Review analysis result and recommendation.
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

Current iOS verdict status in review report:
- **CONDITIONALLY READY** after code-level blocker fixes; release execution steps still required (migration run + media normalization verification).

Detailed report:
- `/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/REVIEW_IOS_FIRST_2026-02-14.md`

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
