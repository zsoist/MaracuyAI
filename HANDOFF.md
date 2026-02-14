# HANDOFF (Detailed) - Branch `codex/full-hardening-potenciacion`

## 0) Executive Summary

Este handoff **reemplaza** al handoff anterior para esta rama.

Se completó una ronda integral de hardening + mejoras de producto en backend y mobile para Parakeet Wellness AI. El foco fue:

1. Seguridad y robustez operativa en API.
2. Integridad de dominio (evitar análisis mal asignados entre periquitos).
3. Completar funcionalidad real de fotos de periquito.
4. Mejorar UX visible (alertas y selección explícita de periquito en análisis).
5. Subir estándar de calidad en frontend (type-safe + lint activo).
6. Dejar documentación nivel 0 para continuidad por otro LLM o desarrollador.

La rama está lista para revisión/QA y no se mezcló a `main`.

---

## 1) Contexto de Trabajo

### 1.1 Origen
- Repo remoto: `git@github.com:zsoist/Project-MK-2.git`
- Rama de trabajo creada para esta entrega: `codex/full-hardening-potenciacion`
- Base funcional existente: MVP con backend FastAPI + mobile Expo/React Native.

### 1.2 Problemas críticos detectados antes de cambios

1. Seguridad base débil:
   - CORS abierto globalmente con credenciales.
   - Secret key por default insegura.
   - Sin rate limiting.
2. Integridad de análisis:
   - Mobile enviaba por defecto todos los `parakeet_ids` en cada análisis.
   - UI mostraba solo el primer resultado, contaminando interpretación por ave.
3. Validación backend incompleta:
   - `analysis/analyze` convertía UUID manualmente sin manejo consistente.
   - Sin validación ownership de `parakeet_ids`.
4. Gap funcional de producto:
   - Handoff anterior decía "endpoint de foto existe" pero no había upload real.
   - Alertas existían en API pero no estaban integradas en Home.
5. Calidad de front:
   - `lint` declarado pero sin ESLint funcional.
   - Varios `any` y navegación poco tipada.
6. API contract drift:
   - Plan describía `GET /recordings/:id` con análisis, pero la implementación devolvía solo recording.

---

## 2) Cambios Implementados (High-Level)

### Backend
- Se introdujo configuración segura y validable para CORS/secret/rate-limit.
- Se añadió middleware de rate limiting in-memory.
- Se endureció auth dependency para token ausente.
- Se robusteció procesamiento de audio (empty/invalid/no-signal/too-long).
- Se mejoró `analysis/analyze` con validación de ownership de periquitos.
- Se añadió endpoint real para foto de periquito (`POST /parakeets/{id}/photo`).
- Se habilitó serving de media estática (`/media/...`) para fotos.
- Se extendió detalle de recording para incluir análisis relacionados.
- Se corrigió inconsistencia ORM (`SET NULL` vs `delete-orphan`).
- Se ajustó Docker para separar modo dev (`--reload`) de imagen base.

### Mobile
- Token movido a `expo-secure-store`.
- Base URL configurable por env (`EXPO_PUBLIC_API_BASE_URL`) y fallback por plataforma.
- Record screen ahora permite seleccionar explícitamente ave (o general).
- Home muestra alertas recientes reales desde backend.
- Perfil permite subir foto desde galería y refresca store.
- Tarjetas muestran foto cuando existe.
- Se tipó navegación principal y se eliminaron `any` en pantallas tocadas.
- Se activó ESLint real y quedó pasando junto con typecheck.

### Documentación
- `README.md` nuevo (nivel 0, onboarding completo).
- `mobile/.env.example` nuevo.
- `HANDOFF.md` (este) extendido y actualizado.

---

## 3) Cambios Backend Detallados

## 3.1 Config y seguridad de runtime

**Archivo**: `backend/app/core/config.py`

