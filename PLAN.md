# Parakeet Wellness AI - Plan Tecnico MVP

## Resumen del Proyecto

Aplicacion movil con IA que analiza las vocalizaciones de periquitos australianos (2-3 aves) para determinar su estado de animo y bienestar. El MVP se centra exclusivamente en **analisis de audio** con procesamiento en la nube.

---

## Arquitectura General

```
+------------------+        +-------------------+        +------------------+
|  React Native    | -----> |  Backend API      | -----> |  ML Pipeline     |
|  Mobile App      | <----- |  (Python/FastAPI)  | <----- |  (Audio AI)      |
+------------------+        +-------------------+        +------------------+
        |                          |                            |
   - Grabacion                - Auth/Users              - Espectrogramas
   - Reproduccion             - Storage (S3)            - Clasificacion
   - Historial                - Base de datos           - Deteccion anomalias
   - Notificaciones           - WebSockets              - Perfil por ave
```

---

## Fase 1: Estructura del Proyecto

### 1.1 Monorepo con la siguiente estructura:

```
Project-MK-2/
├── mobile/                      # React Native App
│   ├── src/
│   │   ├── screens/             # Pantallas principales
│   │   │   ├── HomeScreen.tsx           # Dashboard principal
│   │   │   ├── RecordScreen.tsx         # Grabacion de audio
│   │   │   ├── HistoryScreen.tsx        # Historial de analisis
│   │   │   ├── ParakeetProfileScreen.tsx # Perfil de cada periquito
│   │   │   └── SettingsScreen.tsx       # Configuracion
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── AudioRecorder.tsx        # Grabador de audio
│   │   │   ├── AudioPlayer.tsx          # Reproductor
│   │   │   ├── MoodIndicator.tsx        # Indicador de animo
│   │   │   ├── WellnessChart.tsx        # Grafica temporal
│   │   │   └── ParakeetCard.tsx         # Tarjeta de periquito
│   │   ├── services/            # Logica de negocio
│   │   │   ├── api.ts                   # Cliente API
│   │   │   ├── audioService.ts          # Manejo de audio
│   │   │   └── notificationService.ts   # Notificaciones
│   │   ├── hooks/               # Custom hooks
│   │   ├── store/               # Estado global (Zustand)
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utilidades
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # Python Backend
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py              # Autenticacion
│   │   │   │   ├── recordings.py        # CRUD grabaciones
│   │   │   │   ├── analysis.py          # Endpoints de analisis
│   │   │   │   └── parakeets.py         # CRUD periquitos
│   │   │   └── deps.py                  # Dependencias
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── parakeet.py
│   │   │   ├── recording.py
│   │   │   └── analysis_result.py
│   │   ├── services/
│   │   │   ├── audio_processor.py       # Procesamiento de audio
│   │   │   ├── ml_service.py            # Inferencia ML
│   │   │   └── storage_service.py       # Almacenamiento de archivos
│   │   ├── ml/
│   │   │   ├── model.py                 # Definicion del modelo
│   │   │   ├── feature_extraction.py    # Extraccion de features
│   │   │   ├── training/               # Scripts de entrenamiento
│   │   │   └── weights/                # Pesos del modelo
│   │   └── core/
│   │       ├── config.py                # Configuracion
│   │       ├── database.py              # Conexion DB
│   │       └── security.py              # JWT, hashing
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── docs/                        # Documentacion
│   └── api.md                   # API reference
├── .gitignore
└── README.md
```

---

## Fase 2: Backend - API y Procesamiento de Audio

### 2.1 Modelo de Datos (PostgreSQL)

```
users
├── id (UUID)
├── email
├── password_hash
└── created_at

parakeets
├── id (UUID)
├── user_id (FK -> users)
├── name
├── color_description
├── birth_date (optional)
├── notes
└── created_at

recordings
├── id (UUID)
├── user_id (FK -> users)
├── file_url (S3 path)
├── duration_seconds
├── recorded_at
├── created_at
└── metadata (JSON - device info, sample rate, etc.)

analysis_results
├── id (UUID)
├── recording_id (FK -> recordings)
├── parakeet_id (FK -> parakeets, nullable)
├── mood (ENUM: happy, relaxed, stressed, scared, sick, neutral)
├── confidence (FLOAT 0-1)
├── energy_level (FLOAT 0-1)
├── vocalization_type (ENUM: singing, chattering, alarm, silence, distress)
├── details (JSON - spectrogram data, feature values)
├── recommendations (TEXT)
└── created_at
```

### 2.2 Endpoints API

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

POST   /api/parakeets                    # Registrar periquito
GET    /api/parakeets                    # Listar periquitos
GET    /api/parakeets/:id                # Detalle
PUT    /api/parakeets/:id                # Actualizar
DELETE /api/parakeets/:id                # Eliminar

