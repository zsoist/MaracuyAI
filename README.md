# Parakeet Wellness AI

App móvil + backend para analizar vocalizaciones de periquitos y estimar su estado.

## Resumen rápido (nivel 0)

- `backend/`: servidor API (Python + FastAPI + PostgreSQL).
- `mobile/`: app React Native (Expo).
- Flujo: grabas audio en la app -> se sube al backend -> backend analiza -> devuelve resultado.

## Qué quedó mejorado

- Seguridad básica del backend:
  - `SECRET_KEY` obligatoria fuerte en producción.
  - CORS configurable (ya no abierto a todo).
  - Rate limit para frenar abuso (login/upload/analyze).
- Integridad de análisis:
  - Ya no analiza para "todos los periquitos" sin control.
  - Validación estricta de IDs y ownership.
- API más completa:
  - `GET /recordings/{id}` ahora devuelve también los análisis del recording.
  - `POST /parakeets/{id}/photo` para subir foto real.
- UX móvil:
  - Selección explícita de periquito en pantalla de grabación.
  - Alertas reales en Home.
  - Foto de perfil de periquito en tarjeta y perfil.
  - Token guardado en `SecureStore` (más seguro que AsyncStorage).
- Calidad:
  - TypeScript y ESLint funcionando.

## Requisitos

- Python 3.12+
- Node.js 18+ (recomendado)
- Docker + Docker Compose (recomendado para backend)

## 1) Levantar backend

```bash
cd /Users/daniel/backend
cp .env.example .env
docker compose up --build
```

Backend en: `http://localhost:8000`  
Swagger en: `http://localhost:8000/docs`

## 2) Levantar app móvil

```bash
cd /Users/daniel/mobile
cp .env.example .env
npm install
npx expo start
```

Si usas celular físico, cambia `EXPO_PUBLIC_API_BASE_URL` en `.env` por la IP local de tu Mac:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.X.X:8000/api/v1
```

## 3) Flujo funcional recomendado (prueba rápida)

1. Regístrate en la app.
2. Crea 1 periquito.
3. En su perfil, sube una foto.
4. Ve a `Grabar`, elige periquito (o `General`) y graba.
5. Revisa resultado y vuelve a Home para ver alertas.
6. En `Historial` valida que los análisis queden en el ave correcta.

## Variables importantes

### Backend (`backend/.env`)

- `DEBUG=true` para desarrollo local.
- `SECRET_KEY` debe ser larga y aleatoria en producción.
- `CORS_ORIGINS` lista de orígenes permitidos, separados por coma.

### Mobile (`mobile/.env`)

- `EXPO_PUBLIC_API_BASE_URL` URL base del backend.

## Notas

- `docker-compose.yml` está configurado para desarrollo con autoreload.
- La imagen base del backend (`Dockerfile`) ya no usa `--reload` en producción.
- `npm audit` todavía muestra vulnerabilidades transitivas de Expo 52; para cerrarlas hay que migrar a Expo 54+.