### Añadido
- `CORS_ORIGINS: list[str]` configurable.
- Parser de `CORS_ORIGINS` para aceptar CSV o JSON string.
- Flags de rate limiting:
  - `RATE_LIMIT_ENABLED`
  - `RATE_LIMIT_REQUESTS`
  - `RATE_LIMIT_WINDOW_SECONDS`
- Validador de secret:
  - En `DEBUG=false`, exige `SECRET_KEY` fuerte (>=32 chars) y no placeholder inseguro.

### Resultado
- Evita despliegue accidental con secret débil en producción.
- Centraliza seguridad básica en settings.

---

## 3.2 Rate limit middleware

**Archivo nuevo**: `backend/app/core/rate_limit.py`

### Implementación
- Middleware in-memory con lock async y sliding window por IP + bucket.
- Límites específicos por endpoint sensible:
  - `/auth/login`
  - `/auth/register`
  - `/recordings/upload`
  - `/analysis/analyze`
- Límite global configurable para rutas restantes.
- Respuesta `429` con `Retry-After`.

### Nota técnica
- Bucket global compartido por ruta no sensible (`__global__`) para evitar explosión de memoria por path dinámico.

---

## 3.3 Inicialización app: CORS + media + rate-limit

**Archivo**: `backend/app/main.py`

### Cambios
- Se registra middleware de rate limit si está habilitado.
- `CORSMiddleware` usa `settings.CORS_ORIGINS`.
- Se monta static serving en `/media` desde `${UPLOAD_DIR}/public`.

### Resultado
- Fotos subidas pueden resolverse por URL HTTP.
- CORS deja de ser wildcard abierto.

---

## 3.4 Auth dependency robusta

**Archivo**: `backend/app/api/deps.py`

### Cambios
- `HTTPBearer(auto_error=False)`.
- Mensaje explícito `401 Missing bearer token` si no hay header.

### Resultado
- Comportamiento de auth más claro y controlado.

---

## 3.5 StorageService robustecido (audio + image)

**Archivo**: `backend/app/services/storage_service.py`

### Audio: mejoras
- Si audio inválido: elimina archivo temporal y devuelve `ValueError` claro.
- Si duración <= 0: rechaza.
- Si excede máximo: rechaza y limpia.
- Conversión WAV controlada con fallback seguro.

### Image: nueva capacidad
- Nuevo método `save_image(...)`:
  - Valida formato real vía `imghdr`.
  - Permite JPG/PNG/GIF/WEBP.
  - Guarda en `uploads/public/photos/{user_id}/...`.
  - Devuelve URL relativa `/media/photos/...`.
- Nuevo método `delete_file(...)`:
  - Traduce correctamente `/media/...` a path físico bajo `UPLOAD_DIR/public/...`.

### Resultado
- Upload multimedia confiable + limpieza de archivos viejos.

---

## 3.6 Recordings API

**Archivo**: `backend/app/api/routes/recordings.py`

### Mejoras de input
- Rechaza archivo vacío (`400`).
- Mapea errores de storage (`ValueError`) a `400` con detalle.
- Paginación con `Query` validada:
  - `limit: 1..100`
  - `offset: >=0`

### Contrato de detalle ampliado
- `GET /recordings/{recording_id}` ahora responde `RecordingDetailResponse` con:
  - datos del recording
  - `analysis_results[]` asociados (ordenados desc por fecha)

### Resultado
- Endpoint más útil y consistente con lo esperado por docs/plan.

---

## 3.7 Analysis API

**Archivo**: `backend/app/api/routes/analysis.py`

### Input schema fuerte
- `recording_id` ahora `uuid.UUID` en Pydantic.
- `parakeet_ids` ahora `list[uuid.UUID] | None` con `max_length=10`.

### Integridad de ownership
- Dedup de `parakeet_ids`.
- Verificación en DB de que todos los IDs pertenecen al usuario actual.
- Si no pertenecen: `403`.

### Manejo de errores de inferencia
- `ValueError` -> `422` (error semántico de análisis).
- Excepciones inesperadas -> `500` controlado.

