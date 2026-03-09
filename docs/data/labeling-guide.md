# Labeling Guide

## Purpose

The model is only as good as the label definition. For MaracuyAI, the labels must stay simple and consistent.

## Binary Labels

### `good`

Use `good` when the recording reflects normal or positive behavior, including:

- calm routine vocalization
- playful or social sounds
- non-agitated familiar sounds
- healthy baseline behavior

### `bad`

Use `bad` when the recording reflects stress, agitation, or negative concern, including:

- alarm-like calls
- distressed or repeated high-tension vocalization
- clear signs of agitation
- abnormal negative patterns compared to Maracuya's baseline

## Do Not Label By Guessing

If the recording is ambiguous, noisy, or too short, do not force it into the dataset without review.

Use one of these handling strategies:

- exclude it
- mark it for relabeling
- keep it as unlabeled data

## Suggested Metadata Per Recording

- recording id
- timestamp
- duration
- source device
- manual label
- label confidence from the human annotator
- notes

## Split Strategy

At minimum:

- train split
- validation split
- test split

Do not evaluate on recordings that the model already saw during training.

## Immediate Recommendation

You mentioned 200+ recordings but far fewer manually labeled samples. The highest-leverage next step is not more interface work. It is:

1. normalize the dataset
2. label more samples consistently
3. define a clean held-out test set
