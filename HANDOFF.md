# HANDOFF v2 - `codex/full-hardening-potenciacion`

Last updated: **February 14, 2026**

## 1) Current Snapshot

- Repo: `git@github.com:zsoist/Project-MK-2.git`
- Active branch: `codex/full-hardening-potenciacion`
- Main not merged (by design).
- Latest commits on this branch:
  - `aefca89` feat: execute track A/B foundation with feature-flagged rollout
  - `74117bb` feat: make auth optional with guest-first identity flow
  - `060ae9f` refactor: modularize backend analysis and mobile recording flows
  - `709d9f4` feat(mockup): refresh preview with alerts, bird selector, and profile photo flow
  - `143338b` feat: harden backend and power-up mobile workflow

This branch is now in a **guest-first + modular + feature-flagged** state with Track A/B foundation implemented.

---

## 2) What Is Implemented (Consolidated)

## 2.1 Wave 1: Hardening + Product Completeness

Backend:
- CORS hardened and configurable.
- Secret validation improved for non-debug mode.
- In-memory rate limiting middleware added.
- Robust audio validation/processing (empty/invalid/no-signal/duration cap).
- Ownership validation for `analysis/analyze`.
- Real parakeet photo upload endpoint.
- `/media` static serving enabled.
- `GET /recordings/{id}` includes linked analysis results.

Mobile:
- Token storage moved to `expo-secure-store`.
- Configurable API base URL via env.
- Home alerts integrated.
- Record screen supports explicit bird selection.
- Parakeet profile supports image upload.
- Navigation typing and lint/typecheck enabled.

## 2.2 Wave 2: Modularization

Backend modularization:
- Shared service modules:
  - `backend/app/services/parakeet_service.py`
  - `backend/app/services/recording_service.py`
  - `backend/app/services/analysis_service.py`
- Route files simplified to HTTP contract layer.

Mobile modularization:
- Reusable hooks/components:
  - `mobile/src/hooks/useHomeDashboard.ts`
  - `mobile/src/hooks/useRecordAnalysis.ts`
  - `mobile/src/components/AlertFeed.tsx`
  - `mobile/src/components/ParakeetTargetSelector.tsx`
  - `mobile/src/components/AnalysisLoadingState.tsx`
  - `mobile/src/components/AnalysisResultCard.tsx`
- Shared env/error utilities:
  - `mobile/src/config/env.ts`
  - `mobile/src/utils/errorMessage.ts`

## 2.3 Wave 3: Guest-First Auth (Login Optional)

Behavior:
- App works without account by default.
- Account auth remains optional.

Backend:
- `AuthContext` introduced in `backend/app/api/deps.py`.
- Two identity modes:
  - `Authorization: Bearer <token>` (account mode)
  - `X-Guest-Id: <uuid>` (guest mode)
- Domain routes moved to optional auth context:
  - `parakeets`, `recordings`, `analysis`.

Mobile:
- Persistent guest id generated and stored in secure store.
- `X-Guest-Id` automatically sent for all API requests.
- Login screen no longer blocks app startup.
- Account creation/login moved to Settings as optional path.

## 2.4 Wave 4: Track A/B Execution with Feature Flags

Track 1 (Phase A + small D foundation):
- Context engine added:
  - models: `environment_snapshots`, `habitat_profiles`, `risk_events`
  - service: `backend/app/services/context_service.py`
  - routes: `backend/app/api/routes/context.py`
  - optional background refresh job: `backend/app/jobs/context_refresh.py`
- Provider strategy:
  - weather: NOAA -> Open-Meteo fallback
  - AQI: AirNow (if key) -> Open-Meteo Air Quality fallback
- iOS UX foundation:
  - `mobile/src/theme/tokens.ts`
  - `mobile/src/theme/accessibility.ts`
  - context card + settings habitat form

Track 2 (Phase B early pieces):
- Capture quality and validation:
  - mobile real-time quality hook/component
  - backend minimum duration validation
  - recording response quality scoring fields
- Analysis details enriched with:
  - `signal_quality`
  - `noise_profile`
  - `segment_count`
  - `segment_moods`

---

## 3) Backend Architecture (Current)

## 3.1 Core Routing

- `backend/app/api/routes/auth.py`
- `backend/app/api/routes/parakeets.py`
- `backend/app/api/routes/recordings.py`
- `backend/app/api/routes/analysis.py`
- `backend/app/api/routes/context.py`

## 3.2 Cross-Cutting Services

- `backend/app/services/storage_service.py`
- `backend/app/services/audio_processor.py`
- `backend/app/services/ml_service.py`
- `backend/app/services/parakeet_service.py`
- `backend/app/services/recording_service.py`
- `backend/app/services/analysis_service.py`
- `backend/app/services/context_service.py`