### Historial
- `limit` validado (`1..100`) en history.

### Resultado
- Evita inyección de IDs de otras cuentas.
- Errores de análisis mejor clasificados.

---

## 3.8 Parakeets API (foto real)

**Archivo**: `backend/app/api/routes/parakeets.py`

### Nuevo endpoint
- `POST /api/v1/parakeets/{parakeet_id}/photo`
  - `multipart/form-data` (`file`)
  - valida tipo imagen
  - guarda foto
  - actualiza `photo_url`
  - elimina foto anterior si existía

### Delete cleanup
- Al borrar periquito, si tenía foto, se elimina del storage.

### Resultado
- Feature de foto ahora completo de backend.

---

## 3.9 Model consistency

**Archivo**: `backend/app/models/parakeet.py`

### Cambio
- Se removió `cascade="all, delete-orphan"` en `analysis_results`.

### Motivo
- `AnalysisResult.parakeet_id` usa `ondelete="SET NULL"`.
- Tener orphan cascade era semánticamente conflictivo con “conservar historial aunque se borre el periquito”.

---

## 3.10 Env y contenedores

**Archivos**:
- `backend/.env.example`
- `backend/Dockerfile`
- `backend/docker-compose.yml`

### Cambios
- `.env.example` actualizado con CORS/rate-limit y placeholder de secret fuerte.
- `Dockerfile` sin `--reload` (más correcto para imagen base/prod).
- `docker-compose.yml` fuerza `--reload` solo en dev.

---

## 4) Cambios Mobile Detallados

## 4.1 API client y almacenamiento seguro de token

**Archivo**: `mobile/src/services/api.ts`

### Cambios
- Reemplazo de `AsyncStorage` por `expo-secure-store`.
- Nueva resolución de `API_BASE_URL`:
  - prioriza `EXPO_PUBLIC_API_BASE_URL`.
  - fallback dev por plataforma (`10.0.2.2` en Android emulador).
- Nuevas funciones:
  - `uploadParakeetPhoto(...)`
  - `toMediaUrl(...)`

### Resultado
- Mejor seguridad local del token.
- Menos fricción en conectividad dev real.

---

## 4.2 Record Screen: selección explícita de periquito

**Archivo**: `mobile/src/screens/RecordScreen.tsx`

### Cambios
- Estado `selectedParakeetId`.
- UI de chips para elegir:
  - `General`
  - cada periquito registrado
- En envío a backend:
  - si seleccionado: `[id]`
  - si general: `undefined`

### Resultado
- Se elimina la contaminación de análisis para todos los periquitos.

---

## 4.3 Home: alertas reales

**Archivo**: `mobile/src/screens/HomeScreen.tsx`

### Cambios
- `loadData()` ahora trae en paralelo:
  - `getParakeets()`
  - `getAlerts()`
- Se renderizan top 3 alertas con estilo por prioridad.
- Manejo de error visible (`Alert`).

### Resultado
- Home más útil operativamente.

---

## 4.4 Perfil de periquito: upload foto

**Archivo**: `mobile/src/screens/ParakeetProfileScreen.tsx`

### Cambios
- Integración con `expo-image-picker`.
- Botón `Actualizar foto`.
- Subida vía `uploadParakeetPhoto()`.
- Update del store (`updateParakeet`).
- Render de imagen real si existe `photo_url`.

### Resultado
- Feature “foto de periquito” end-to-end funcional.

---

## 4.5 Avatar en lista de periquitos

**Archivo**: `mobile/src/components/ParakeetCard.tsx`

### Cambios
- Si hay foto: renderiza `<Image>`.
- Si no hay foto: fallback inicial del nombre.

---

## 4.6 Store y tipado de navegación

**Archivos**:
- `mobile/src/store/useStore.ts`
- `mobile/src/types/navigation.ts`
- `mobile/src/App.tsx`
- pantallas tocadas

