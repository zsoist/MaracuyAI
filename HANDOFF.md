# Handoff Prompt - Parakeet Wellness AI

## What is this project?

A mobile application powered by AI that analyzes Australian parakeet (budgie) vocalizations to determine their mood and wellness state. The owner has 2-3 parakeets and wants to monitor their wellbeing through audio analysis since body language reading (common for dogs) is not feasible for small birds.

## Repository

- **Repo**: `zsoist/Project-MK-2`
- **Branch**: `claude/parakeet-wellness-ai-XnJiF`
- **Structure**: Monorepo with `backend/` (Python/FastAPI) and `mobile/` (React Native/Expo)

## Current State: MVP Complete (~90%)

The Sprint 1 foundation and Sprint 2 MVP completion are done. The app has a full working flow from registration to audio analysis. Here's exactly what exists:

### Backend (Python/FastAPI) - FULLY FUNCTIONAL

**Tech stack**: FastAPI + SQLAlchemy (async) + PostgreSQL + Docker + librosa + noisereduce

**Files and what they do:**

```
backend/
├── app/
│   ├── main.py                          # FastAPI app with lifespan, CORS, router mounting
│   ├── core/
│   │   ├── config.py                    # Pydantic Settings (DB URL, JWT secret, audio config)
│   │   ├── database.py                  # Async SQLAlchemy engine + session + Base class
│   │   └── security.py                  # bcrypt password hashing, JWT create/decode
│   ├── api/
│   │   ├── deps.py                      # get_current_user dependency (Bearer token → User)
│   │   └── routes/
│   │       ├── auth.py                  # POST /register, POST /login, GET /me
│   │       ├── parakeets.py             # Full CRUD for parakeets (POST, GET, GET/:id, PUT, DELETE)
│   │       ├── recordings.py            # POST /upload (multipart), GET list, GET/:id, DELETE
│   │       └── analysis.py              # POST /analyze, GET /history/:id, GET /summary/:id, GET /alerts
│   ├── models/
│   │   ├── user.py                      # User (id, email, password_hash, display_name)
│   │   ├── parakeet.py                  # Parakeet (id, user_id, name, color_description, birth_date, notes)
│   │   ├── recording.py                 # Recording (id, user_id, file_url, duration, size, sample_rate)
│   │   └── analysis_result.py           # AnalysisResult (mood enum, confidence, energy, vocalization_type enum)
│   ├── services/
│   │   ├── storage_service.py           # Saves audio files locally, converts to WAV via librosa
│   │   ├── audio_processor.py           # Feature extraction: mel-spectrogram, MFCCs, pitch, ZCR, RMS, chroma
│   │   └── ml_service.py               # RULE-BASED classifier (NOT a trained ML model yet)
│   └── ml/
│       ├── training/                    # EMPTY - no training scripts yet
│       └── weights/                     # EMPTY - no model weights yet
├── Dockerfile                           # Python 3.12-slim + ffmpeg + libsndfile1
├── docker-compose.yml                   # API + PostgreSQL 16 with healthcheck
├── requirements.txt                     # All Python dependencies
└── .env.example                         # Environment variable template
```

**API prefix**: All routes are under `/api/v1/`

**Database**: Tables auto-created via `Base.metadata.create_all()` in lifespan (no Alembic migrations yet)