## 3.3 Auth Model

- Required auth still exists for `/auth/me` endpoint semantics.
- Domain APIs now use `AuthContext` and accept either token or guest id.
- Guest identity maps to internal guest user record.

## 3.4 Data Model Additions

Existing:
- `users`, `parakeets`, `recordings`, `analysis_results`

New:
- `habitat_profiles`
- `environment_snapshots`
- `risk_events`

Important: schema is currently created via `Base.metadata.create_all` at startup.

---

## 4) Mobile Architecture (Current)

## 4.1 App Flow

- App starts directly into main experience.
- Optional account flow accessible from Settings.
- Guest identity is auto-created and persisted.

## 4.2 Key Hooks

- `useAuth` (guest/account bootstrap)
- `useHomeDashboard` (home aggregation)
- `useRecordAnalysis` (recording orchestration)
- `useRecordingQuality` (capture quality telemetry)

## 4.3 Key Components

- `AlertFeed`
- `ContextCard`
- `RecordingQualityMeter`
- `ParakeetTargetSelector`
- `AnalysisLoadingState`
- `AnalysisResultCard`

## 4.4 UI Foundations

- Design token baseline (`theme/tokens.ts`)
- Accessibility labels and helper (`theme/accessibility.ts`)

---

## 5) Feature Flags (Gate Strategy)

## 5.1 Backend Flags (`backend/app/core/config.py`)

- `FEATURE_CONTEXT_ENGINE` (default true)
- `FEATURE_CAPTURE_QUALITY` (default true)
- `FEATURE_IOS_UX_FOUNDATION` (default true)
- `FEATURE_ADVANCED_REASONING` (default false)
- `FEATURE_OFFLINE_RESILIENCE` (default false)
- `FEATURE_SMART_DISCOVERY` (default false)

Related context flags:
- `CONTEXT_AUTO_REFRESH_ENABLED` (default false)
- `CONTEXT_REFRESH_INTERVAL_SECONDS` (default 1800)
- `AIRNOW_API_KEY` (optional)

## 5.2 Mobile Flags (`mobile/src/config/env.ts`)

- `EXPO_PUBLIC_FEATURE_CONTEXT_ENGINE`
- `EXPO_PUBLIC_FEATURE_CAPTURE_QUALITY`
- `EXPO_PUBLIC_FEATURE_IOS_UX_FOUNDATION`
- `EXPO_PUBLIC_FEATURE_ADVANCED_REASONING`
- `EXPO_PUBLIC_FEATURE_OFFLINE_RESILIENCE`
- `EXPO_PUBLIC_FEATURE_SMART_DISCOVERY`

---

## 6) API Contract Deltas You Must Know

## 6.1 Identity

All domain routes are now effectively guest/account capable:
- client sends `X-Guest-Id` always
- client sends bearer token when logged in

## 6.2 Context API

- `GET /api/v1/context/habitat`
- `PUT /api/v1/context/habitat`
- `POST /api/v1/context/refresh`
- `GET /api/v1/context/current`
- `GET /api/v1/context/history?limit=...`
- `GET /api/v1/context/risk-events?limit=...`

## 6.3 Recording Response Extended

`RecordingResponse` now includes:
- `quality_score: float`
- `quality_label: str`
- `quality_warnings: string[]`

## 6.4 Analysis Details Extended

`details` now includes:
- `signal_quality`
- `noise_profile`
- `segment_count`
- `segment_moods`

---

## 7) Environment Setup

## 7.1 Backend `.env` Baseline

Copy from:
- `backend/.env.example`

Newly relevant variables:
- feature flags from section 5.1
- context provider settings (`AIRNOW_API_KEY`, refresh flags)
- `AUDIO_MIN_DURATION_SECONDS`

## 7.2 Mobile `.env` Baseline

Copy from:
- `mobile/.env.example`

Newly relevant variables:
- `EXPO_PUBLIC_API_BASE_URL`
- mobile feature flags from section 5.2

---

## 8) Local Runbook

## 8.1 Backend

```bash
cd /Users/daniel/backend
cp .env.example .env
docker compose up --build
```

## 8.2 Mobile

```bash
cd /Users/daniel/mobile
cp .env.example .env
npm install
npx expo start
```

For physical device testing:
```bash
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_MAC_LAN_IP>:8000/api/v1
```

---

## 9) QA Smoke Checklist

1. Guest boot:
- Fresh install -> app opens without login.
- Home/Record/Settings usable.

2. Optional auth:
- Settings -> Auth screen -> register/login works.
- `/auth/me` reflects account mode.

3. Capture quality:
- Start recording -> quality meter updates.
- Very short audio (< min duration) rejected with clear error.