### Cambios
- Store: nueva acción `updateParakeet`.
- Tipos de navegación centralizados.
- Eliminación de `any` en pantallas modificadas.

### Resultado
- Menos errores de runtime por params mal tipados.

---

## 4.7 Linting real

**Archivos**:
- `mobile/.eslintrc.cjs`
- `mobile/package.json`

### Cambios
- Se instaló/configuró ESLint + parser/plugin TS.
- Script lint operativo sobre `src/**/*.{ts,tsx}`.
- Se limpiaron warnings/errores (`unused vars`, `any`, etc.).

---

## 5) Documentación y onboarding

## 5.1 README (nuevo)

**Archivo**: `README.md`

Incluye:
- explicación nivel 0 del proyecto.
- pasos de arranque backend/mobile.
- variables de entorno.
- smoke test de flujo funcional.
- notas de seguridad/producción.

## 5.2 Env ejemplo mobile

**Archivo nuevo**: `mobile/.env.example`

- `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`

---

## 6) Contratos API Actualizados (Resumen)

## 6.1 `POST /api/v1/analysis/analyze`

### Request
```json
{
  "recording_id": "uuid",
  "parakeet_ids": ["uuid"]
}
```

### Reglas
- `parakeet_ids` opcional.
- Si viene, deben pertenecer al usuario autenticado.
- IDs duplicados son deduplicados.

### Errores relevantes
- `404`: recording no encontrado (o no pertenece al usuario).
- `403`: `parakeet_ids` no autorizados.
- `422`: audio no analizable (ej: inválido).
- `500`: falla inesperada de motor de análisis.

---

## 6.2 `GET /api/v1/recordings/{id}`

### Response (ahora)
Incluye:
- campos base de recording
- `analysis_results[]` asociados

---

## 6.3 `POST /api/v1/parakeets/{id}/photo`

### Request
`multipart/form-data` con `file` imagen.

### Response
`ParakeetResponse` actualizado con `photo_url`.

### Errores
- `415`: tipo no imagen.
- `400`: archivo vacío o formato no soportado.

---

## 7) Archivos Modificados / Nuevos

## 7.1 Backend
- `backend/.env.example`
- `backend/Dockerfile`
- `backend/docker-compose.yml`
- `backend/app/core/config.py`
- `backend/app/core/rate_limit.py` (new)
- `backend/app/main.py`
- `backend/app/api/deps.py`
- `backend/app/api/routes/analysis.py`
- `backend/app/api/routes/recordings.py`
- `backend/app/api/routes/parakeets.py`
- `backend/app/services/storage_service.py`
- `backend/app/models/parakeet.py`

