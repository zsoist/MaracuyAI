# Repo Reset Note

Last updated: **March 9, 2026**

## What Changed

The repository used to describe a broader parakeet wellness platform with:

- multi-class mood outputs
- wider product scope
- heavier mobile-app framing
- extra architecture around context and platform features

That is no longer the source of truth.

## New Source Of Truth

The project is now defined as:

`a binary audio classifier for Maracuya`

The product question is:

`Does Maracuya sound okay, or stressed/bad?`

## What The Current Codebase Still Represents

The codebase still contains a larger implementation footprint:

- mobile app shell
- FastAPI backend
- CNN-related code
- statistical fallback code
- preprocessing and storage systems

This is useful implementation material, but it is not the product definition anymore.

## Working Rule Going Forward

When product scope and current code conflict, prefer the new documentation and simplify toward:

- binary labels
- measurable model evaluation
- thin inference API
- thin client UX

## Immediate Priority

The next important work is:

1. clean the dataset
2. define binary labels clearly
3. measure baseline performance
4. validate a trainable binary model
5. only then decide how much app complexity is justified
