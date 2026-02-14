# HANDOFF - `codex/full-hardening-potenciacion`

Last updated: **February 14, 2026 (release hardening pass)**

## 1) Branch Snapshot

- Repo: `git@github.com:zsoist/Project-MK-2.git`
- Branch: `codex/full-hardening-potenciacion`
- Scope root:
  - `/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2`

This handoff is the current source-of-truth for implementation and release state.

## 2) What Was Completed In This Cycle

## 2.1 Product expansion (mobile)

Implemented:
- New Guide tab for Australian budgerigar education.
- Full bilingual UX (`es`/`en`) with:
  - device locale auto-detection
  - manual override persisted in SecureStore
- In-context education banners in key screens (Home, Record, History, Settings).
- Settings now includes account deletion action.

Primary files:
- `mobile/src/screens/GuideScreen.tsx`
- `mobile/src/content/guide/en.ts`
- `mobile/src/content/guide/es.ts`
- `mobile/src/i18n/I18nProvider.tsx`
- `mobile/src/i18n/locales/en.ts`
- `mobile/src/i18n/locales/es.ts`
- `mobile/src/components/TipBanner.tsx`

## 2.2 Backend hardening

Implemented:
- Guest to account merge endpoint:
  - `POST /api/v1/auth/merge-guest`
- Stronger guest proof model:
  - `X-Guest-Secret` required for guest ownership resolution and guest merge.
- Account data lifecycle endpoints:
  - `GET /api/v1/auth/export-data`
  - `DELETE /api/v1/auth/me`
- Removed direct mutable `photo_url` field from standard parakeet update payload.
- Canonical media URL support in recording responses.
- Legacy media paths now self-heal to canonical public paths during read flows.
- Storage cleanup fix for converted audio artifacts.
- Added parakeet photo size limit for upload safety.
- Added per-profile exception isolation logging in context refresh service.
- Corrected AirNow PM2.5 semantics to use concentration (`ug/m3`) rather than AQI index aliasing.
- Rate limiting now supports Redis shared backend (with memory fallback/strict mode).

Primary files:
- `backend/app/api/routes/auth.py`
- `backend/app/api/routes/parakeets.py`
- `backend/app/api/routes/recordings.py`
- `backend/app/services/storage_service.py`
- `backend/app/services/context_service.py`

## 2.3 Release blocker execution

Implemented against prior blocker list:

1. Migration discipline foundation:
- Added Alembic scaffolding and baseline migration:
  - `backend/alembic.ini`
  - `backend/migrations/env.py`
  - `backend/migrations/versions/20260214_0001_baseline.py`
- Runtime schema mutation now guarded by explicit flag:
  - `backend/app/main.py`
  - `backend/app/core/config.py` (`DB_AUTO_CREATE_ON_STARTUP`)
- Release startup now validates DB revision against Alembic head when enforcement is enabled:
  - `backend/app/core/migrations.py`
  - `backend/app/main.py` (`ENFORCE_ALEMBIC_HEAD`)

2. Production API env fail-fast:
- Mobile now throws in non-dev builds if `EXPO_PUBLIC_API_BASE_URL` is missing or localhost-like.
  - `mobile/src/config/env.ts`
- Added EAS prebuild release env gate:
  - `mobile/scripts/check-release-env.mjs`
  - `mobile/eas.json`
  - `mobile/package.json` (`check:release-env`, `eas-build-pre-install`)

3. Legacy recording path normalization utility:
- Added one-time script for DB+filesystem normalization:
  - `backend/scripts/normalize_media_paths.py`

4. Dependency hardening and Expo migration:
- Upgraded mobile from Expo 52 to Expo 54 compatible stack.
- Resolved previous `npm audit` high vulnerabilities to zero.
  - `mobile/package.json`
  - `mobile/package-lock.json`

## 3) Current Runtime Architecture

## 3.1 Backend

Core routes:
- `/api/v1/auth/*`
- `/api/v1/parakeets/*`
- `/api/v1/recordings/*`
- `/api/v1/analysis/*`
- `/api/v1/context/*`

Identity model:
- Guest mode via `X-Guest-Id` + `X-Guest-Secret`
- Account mode via `Authorization: Bearer <jwt>`
- Domain data ownership via `AuthContext.owner_id`

Context providers:
- weather: NOAA -> Open-Meteo fallback
- AQI: AirNow (if key) -> Open-Meteo fallback

Important release note:
- Use Alembic migrations for schema evolution.
- Do not rely on startup `create_all` in release environments.

## 3.2 Mobile

Main app tabs:
- Home
- Record
- History
- Guide
- Settings

State/services:
- Zustand global store
- Axios API client with auth/guest headers
- SecureStore for auth token, guest id, guest secret, language preference

UX/education:
- contextual tip banners
- guide-driven onboarding flow
- i18n translations across screens/components

## 4) Environment and Runbook

## 4.1 Backend local dev

```bash
cd "/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/backend"
cp .env.example .env
docker compose up --build
```

Optional migration workflow:

```bash
cd "/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/backend"
alembic upgrade head
```

Legacy media normalization (one-time where needed):

```bash
cd "/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/backend"
python -m scripts.normalize_media_paths --dry-run
python -m scripts.normalize_media_paths
```

## 4.2 Mobile local dev

```bash
cd "/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Paraket MK 2/Project-MK-2/mobile"
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
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 EAS_BUILD_PROFILE=production VALIDATE_RELEASE_ENV=true npm --prefix mobile run check:release-env
```

Result summary:
- backend compile: pass
- mobile typecheck: pass
- mobile lint: pass
- mobile audit(high): pass (`0 vulnerabilities`)
- release env gate script: pass (valid URL) / fail as expected (missing URL)

## 6) Remaining Risks / Non-Blockers

- No automated backend/mobile test suite yet (unit/integration/e2e gap).
- Redis rate limiting must be enabled in production config to get cross-instance guarantees.
- Operational migration execution must still be performed in target environments.
- This workstation shell does not have Docker and local Python is missing backend DB driver deps (`asyncpg`), so migration execution evidence was not captured here.

## 7) iOS Release Verdict (Updated)

Status: **CONDITIONALLY READY**

Why not fully READY yet:
- operational migration steps must be executed in target environment:
  - `alembic upgrade head`
  - media normalization script where legacy rows exist
- test coverage remains below production-hardening expectations.

## 8) Next 48h Recommended Work

1. Execute migration + normalization in staging snapshot and verify all historical recordings play.
2. Add backend integration tests for:
- guest/account auth context
- merge-guest idempotency
- upload validation and media contract
3. Add mobile smoke tests for:
- first launch guest flow
- language persistence
- guide rendering and navigation
4. Add context telemetry dashboards and alerting thresholds.

## 9) Documentation Updated In This Cycle

- `HANDOFF.md` (this file)
- `README.md` (beginner-focused, ML/AI explained)
- `REVIEW_IOS_FIRST_2026-02-14.md` (full findings + verdict + roadmap)
- `mockup.html` (feature-aligned visual prototype)

## 10) Final Alignment Notes

- `mockup.html` is now aligned with the hardening architecture and explicitly reflects:
  - guest identity proof (`X-Guest-Id` + `X-Guest-Secret`)
  - release env gate behavior for production profiles
  - migration discipline (`ENFORCE_ALEMBIC_HEAD`)
  - Redis-capable shared rate limiting backend
- Release status remains **CONDITIONALLY READY** until target-environment operational steps are executed:
  - `alembic upgrade head`
  - staging/production verification of historical recording playback
