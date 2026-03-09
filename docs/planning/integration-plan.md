# Integration Plan

## Objective

Move the repository from "interesting prototype with broad historical scope" to "credible personalized audio-ML system with clearer evidence boundaries."

## Main Gap

The repo already has real implementation breadth. The biggest remaining work is not adding more features; it is aligning the codebase, docs, and evaluation story around the same narrow product definition.

## Workstreams

### 1. Data work

- document the dataset structure actually used for training
- tighten labeling discipline
- preserve a held-out evaluation split

### 2. Model work

- keep the binary model path explicit
- record which artifact is active during local testing
- publish evaluation artifacts when available

### 3. API work

- make binary output the first-class contract everywhere
- reduce legacy mood-heavy payload expectations over time

### 4. Client work

- keep the local dashboard as the fastest operator surface
- decide whether the mobile app should be simplified or explicitly framed as broader experimental UI

### 5. Credibility work

- keep scope statements consistent across docs
- mark legacy features clearly
- add demo and evaluation artifacts as they become available

## Priority Rule

Features should be prioritized based on whether they improve one of these:

- data quality
- evaluation quality
- inference reliability
- clarity of the user-facing result

If a feature does not improve one of those, it is secondary.
