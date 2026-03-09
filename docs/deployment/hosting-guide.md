# Hosting Guide

## Deployment Philosophy

MaracuyAI should remain local-first until evaluation evidence is stronger. The repo demonstrates local operational viability well; it does not yet justify heavy production framing.

## Recommended Order

### 1. Local backend + local dashboard

Best for:

- model iteration
- caretaker testing
- quick debugging

### 2. Local backend + controlled remote access

Reasonable for:

- device-specific testing
- private review by collaborators

### 3. Small hosted backend

Only becomes important once:

- the active model artifact is versioned clearly
- the inference contract is stable
- evaluation reporting is good enough to justify wider access

## What To Avoid

Do not let infrastructure sophistication outrun model maturity.

For this project, credibility comes more from:

- reproducible inference behavior
- evaluation artifacts
- honest versioning

than from:

- autoscaling
- cloud complexity
- aggressive deployment language