4. Context engine:
- Settings -> enter habitat coordinates -> save.
- Refresh context succeeds.
- Home context card displays metrics and risk events when available.

5. Existing core flow:
- Add parakeet, upload photo, record and analyze, view history.

---

## 10) Review Findings (Important)

Severity key:
- P1 = high priority
- P2 = medium priority
- P3 = low priority

1. **[P1] No formal migration pipeline for new tables**
- Current schema evolution depends on `create_all`.
- Risk: production drift, no downgrade path, fragile deploys.
- Files: `backend/app/main.py`, `backend/app/models/*.py`
- Recommendation: introduce and enforce Alembic migrations before release.

2. **[P1] Guest data to account migration is missing**
- Users can create account later, but guest-owned data is not merged.
- Risk: perceived data loss after onboarding.
- Files: `backend/app/api/deps.py`, auth flow endpoints/screens.
- Recommendation: add explicit merge endpoint with conflict rules.

3. **[P2] AQI/PM2.5 semantics are coarse in provider mapping**
- AirNow fallback path is pragmatic but concentration fidelity is limited.
- Risk: misleading precision in environmental insights.
- File: `backend/app/services/context_service.py`
- Recommendation: normalize provider fields with confidence-weighted attribution.

4. **[P2] Context scheduler is best-effort and silent for per-profile failures**
- Whole-cycle exception handling exists, but limited per-profile observability.
- Risk: partial refresh failures may go unnoticed.
- File: `backend/app/jobs/context_refresh.py`
- Recommendation: per-profile logging and counters.

5. **[P2] Automated tests are still absent**
- Compile/typecheck/lint pass, but no test suite for regressions.
- Risk: fragile future changes.
- Recommendation: add backend API tests + mobile integration smoke tests.

---

## 11) Next Delivery Plan (Gated C -> E -> F)

## 11.1 Phase C (behind `FEATURE_ADVANCED_REASONING`)

- Implement hybrid reasoner layer:
  - rules + ML outputs + context snapshots.
- Emit explainable risk payload:
  - reason, evidence, confidence, user-safe wording.
- Add review feedback capture endpoint.

Suggested files:
- `backend/app/services/wellness_reasoner.py` (new)
- `backend/app/api/routes/analysis.py`
- `backend/app/services/analysis_service.py`

## 11.2 Phase E (behind `FEATURE_OFFLINE_RESILIENCE`)

- Mobile offline queue for uploads/analysis calls.
- Retry/backoff + graceful degraded state.
- Telemetry for failure modes and UX latencies.

Suggested files:
- `mobile/src/services/offlineQueue.ts` (new)
- `mobile/src/services/api.ts`
- `mobile/src/hooks/useRecordAnalysis.ts`

## 11.3 Phase F (behind `FEATURE_SMART_DISCOVERY`)

- Personalized watchlist.
- Confidence threshold controls.
- Uncertain detection review queue.
- Habitat-based daily tips.

Suggested files:
- new backend models/routes for watchlist/review
- `mobile/src/screens/SettingsScreen.tsx`
- `mobile/src/screens/HistoryScreen.tsx`

---

## 12) Immediate 48h Task List for Next LLM

1. Add Alembic baseline + first migration for context tables.
2. Add guest -> account merge endpoint and client action in Settings.
3. Add tests:
- backend: auth context, context refresh, recording quality fields.
- mobile: guest bootstrap and record quality guardrails.
4. Add minimal telemetry events:
- `recording_upload_failed`
- `analysis_completed`
- `context_refresh_failed`

---

## 13) Quick Troubleshooting

1. `400 Missing guest identity...`
- Ensure mobile interceptor sends `X-Guest-Id`.
- Reinstall app or clear secure store if corrupted id.

2. `400 Latitude/longitude required...` on context refresh
- Save habitat coordinates first in Settings.

3. Context card empty
- Confirm `FEATURE_CONTEXT_ENGINE=true` on both backend and mobile.
- Check backend reachability and provider timeouts.

4. Recording rejected as too short
- `AUDIO_MIN_DURATION_SECONDS` is enforced in backend.

5. iOS/Android cannot reach local backend
- Use LAN IP for `EXPO_PUBLIC_API_BASE_URL` on device.

---

## 14) Validation History

Most recent validation before this handoff update:

```bash
python3 -m compileall /Users/daniel/backend/app
npm --prefix /Users/daniel/mobile run typecheck
npm --prefix /Users/daniel/mobile run lint
```

Result: pass.

---

## 15) Final Notes

- This handoff intentionally replaces fragmented earlier notes.
- Treat this file as the canonical state for the branch.
- Keep future updates incremental by appending a short dated section plus commit id.