POST   /api/recordings/upload            # Subir grabacion (multipart)
GET    /api/recordings                   # Listar grabaciones
GET    /api/recordings/:id               # Detalle con analisis
DELETE /api/recordings/:id               # Eliminar

POST   /api/analysis/analyze             # Analizar grabacion existente
GET    /api/analysis/history/:parakeet_id # Historial por periquito
GET    /api/analysis/summary/:parakeet_id # Resumen de bienestar
GET    /api/analysis/alerts              # Alertas activas
```

### 2.3 Pipeline de Procesamiento de Audio

```
Audio Input (.wav/.m4a/.mp3)
    │
    ▼
[1. Preprocesamiento]
    ├── Conversion a WAV mono 22050Hz
    ├── Normalizacion de volumen
    ├── Reduccion de ruido de fondo (noisereduce)
    └── Segmentacion en ventanas de 3-5 segundos
    │
    ▼
[2. Extraccion de Features]
    ├── Mel-Spectrogram (128 mel bands)
    ├── MFCCs (13 coeficientes + deltas)
    ├── Spectral Centroid (brillo del sonido)
    ├── Spectral Rolloff
    ├── Zero Crossing Rate
    ├── Chroma features
    ├── RMS Energy (volumen)
    └── Pitch/F0 estimation (frecuencia fundamental)
    │
    ▼
[3. Clasificacion ML]
    ├── Modelo CNN sobre espectrogramas
    │   └── Clasificacion: mood + vocalization_type
    ├── Detector de anomalias
    │   └── Compara con baseline del ave
    └── Estimacion de confianza
    │
    ▼
[4. Post-procesamiento]
    ├── Agregacion de resultados por segmentos
    ├── Generacion de recomendaciones
    ├── Actualizacion del perfil temporal
    └── Disparo de alertas si es necesario
```

### 2.4 Modelo de ML

**Arquitectura inicial: CNN sobre Mel-Spectrogramas**

```
Input: Mel-Spectrogram (128 x T x 1)
    │
    ├── Conv2D(32, 3x3) + BatchNorm + ReLU + MaxPool
    ├── Conv2D(64, 3x3) + BatchNorm + ReLU + MaxPool
    ├── Conv2D(128, 3x3) + BatchNorm + ReLU + MaxPool
    ├── Global Average Pooling
    ├── Dense(256) + Dropout(0.5)
    ├── Dense(128) + Dropout(0.3)
    └── Dense(N_classes) + Softmax
