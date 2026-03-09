# Training And Evaluation

## Goal

Train and evaluate a binary classifier that maps Maracuya recordings to:

- `good`
- `bad`

## Model Paths Present In The Repo

### 1. Dedicated binary Maracuya path

The repository now contains a dedicated binary adapter in `backend/app/ml/maracuya_binary_model.py`. It is designed to load an external trained Keras artifact for local testing.

Important limitation:

- the repo does not commit that trained model file
- the local stack looks for it at `~/Downloads/modelo_periquitos.keras`

That means the binary path is operationally real, but its strongest artifact is external to the repo.

### 2. Legacy repo-native path

The repository also contains:

- a broader CNN path
- statistical scoring
- ensemble logic
- training utilities in `backend/app/ml/training/`

This legacy path is useful engineering evidence and fallback behavior, but it is not the cleanest expression of the current product definition.

## What The Training Utilities Show

The training script in `backend/app/ml/training/train_from_v2_data.py` demonstrates:

- binary folder assumptions (`Estres/` and `Feliz/`)
- spectrogram preprocessing
- augmentation
- TensorFlow model training
- metric generation hooks

That is strong evidence of applied ML workflow design, even though the repo does not yet publish benchmark results.

## Modeling Strategy

The disciplined progression for this project is:

1. define the label system clearly
2. establish a simple baseline
3. evaluate the candidate CNN
4. promote a model only when the evidence is written down

## Metrics To Track

At minimum:

- accuracy
- precision
- recall
- F1 score
- confusion matrix

If the classes are imbalanced or the decision cost is asymmetric, accuracy alone is not enough.

## Current Capability Language

The most honest language for the repo is:

- `binary-capable`
- `neural-capable`
- `prototype-ready for local inference`

The repo should not claim:

- validated production model
- benchmarked clinical or veterinary utility
- rigorous generalization beyond the observed personalized use case

## Promotion Rule

A model should only be treated as "promoted" when the repo can answer:

- what data split was used?
- what metrics were recorded?
- what failure cases were observed?
- what artifact and version were actually used for inference?