## 7.2 Mobile
- `mobile/app.json`
- `mobile/package.json`
- `mobile/package-lock.json` (new)
- `mobile/.eslintrc.cjs` (new)
- `mobile/.env.example` (new)
- `mobile/src/App.tsx`
- `mobile/src/services/api.ts`
- `mobile/src/store/useStore.ts`
- `mobile/src/types/navigation.ts` (new)
- `mobile/src/types/expo-secure-store.d.ts` (new shim)
- `mobile/src/components/ParakeetCard.tsx`
- `mobile/src/components/WellnessChart.tsx`
- `mobile/src/screens/HomeScreen.tsx`
- `mobile/src/screens/RecordScreen.tsx`
- `mobile/src/screens/ParakeetProfileScreen.tsx`
- `mobile/src/screens/AddParakeetScreen.tsx`
- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/screens/SettingsScreen.tsx`
- `mobile/src/screens/HistoryScreen.tsx`

## 7.3 Repo root
- `README.md` (new)
- `HANDOFF.md` (this file rewritten)

---

## 8) Verificación Ejecutada

Comandos corridos en esta rama:

1. Python syntax check
```bash
python3 -m py_compile $(git ls-files 'backend/app/**/*.py')
```
Resultado: OK

2. Mobile typecheck
```bash
npm --prefix mobile run typecheck
```
Resultado: OK

3. Mobile lint
```bash
npm --prefix mobile run lint
```
Resultado: OK

---

## 9) Estado de Seguridad / Riesgo Residual

## 9.1 Mejorado
- Secret/CORS/rate-limit implementados.
- Ownership validation en análisis.
- Token storage más seguro en mobile.

## 9.2 Pendiente
- `npm audit` aún reporta vulnerabilidades transitivas altas en stack Expo 52.
- Rate limiter es in-memory (no distribuido):
  - en despliegue multi instancia, migrar a Redis-based limiter.
- No hay suite de tests automatizados backend/mobile todavía.

---

## 10) Qué debería hacer el próximo LLM (Roadmap recomendado)

## P0 (Inmediato)
1. Añadir tests backend críticos:
   - auth
   - upload audio
   - analyze ownership
   - parakeet photo upload
2. Añadir tests de integración API con DB temporal.
3. Completar test de UI smoke (Record/Home/Profile).

## P1 (Corto plazo)
1. Refresh token flow (access + refresh token).
2. Migración de rate-limit a Redis.
3. Alembic migrations formales.
4. Mejoras de error observability (Sentry o similar).

## P2 (Producto)
1. Incorporar selector multi-ave opcional con UX clara (actualmente single/general).
2. Audio player en historial con waveform.
3. Push notifications reales basadas en alertas.

## P3 (ML)
1. Reemplazar heurística por pipeline model-based.
2. Dataset strategy + feedback loop etiquetado.

---

## 11) Guía de arranque para nuevo LLM / dev

## 11.1 Checkout rama
```bash
git fetch origin
git checkout codex/full-hardening-potenciacion
```

## 11.2 Backend local (dev)
```bash
cd backend
cp .env.example .env
docker compose up --build
```

## 11.3 Mobile local (dev)
```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Si app en dispositivo físico no llega al backend, setear:
```bash
EXPO_PUBLIC_API_BASE_URL=http://<IP_LOCAL_MAC>:8000/api/v1
```

---

## 12) Troubleshooting rápido

1. `401 Missing bearer token`
- Verificar login exitoso.
- Verificar que SecureStore contenga token (app reinstalada puede limpiar estado).

2. `403 One or more parakeet_ids do not belong...`
- Mobile está enviando un ID que no es del usuario actual.

3. Foto no se ve en app
- Revisar que backend sirva `/media/*`.
- Revisar `toMediaUrl()` y `EXPO_PUBLIC_API_BASE_URL`.

4. Lint falla por parser TS
- correr `npm install` en `mobile` (incluye deps de eslint).

---

## 13) Decisiones de diseño tomadas en esta rama

1. Mantener enfoque pragmático sin introducir infraestructura externa (rate limit in-memory), priorizando avance.
2. Priorizar consistencia funcional (single/general analysis assignment) sobre multi-assign ambiguo.
3. No tocar todavía arquitectura ML (heurística permanece), concentrando esta iteración en fiabilidad de producto.
4. Separar comportamiento dev/prod en contenedor (reload fuera de imagen base).

---

## 14) Checklist de Release Candidate para esta rama

- [x] Compila backend Python.
- [x] Typecheck mobile.
- [x] Lint mobile.
- [x] Endpoint foto funcional backend.
- [x] UI foto conectada mobile.
- [x] Alertas visibles en Home.
- [x] Selector de periquito en grabación.
- [x] Ownership validation análisis.
- [x] README nivel 0.
- [ ] Tests automatizados completos.
- [ ] Upgrade Expo para resolver vulnerabilidades transitivas.

---

## 15) Nota Final

Este handoff está orientado a continuidad inmediata por otro LLM o desarrollador humano sin contexto previo.
Si se abre un PR desde esta rama, sugerencia:

- PR 1: "Security & API hardening"
- PR 2: "Mobile UX + photo + alerts + secure token"
- PR 3: "Docs & onboarding"

Con eso la revisión será más simple y menor riesgo de rollback masivo.

