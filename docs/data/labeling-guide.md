# Labeling Guide

## Purpose

MaracuyAI is only as credible as its labeling rules. This project should prefer a simple, disciplined binary labeling scheme over a wider but noisier emotional taxonomy.

## Binary Labels

### `good`

Use `good` when the recording reflects a routine, non-stressed baseline for Maracuya, for example:

- calm or familiar vocal behavior
- social or playful sounds that do not appear agitated
- recordings that the caretaker would reasonably describe as "normal"

### `bad`

Use `bad` when the recording appears to reflect stress, agitation, or clearly negative deviation from baseline, for example:

- alarm-like calling
- repeated high-tension or distressed vocalization
- behavior that the caretaker consistently interprets as "something is off"

## Annotation Rule

Do not label by imagination. Label by observed behavior pattern plus caretaker context.

If a recording is too noisy, too short, or ambiguous:

- exclude it from the labeled set
- mark it for review
- or retain it as unlabeled exploratory data

## Recommended Metadata

For each recording, capture at least:

- recording identifier
- timestamp or collection date
- source device
- duration
- manual label
- annotator confidence
- short notes on why the label was chosen

## Segment-Level Considerations

The training utilities in this repo segment longer recordings. That means labeling discipline should consider both:

- clip-level intent: why the recording exists
- segment-level quality: whether each segment contains usable bird audio

Avoid assuming every segment cut from a labeled clip is equally informative.

## Split Strategy

Use at minimum:

- training split
- validation split
- held-out test split

Do not evaluate on audio that has already been seen during training, and avoid leakage through near-duplicate clips.

## Folder Convention Already Reflected In The Repo

The current legacy training script expects a binary folder structure:

- `Estres/`
- `Feliz/`

That is a practical starting point, but it should eventually be paired with an explicit manifest or dataset note so label decisions are reviewable outside the folder names alone.