**ML classifier**: Currently uses a HEURISTIC rule-based system in `ml_service.py` that analyzes audio features (RMS energy, zero-crossing rate, spectral centroid, pitch mean/std) to classify mood. It is NOT a trained CNN. The plan is to replace it with a CNN trained via transfer learning on YAMNet (Google's audio classifier).

**Mood types**: `happy`, `relaxed`, `stressed`, `scared`, `sick`, `neutral`
**Vocalization types**: `singing`, `chattering`, `alarm`, `silence`, `distress`, `contact_call`, `beak_grinding`

### Mobile (React Native / Expo) - FULLY FUNCTIONAL

**Tech stack**: Expo 52 + React Navigation 6 + Zustand + Axios + react-native-chart-kit + expo-av

**Files and what they do:**

```
mobile/
├── src/
│   ├── App.tsx                          # Root: useAuth → splash/login/main navigation
│   ├── hooks/
│   │   └── useAuth.ts                   # Checks AsyncStorage token → calls getMe() → sets user
│   ├── screens/
│   │   ├── LoginScreen.tsx              # Login/Register with tab toggle, email+password form
│   │   ├── HomeScreen.tsx               # Dashboard: latest analysis, record button, parakeet list
│   │   ├── RecordScreen.tsx             # Audio recording (expo-av), file upload, shows analysis result
│   │   ├── HistoryScreen.tsx            # Analysis history filtered by parakeet, FlatList
│   │   ├── ParakeetProfileScreen.tsx    # Profile: stats, dominant mood, WellnessChart, mood distribution bars
│   │   ├── AddParakeetScreen.tsx        # Form: name, color, notes → createParakeet API
│   │   └── SettingsScreen.tsx           # Account info, app version, logout
│   ├── components/
│   │   ├── MoodIndicator.tsx            # Emoji circle + mood label + confidence %
│   │   ├── ParakeetCard.tsx             # Touchable card with avatar, name, color description
│   │   └── WellnessChart.tsx            # LineChart (energy + confidence over time, last 15 analyses)
│   ├── services/
│   │   └── api.ts                       # Axios client with Bearer interceptor, all API functions
│   ├── store/
│   │   └── useStore.ts                  # Zustand: user, parakeets[], recordings[], latestAnalysis, MOOD_CONFIG
│   ├── types/
│   │   └── index.ts                     # TypeScript interfaces: Parakeet, Recording, AnalysisResult, etc.
│   └── utils/
│       └── audioHelpers.ts              # formatDuration, formatFileSize, getConfidenceLabel, getEnergyLabel
├── package.json                         # Dependencies (NOT installed yet - need npm install)
├── app.json                             # Expo config with permissions (mic, camera)
└── tsconfig.json                        # TypeScript config
```

**Navigation structure:**
```
App (useAuth check)
├── Not authenticated → LoginScreen
└── Authenticated → NavigationContainer
    └── Stack.Navigator
        ├── HomeTabs (BottomTabNavigator)
        │   ├── Home (HomeScreen)
        │   ├── Record (RecordScreen)
        │   ├── History (HistoryScreen)
        │   └── Settings (SettingsScreen)
        ├── ParakeetProfile (ParakeetProfileScreen)
        └── AddParakeet (AddParakeetScreen)
```

**User flow:**
1. App starts → useAuth checks token in AsyncStorage
2. No token → LoginScreen (login or register)
3. Authenticated → HomeScreen with parakeet list + record button
4. User adds parakeets via "+" → AddParakeetScreen
5. User records audio → RecordScreen (expo-av recording or file picker)
6. Audio uploaded → backend processes (librosa features → heuristic classifier)
7. Result shown: mood emoji, vocalization type, energy %, recommendations
8. History tab shows all past analyses filtered by parakeet
9. Parakeet profile shows: stats, dominant mood, WellnessChart (LineChart), mood distribution

## What to run

```bash
# Backend
cd backend
docker-compose up       # Starts API on :8000 + PostgreSQL on :5432
# API docs at http://localhost:8000/docs

# Mobile
cd mobile
npm install             # Dependencies NOT installed yet
npx expo start          # Starts Expo dev server
```

## What remains to be done (prioritized)

### Sprint 2: Real ML Model (HIGH PRIORITY)
The current classifier is rule-based heuristics. Needs to be replaced with an actual trained model:

1. **Integrate YAMNet** as feature extractor (TensorFlow Hub model, already in requirements.txt but unused)
   - YAMNet is pre-trained on AudioSet with 521 classes including "bird vocalization"
   - Use it as a feature extractor: input audio → YAMNet embeddings (1024-dim vectors)
2. **Build CNN classifier** on top of YAMNet embeddings
   - File to create: `backend/app/ml/model.py`
   - Architecture: YAMNet embeddings → Dense(256) → Dropout → Dense(128) → Dense(6, softmax)
3. **Training pipeline**
   - File to create: `backend/app/ml/training/train.py`
   - Data sources: Xeno-canto (bird audio database), user-labeled recordings
   - Strategy: Start with synthetic labels from heuristics, then human feedback loop
4. **Update `ml_service.py`** to use trained model instead of heuristics

### Sprint 3: Polish & Missing Features (MEDIUM PRIORITY)
1. **Alembic migrations** - Currently tables auto-create, need proper migration tracking
2. **Error boundaries** in React Native (app crashes on unhandled errors)
3. **Token refresh** - JWT expires after 24h, no refresh mechanism
4. **Push notifications** via expo-notifications for alerts
5. **Audio player component** - Allow playback of recorded audio in history
6. **Image picker** for parakeet profile photos (endpoint exists, UI missing)

### Sprint 4: Advanced Features (LOW PRIORITY)
1. **Per-bird acoustic profile** - Learn each bird's "normal" baseline, detect deviations
2. **Speaker diarization** - Distinguish which bird is vocalizing (user has 2-3 birds)
3. **Continuous monitoring mode** - Keep phone near cage, analyze audio in real-time
4. **Environmental correlation** - Time of day, season, temperature effects
5. **Vet report export** - PDF summary for veterinary visits

## Key Design Decisions Already Made
- **Audio-only MVP** (no video analysis for v1)
- **Cloud processing** (not on-device, send audio to backend)
- **React Native with Expo** (cross-platform, one codebase)
- **Python/FastAPI backend** (native ML ecosystem)
- **PostgreSQL** (JSON support for analysis details/metadata)
- **Zustand** for state (lightweight, TypeScript-friendly)
- **JWT auth** (stateless, stored in AsyncStorage)

## Known Issues
1. `SECRET_KEY` in config.py has a hardcoded default (must be overridden via .env in production)
2. `navigation` props typed as `any` in several screens (should use proper RN navigation types)
3. CORS is set to `allow_origins=["*"]` (must restrict in production)
4. No rate limiting on API endpoints
5. `docker-compose.yml` uses `--reload` flag (dev only, remove for production)
6. No tests exist (unit or integration)

## Architecture Diagram

```
┌─────────────────┐     HTTPS/JSON      ┌──────────────────┐
│  React Native   │ ──────────────────── │  FastAPI Backend  │
│  (Expo)         │                      │  (Python 3.12)    │
│                 │  multipart/form-data │                    │
│  - Record audio │ ──────────────────── │  - JWT Auth        │
│  - Show results │                      │  - Audio Storage   │
│  - Charts       │                      │  - ML Pipeline     │
│  - Alerts       │                      │  - PostgreSQL      │
└─────────────────┘                      └──────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                              ┌─────┴─────┐          ┌─────┴─────┐
                              │ librosa   │          │ PostgreSQL │
                              │ noisered. │          │ 16-alpine  │
                              │ scipy     │          │            │
                              └───────────┘          └────────────┘
                              Audio Processing       Data Storage
```
