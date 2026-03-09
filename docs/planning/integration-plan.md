# Rebuild Plan

## Objective

Turn the current repository into a cleaner system centered on one product:

`binary audio classification for Maracuya`

## Current Gap

The repo currently has more architecture than product clarity.

What is overbuilt relative to the real goal:

- multi-class emotion framing
- wider wellness language
- broader mobile feature set
- context and environment systems

What is under-defined relative to the real goal:

- binary label rules
- dataset quality
- evaluation protocol
- model promotion criteria

## Rebuild Phases

### Phase 0: product reset

- define the real product
- define binary outputs
- define non-goals

### Phase 1: data foundation

- inventory recordings
- relabel consistently
- create train/validation/test split
- document label policy

### Phase 2: modeling baseline

- run a simple baseline
- record failure cases
- establish minimum acceptable metrics

### Phase 3: binary CNN path

- adapt or retrain the neural model for binary output
- compare against the baseline
- keep versioned metrics

### Phase 4: inference API

- expose a minimal endpoint
- return label, confidence, model version

### Phase 5: client simplification

- keep the mobile app if useful
- or replace it with a simpler web client
- optimize for recording and answer, not product breadth

## Decision Rule

Any feature that does not help:

- collect better data
- train a better binary model
- evaluate the model
- deliver the result cleanly

should be considered secondary for now.
