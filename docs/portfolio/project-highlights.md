# Project Highlights

## What It Is

MaracuyAI is a personalized bird-audio classification prototype. It analyzes recordings from a specific parakeet, `Maracuya`, and aims to answer a narrow question: does this vocalization sound okay or stressed?

## Why It Is Interesting

- it applies ML to a real, messy audio interpretation problem
- it is centered on one user's actual use case rather than on a toy benchmark
- it combines model work with a working backend and local user interface

## Technologies Used

- FastAPI
- PostgreSQL
- SQLAlchemy + Alembic
- TensorFlow
- librosa / NumPy / SciPy / scikit-learn
- Expo / React Native / TypeScript
- Docker Compose

## Technical Skills It Demonstrates

- applied ML prototyping
- audio preprocessing and feature handling
- inference-system integration
- API and persistence design
- local operator workflow design
- technical documentation and scope control

## What Already Works

- audio upload and normalization
- analysis persistence
- local dashboard for Mac microphone testing
- Expo mobile client
- binary model path when a trained `.keras` artifact is available locally

## What Is Still Experimental

- formal model evaluation and benchmark reporting
- fully binary-first API and mobile surface
- long-term validation of the personalized classifier
- broader context / alert features that remain from earlier scope

## What Makes It Different From A Tutorial Project

- the problem came from a real collaborative use case
- the repo includes end-to-end system integration, not just notebook code
- the docs explicitly separate prototype capability from validated capability
- the strongest engineering move in the project was scope reduction, not feature expansion
