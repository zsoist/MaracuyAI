# Maracuyá v3 — Plan de Integración

## Full Scan: Estado Actual del Repositorio

### Branch baseline: `main`

**Arquitectura general:**
```
React Native (Expo 52)  →  FastAPI (Python 3.12)  →  PostgreSQL 16 + Redis 7
       ↑                         ↑
   Zustand + SecureStore    CNN Ensemble (sin pesos) + Statistical Classifier
```

**Lo que YA existe y funciona:**

| Capa | Componentes | Estado |
|------|-------------|--------|
| **Mobile** | 8 pantallas, i18n (en/es), Zustand store, SecureStore auth, guest-first flow, RecordingQualityMeter, WellnessChart, AlertFeed, ContextCard | ✅ Completo |
| **API** | Auth (JWT + guest), CRUD parakeets/recordings, analysis pipeline, context engine, rate limiting, Alembic migrations | ✅ Completo |
| **DB** | Users, Parakeets, Recordings, AnalysisResults, HabitatProfile, EnvironmentSnapshot, RiskEvent | ✅ Completo |
| **ML Pipeline** | Ensemble system (CNN + Statistical + Temporal), BirdCNN dual-head, FeatureEngine (100+ features), StatisticalClassifier (Gaussian), bird detection gating | ✅ Arquitectura completa |
| **ML Weights** | `backend/app/ml/weights/.gitkeep` | ❌ VACÍO — No hay modelo entrenado |
| **Audio** | Bandpass filter (800Hz-10kHz), HPSS, VAD, adaptive noise reduction, mel spectrograms | ✅ Completo |
| **Infra** | Docker Compose (API + PG + Redis), Dockerfile, .env.example, EAS config | ✅ Completo |

---

## Gap Analysis: v2 (Maracuyá) vs current system

| Aspecto | v2 (Maracuyá) | Sistema actual | Incompatibilidad |
|---------|---------------|--------------|-------------------|
| **Clasificación** | Binaria (feliz/estrés) | Multi-clase: 6 moods × 7 vocalizaciones | **CRÍTICA** — No puedes meter un modelo binario donde el sistema actual espera 6+7 clases |
| **Input shape** | `(64, 130, 1)` — 64 mels | `(128, 128, 1)` — 128 mels | **ALTA** — Shapes incompatibles |
| **Normalización** | `(log_mel + 80) / 80` → [0,1] | `power_to_db(mel, ref=max)` → min-max per-patch | **MEDIA** — Pipeline distinto |
| **Modelo** | Sequential CNN (3 conv, 1 head, sigmoid) | Functional CNN dual-head (4 conv, 2 heads, softmax) | **CRÍTICA** — Arquitectura completamente distinta |
| **Preprocesamiento** | Simple: load → mel → normalize | Avanzado: load → normalize → noise reduce → bandpass → HPSS → VAD → segment | **El repo actual es superior** |
| **Segment duration** | 3.0s | 3.0s | ✅ Compatible |
| **Sample rate** | 22050 | 22050 | ✅ Compatible |
| **Output format** | `{"label": "feliz", "prob_feliz": 0.87}` | `{"mood": "happy", "mood_probabilities": {...}, "vocalization_type": "singing", ...}` | **MEDIA** — v2 output no cabe en la API existente |

### Diagnóstico brutal

**No se puede hacer un "drop-in" del modelo v2 en el repo.** La arquitectura, las clases, los shapes, y la normalización son incompatibles. Lo que SÍ se puede hacer:

1. **Reutilizar los datos de entrenamiento** (audios WAV de estrés/feliz)
2. **Re-entrenar usando la arquitectura del repo** (`bird_classifier.py` dual-head CNN)
3. **Mapear las 2 clases v2 → 6 clases del repo** como bootstrap inicial

---

## Plan de Integración v3

### Estrategia: Re-entrenar para la arquitectura del repo

```
Datos v2 (feliz/estrés WAVs)
        │
        ▼
Preprocesamiento del REPO (bandpass + HPSS + mel 128×128)
        │
        ▼
Entrenamiento con arquitectura bird_classifier.py (dual-head)
        │
        ▼
Pesos → backend/app/ml/weights/bird_classifier.weights.h5
        │
        ▼
Ensemble automáticamente sube CNN weight de 0.05 → 0.50
```

### Mapeo de clases v2 → repo

| v2 Label | → mood (repo) | → vocalization (repo) |
|----------|---------------|----------------------|
| `feliz` (label=1) | `happy` | `singing` |
| `estres` (label=0) | `stressed` | `distress` |
| *silencio (RMS < threshold)* | `neutral` | `silence` |

Las clases faltantes (`relaxed`, `scared`, `sick`, `chattering`, `alarm`, `contact_call`, `beak_grinding`) arrancan sin datos y se aprenden vía feedback del usuario en la app.

### Hosting sin nube

**Opción A — Localhost con túnel (GRATIS, recomendada para dev/beta)**
```
Tu PC (Docker Compose) → Cloudflare Tunnel (gratis) → app móvil
```
- Cloudflare Tunnel > ngrok: gratis ilimitado, dominio custom, HTTPS automático
- Requiere que tu PC esté encendida

**Opción B — VPS barato (€3-5/mes, recomendada para producción)**

| Proveedor | Plan | RAM | Precio |
|-----------|------|-----|--------|
| Hetzner CAX11 | ARM64 | 4GB | €3.29/mes |
| Oracle Cloud | ARM Ampere | 24GB | GRATIS (Always Free) |
| OVH Starter | x86 | 2GB | €3.50/mes |

- Oracle Cloud Always Free es literalmente gratis con 24GB RAM — más que suficiente para TensorFlow inference
- El modelo pesa ~5MB, inference toma <500ms por segmento

**Opción C — Tu PC como servidor permanente (GRATIS)**
- Docker Compose en tu máquina Windows
- Port forwarding en tu router o Tailscale para acceso remoto
- Solo viable si tu PC está siempre encendida

---

## Archivos Integrados

### Training module (integrado en el repo)

```
backend/app/ml/training/
├── __init__.py              # Module init
├── train_from_v2_data.py    # Re-entrena con datos v2 para la arquitectura del repo
└── label_mapper.py          # Mapeo feliz/estrés → 6 moods + 7 vocalizaciones
```

**Mejoras clave en la integración:**
- `label_mapper.py` importa labels directamente desde `bird_classifier.py` (siempre sincronizado)
- `train_from_v2_data.py` importa `_build_model()` desde `bird_classifier.py` (arquitectura siempre idéntica)
- Dependencias de entrenamiento (`matplotlib`, `scikit-learn`) agregadas a `requirements.txt`

### Archivos existentes que NO se tocan

Todo el backend, mobile, ML pipeline, ensemble, statistical classifier **se queda exactamente como está**. La única acción es generar el archivo `bird_classifier.weights.h5` y colocarlo en `backend/app/ml/weights/`.

El ensemble ya está programado para detectar automáticamente si los pesos existen:
- Sin pesos: `CNN=0.05, Statistical=0.65, Temporal=0.30` (estado actual)
- Con pesos: `CNN=0.50, Statistical=0.30, Temporal=0.20` (después de entrenar)

---
