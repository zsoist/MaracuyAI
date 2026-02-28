# v3 — Guía de Ejecución Paso a Paso

## Lo que vas a hacer

Entrenar un modelo CNN compatible con Project-MK-2 usando tus datos de audio de periquitos (carpetas Estres/ y Feliz/), generar los pesos, y colocarlos en el repo para que el ensemble los detecte automáticamente.

**Resultado:** El backend pasa de clasificador heurístico (confianza ~40-55%) a CNN real (confianza esperada ~70-85%).

---

## Paso 0: Preparar el entorno

```bash
# Clonar el repo (si no lo tienes)
git clone https://github.com/zsoist/Project-MK-2.git
cd Project-MK-2
```

Los archivos de entrenamiento ya vienen integrados en el repo:
```
backend/app/ml/
├── __init__.py
├── bird_classifier.py        # CNN dual-head (vocalization + mood)
├── ensemble.py                # Blending CNN + Statistical + Temporal
├── feature_engine.py          # 100+ audio features
├── statistical_classifier.py  # Gaussian-distance classifier
├── training/
│   ├── __init__.py            # Training module
│   ├── label_mapper.py        # v2 binary → soft multi-class labels
│   └── train_from_v2_data.py  # Full training pipeline
└── weights/
    └── .gitkeep               # Aquí irán los pesos generados
```

## Paso 1: Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
# matplotlib y scikit-learn ya están incluidos en requirements.txt
```

## Paso 2: Entrenar

```bash
cd backend

python -m app.ml.training.train_from_v2_data \
    --data-dir "C:\Users\WINDOWS\Documents\Maracuya\Archivos_audio" \
    --output-dir ./app/ml/weights \
    --augment \
    --epochs 80 \
    --batch-size 16
```

**Lo que genera:**
```
backend/app/ml/weights/
├── bird_classifier.weights.h5     ← LO QUE NECESITA EL REPO
├── bird_classifier_full.keras     ← Modelo completo (para debug)
├── training_metadata.json         ← Métricas
├── training_curves.png            ← Plots de loss/accuracy
└── evaluation_plots.png           ← Confusion matrices
```

## Paso 3: Verificar

```bash
# Levantar el backend
docker compose up -d

# Verificar que el modelo se cargó
curl http://localhost:8000/health
# Debe mostrar: "cnn_weights_loaded": true (en los logs del container)

# Ver logs
docker compose logs api | grep -i "weights"
# Debe decir: "Loaded trained bird classifier weights from ..."
```

## Paso 4: Verificar el cambio en el ensemble

Antes (sin pesos):
```json
{
  "classifier_weights": {"cnn": 0.05, "statistical": 0.65, "temporal": 0.30}
}
```

Después (con pesos):
```json
{
  "classifier_weights": {"cnn": 0.50, "statistical": 0.30, "temporal": 0.20}
}
```

## Paso 5: Exponer al exterior (para la app móvil)

```bash
# Opción rápida
cloudflared tunnel --url http://localhost:8000

# Copiar la URL y ponerla en mobile/.env:
# EXPO_PUBLIC_API_BASE_URL=https://xxxx.trycloudflare.com/api/v1
```

## Paso 6: Levantar la app móvil

```bash
cd mobile
npm install
npx expo start
```

---

## Troubleshooting

### "No se encontraron segmentos"
→ Verifica que `--data-dir` tenga subcarpetas `Estres/` y `Feliz/` con archivos `.wav`

### "Failed to load weights"
→ Verifica que `bird_classifier.weights.h5` esté en `backend/app/ml/weights/`
→ El modelo debe tener EXACTAMENTE la misma arquitectura que `bird_classifier.py`

### Los pesos no se detectan en Docker
→ Asegúrate de que el volumen monte la carpeta de weights:
```yaml
volumes:
  - .:/app
```
→ El archivo debe estar en `/app/app/ml/weights/bird_classifier.weights.h5` dentro del container

### Accuracy baja (<60%)
→ Normal con solo 2 clases mapeadas a 6+7. El statistical classifier compensa.
→ La accuracy real mejora conforme los usuarios etiqueten datos en la app.
