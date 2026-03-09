# Training And Evaluation

## Goal

Train a binary classifier for Maracuya's audio:

- `good`
- `bad`

## Modeling Strategy

Start simple, then earn complexity.

### Stage 1: baseline

Build a baseline binary model first:

- spectrogram or feature-based input
- simple classifier
- measurable validation metrics

This gives you a reality check before relying on a larger CNN.

### Stage 2: CNN

Use the CNN path only after:

- the dataset is cleaned
- labels are stable
- the baseline is measured

### Stage 3: promotion

Promote a model only if it beats the baseline on the held-out test set.

## Evaluation Metrics

Track at least:

- accuracy
- precision
- recall
- F1 score
- confusion matrix

If one class is rarer, accuracy alone is not enough.

## Current Neural Capability

The repository includes neural-model code and training scripts, but the repo does not ship trained weights by default. That means the project currently has:

- implemented neural architecture
- partial training pipeline
- no guaranteed trained production model out of the box

The product should therefore be described as:

- `neural-capable`
- not yet `neural-proven` until the trained binary model is evaluated properly

## Promotion Rule

Do not ship a model because it exists.

Ship it only when you can answer:

- what data was it trained on?
- what test set did it fail on?
- what is the false positive / false negative tradeoff?
- what version is running in production?
