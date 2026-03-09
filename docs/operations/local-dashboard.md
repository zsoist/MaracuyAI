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
- local Docker now looks for `~/Downloads/modelo_periquitos.keras` and uses it when present

## Run

From the repo root:

```bash
./scripts/run_local_dashboard.sh
```

The launcher resets the local demo database volume before starting. That keeps the Mac demo deterministic and avoids stale migration state from older runs.

If you want the dashboard to use the real binary CNN from the notebook instead of the fallback ensemble, place the trained file here before starting:

```text
~/Downloads/modelo_periquitos.keras
```

Then open:

```text
http://localhost:8000/dashboard/
```

## Expected Use

This is a local operator board, not the final product. It is meant to make testing easier while the core binary classifier is still being refined.

## Current Binary Behavior

- when `~/Downloads/modelo_periquitos.keras` exists, the backend uses that binary CNN directly
- otherwise the dashboard collapses the fallback backend mood output into a binary answer:

- `happy`, `relaxed`, `neutral` -> `good`
- `stressed`, `scared`, `sick` -> `bad`

That lets you test the intended product interaction now, even before the backend is fully reduced to a true binary model.