```

**Estrategia de entrenamiento (dato importante):**

No existen datasets publicos especificos de vocalizaciones de periquitos etiquetadas por estado de animo. El plan es:

1. **Fase inicial**: Usar modelos pre-entrenados de clasificacion de audio general (e.g., YAMNet de Google, entrenado en AudioSet) como feature extractor. YAMNet ya reconoce "bird vocalization" entre sus 521 clases.

2. **Transfer learning**: Fine-tune la ultima capa con datos recolectados de la propia app. El usuario etiqueta manualmente el estado que observa -> se construye dataset personalizado.

3. **Datos sinteticos + fuentes abiertas**: Complementar con grabaciones de budgies de Xeno-canto (base de datos de sonidos de aves) y videos de YouTube etiquetados.

4. **Modelo por ave**: Con suficientes datos, crear un perfil acustico por cada periquito del usuario para detectar desviaciones de SU patron normal.

**Librerias clave:**
- `librosa` - procesamiento de audio y extraccion de features
- `tensorflow` / `torch` - modelo de clasificacion
- `noisereduce` - reduccion de ruido
- `pydub` - conversion de formatos
- `scipy` - procesamiento de senales

---

## Fase 3: App Movil (React Native)

### 3.1 Pantallas del MVP

**Home (Dashboard)**
- Estado actual de cada periquito (ultima lectura)
- Boton grande para "Grabar ahora"
- Ultimos 3 analisis
- Alertas activas (si hay)

**Grabar**
- Boton de grabar/detener
- Visualizacion de forma de onda en tiempo real
- Duracion minima sugerida: 30 segundos
- Opcion de seleccionar periquito(s) presentes
- Subir archivo existente desde galeria

**Resultados del Analisis**
- Indicador visual grande del estado de animo (emoji + color + texto)
- Nivel de confianza del analisis
- Tipo de vocalizacion detectada
- Reproduccion del audio con marcadores en momentos clave
- Recomendaciones contextuales

**Historial**
- Lista cronologica de analisis
- Filtros por periquito, por estado, por fecha
- Grafica de tendencias (linea temporal de bienestar)

**Perfil de Periquito**
- Foto, nombre, datos basicos
- Estadisticas: estado promedio, vocalizacion mas frecuente
- Grafica de bienestar de los ultimos 7/30 dias
- Notas del dueno

### 3.2 Dependencias Principales (React Native)

```json
{
  "dependencies": {
    "react-native": "0.76.x",
    "@react-navigation/native": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "react-native-audio-recorder-player": "^3.x",
    "react-native-fs": "^2.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "react-native-chart-kit": "^6.x",
    "react-native-vector-icons": "^10.x",
    "react-native-image-picker": "^7.x",
    "@react-native-async-storage/async-storage": "^1.x"
  }
}
```

---

## Fase 4: Sistema de Alertas y Recomendaciones

### 4.1 Tipos de Alerta

| Prioridad | Condicion | Mensaje ejemplo |
|-----------|-----------|-----------------|
| **ALTA** | Silencio prolongado (>6hrs en horario diurno) | "Tu periquito ha estado inusualmente silencioso. Revisa que este comiendo y bebiendo." |
| **ALTA** | Vocalizaciones de distress repetidas | "Se detectan sonidos de estres frecuentes. Verifica que no haya depredadores cerca o ruidos fuertes." |
| **MEDIA** | Reduccion gradual de canto (>3 dias) | "La actividad vocal ha disminuido esta semana. Podria indicar cambio de animo o inicio de muda." |
| **MEDIA** | Patron de sonido ronco detectado | "Se detectaron sonidos respiratorios inusuales. Considera una visita al veterinario aviar." |
| **BAJA** | Cambio de patron horario | "Tu periquito esta vocalizando en horarios diferentes a lo habitual." |

### 4.2 Recomendaciones Contextuales

El sistema genera recomendaciones basadas en:
- Estado detectado actual
- Historial reciente del ave
- Epoca del ano (muda, reproduccion)
- Datos ambientales (si se integran sensores a futuro)

---

## Fase 5: Implementacion - Orden de Trabajo

### Sprint 1: Fundacion (lo que haremos ahora)
- [ ] Inicializar monorepo con estructura de carpetas
- [ ] Setup backend FastAPI con Docker
- [ ] Modelos de base de datos (SQLAlchemy + PostgreSQL)
- [ ] Endpoints CRUD basicos (auth, parakeets, recordings)
- [ ] Servicio de upload de audio
- [ ] Inicializar app React Native con navegacion basica

### Sprint 2: Pipeline de Audio
- [ ] Servicio de procesamiento de audio (preprocesamiento)
- [ ] Extraccion de features con librosa
- [ ] Integracion de YAMNet como feature extractor base
- [ ] Clasificador inicial (transfer learning)
- [ ] Endpoint POST /analysis/analyze funcional

### Sprint 3: App Movil Funcional
- [ ] Pantalla de grabacion con visualizacion de onda
- [ ] Upload de audio al backend
- [ ] Pantalla de resultados con indicadores visuales
- [ ] Historial de analisis con graficas
- [ ] Perfiles de periquitos

### Sprint 4: Inteligencia y Alertas
- [ ] Sistema de deteccion de anomalias (baseline por ave)
- [ ] Motor de alertas y notificaciones push
- [ ] Recomendaciones contextuales
- [ ] Etiquetado manual por usuario (feedback loop para mejorar modelo)
- [ ] Dashboard de tendencias

### Sprint 5: Pulido y Lanzamiento
- [ ] Testing E2E
- [ ] Optimizacion de modelo ML
- [ ] UI/UX polish
- [ ] Documentacion API
- [ ] Preparar para deploy (backend en cloud, app stores)

---

## Decisiones Tecnicas Clave

| Aspecto | Decision | Razon |
|---------|----------|-------|
| **Framework movil** | React Native (Expo managed) | Desarrollo rapido, buen soporte de audio, un solo codebase |
| **Backend** | Python + FastAPI | Ecosistema ML nativo, async, rapido |
| **Base de datos** | PostgreSQL | Robusto, JSON support para metadata |
| **ML Framework** | TensorFlow + YAMNet | Transfer learning facil, modelo pre-entrenado para audio |
| **Storage** | S3-compatible (MinIO local / AWS S3 prod) | Escalable para archivos de audio |
| **Auth** | JWT tokens | Estandar, stateless |
| **Estado movil** | Zustand | Ligero, simple, TypeScript friendly |
| **Procesamiento audio** | librosa + pydub + noisereduce | Stack probado para audio en Python |

---

## Consideraciones para 2-3 Periquitos

- **Separacion de fuentes**: En el MVP no intentaremos separar voces individuales (requiere modelos complejos como source separation). En su lugar, el usuario indica cuales periquitos estan presentes.
- **Analisis grupal**: El analisis se aplica al audio completo y se asocia a los periquitos presentes.
- **Perfil individual**: Se construye gradualmente con grabaciones donde el usuario indica que solo un periquito esta vocalizando.
- **Futuro**: Implementar speaker diarization para aves (distinguir automaticamente entre individuos por su firma acustica).
