# System Design

## Design Goal

Build the smallest system that can reliably answer:

`good or bad?`

## Preferred V1 Architecture

### 1. Data layer

- raw recordings
- segment metadata
- labels
- train/validation/test splits

### 2. Model layer

- preprocessing pipeline
- baseline binary model
- CNN training pipeline
- evaluation reports

### 3. Inference layer

- single API endpoint
- upload or reference audio
- return binary prediction and confidence

### 4. Client layer

- record or upload audio
- display result
- optionally show history

## What To Simplify From The Current Repo

The current codebase is broader than the product:

- multi-class mood modeling
- broader "wellness" framing
- weather/context engine
- larger mobile information architecture

Those systems are not the current center of gravity. They should be treated as optional follow-on work, not as the definition of the product.

## Recommended Target Repository Shape

```text
.
|-- README.md
|-- docs/
|-- backend/
|   |-- app/
|   |-- scripts/
|   `-- tests/
|-- mobile/
`-- research/
    |-- datasets/
    |-- experiments/
    `-- reports/
```

`research/` does not need to exist yet, but conceptually the project should think in those terms: experiments and evaluation first, interface second.

## Current Code Reuse Strategy

Keep:

- audio preprocessing code
- storage and upload code
- existing backend shell
- existing mobile recording shell

Refactor over time:

- collapse multi-class outputs into binary outputs for product use
- make the training/evaluation path explicit
- reduce product claims until the binary classifier is validated
