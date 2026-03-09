# Hosting Guide

## Recommendation

Do not optimize hosting before the binary classifier is validated.

For now, the deployment goal is simple:

- run the inference API
- let a client send audio
- get back `good` or `bad`

## Best Dev Setup

### Option A: local backend + local client

Use this while the model is still changing quickly.

### Option B: local backend + Cloudflare Tunnel

Use this for remote device testing or small private beta.

### Option C: small VPS

Use this only after:

- model behavior is stable
- the API contract is stable
- you actually need shared access

## Hosting Principle

The model and evaluation loop matter more than production infrastructure right now.

If the classifier is still evolving weekly, prioritize:

- repeatable training
- versioned inference
- simple deploys

over:

- autoscaling
- complex cloud topology
- heavy mobile release operations
