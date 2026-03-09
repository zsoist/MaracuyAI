# Product Definition

## Name

`MaracuyAI` is named after `Maracuya`, your girlfriend's bird.

## One-Sentence Definition

MaracuyAI is a personalized system that classifies Maracuya's vocal audio as either `good` or `bad`.

## Problem

The user can hear that the bird sounds different, but cannot reliably turn those sounds into a consistent judgment. The system should reduce that ambiguity by analyzing recorded audio and returning a binary state with confidence.

## Primary User

The owner or caretaker of Maracuya.

## Primary Job To Be Done

`When I record Maracuya making sounds, I want the system to tell me whether the bird sounds okay or stressed so I can react quickly and track changes over time.`

## V1 Output Contract

Every successful inference should return:

- `label`: `good` or `bad`
- `confidence`: number from 0 to 1
- `recording_id`: identifier
- `model_version`: identifier
- `notes`: optional short explanation

## Success Criteria

V1 is successful if it can:

- classify held-out recordings better than chance
- produce stable results on repeated recordings of similar sounds
- support a simple user flow from recording to answer
- keep the label system understandable to a non-technical user

## Non-Goals

Not part of the first real version:

- diagnosing illness
- supporting many birds
- detecting species
- explaining every vocalization subtype
- building a generalized emotional intelligence system
- turning this into a broad pet-health platform

## Product Position

The product is not "an app with AI features."

It is:

- a binary audio decision engine
- wrapped in a usable interface
- trained on recordings of one specific bird
