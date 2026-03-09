# Local Dashboard Plan

## Goal

Use MaracuyAI locally on your Mac with:

- your Mac microphone
- a bird sample played from your phone
- a friendly browser dashboard
- a local backend running on `localhost`

## Local Flow

1. Start the local stack.
2. Open the browser dashboard.
3. Allow microphone access.
4. Press record.
5. Play the bird sample from your phone near the Mac microphone.
6. Stop recording.
7. Read the result board.

## What Has Been Prepared

- backend serves a local dashboard at `/dashboard/`
- dashboard records audio in the browser
- dashboard uploads audio to the local backend
- dashboard auto-creates a local guest identity
- dashboard auto-creates a default bird profile named `Maracuya`
- Docker Compose now runs Alembic migrations before starting the API

## Run

From the repo root:

```bash
./scripts/run_local_dashboard.sh
```

Then open:

```text
http://localhost:8000/dashboard/
```

## Expected Use

This is a local operator board, not the final product. It is meant to make testing easier while the core binary classifier is still being refined.

## Current Binary Behavior

The dashboard collapses the current backend mood output into a binary answer:

- `happy`, `relaxed`, `neutral` -> `good`
- `stressed`, `scared`, `sick` -> `bad`

That lets you test the intended product interaction now, even before the backend is fully reduced to a true binary model.
