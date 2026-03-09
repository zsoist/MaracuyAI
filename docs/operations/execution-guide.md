# Execution Guide

## Goal

Run MaracuyAI as a binary audio-classification project, not as a broad app-first project.

## Working Loop

### 1. Prepare data

- gather recordings of Maracuya
- remove unusable files
- define `good` and `bad`
- split train, validation, and test sets

### 2. Establish a baseline

Before trusting a CNN, train a simple baseline and record its metrics.

Minimum outputs:

- accuracy
- precision
- recall
- F1
- confusion matrix

### 3. Train the binary model

Use the current backend ML code as a starting point, but the target output for product use is binary.

That means:

- map inference to `good` or `bad`
- keep the model version explicit
- save evaluation artifacts

### 4. Validate before productizing

Do not move a model into product use unless:

- it beats the baseline
- it performs on a held-out test set
- you know what mistakes it makes

### 5. Expose through a thin API

The API contract should stay simple:

- submit audio
- receive `good` or `bad`
- receive confidence and model version

### 6. Keep the client thin

The mobile or web client should mainly:

- record audio
- upload audio
- show the answer
- optionally show recent history

## Practical Repo Rule

If a task does not improve one of these four things, it is probably not core right now:

- labels
- evaluation
- model quality
- inference reliability
