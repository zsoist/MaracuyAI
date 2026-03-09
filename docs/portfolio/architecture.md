# Architecture Notes

## System View

```mermaid
flowchart TD
    A["Capture or upload audio"] --> B["Recording ingestion<br/>FastAPI upload route"]
    B --> C["Storage normalization<br/>convert and persist media"]
    C --> D["Inference service"]
    D --> E["Binary Maracuya CNN<br/>preferred when local model artifact exists"]
    D --> F["Fallback repo inference path<br/>legacy ensemble / preprocessing stack"]
    E --> G["Binary verdict + confidence"]
    F --> G
    G --> H["Analysis result persistence"]
    G --> I["Dashboard and mobile presentation"]
```

## From Recording To Result

```mermaid
sequenceDiagram
    participant User
    participant Client as "Dashboard / Mobile"
    participant API as "FastAPI API"
    participant Storage as "StorageService"
    participant ML as "MLService"
    participant DB as "Postgres"

    User->>Client: record audio or upload file
    Client->>API: POST /recordings/upload
    API->>Storage: save and normalize audio
    Storage-->>API: file path + metadata
    API->>DB: persist recording row
    API-->>Client: recording_id
    Client->>API: POST /analysis/analyze
    API->>ML: analyze_audio(file_path)
    ML-->>API: label + confidence + metadata
    API->>DB: persist analysis result
    API-->>Client: analysis payload
```

## Evaluation Workflow

```mermaid
flowchart LR
    A["Collect recordings"] --> B["Apply labeling rules"]
    B --> C["Create train / validation / test split"]
    C --> D["Train candidate model"]
    D --> E["Measure metrics and inspect failures"]
    E --> F{"Better than baseline?"}
    F -->|No| G["Revise data / preprocessing / labels"]
    F -->|Yes| H["Promote to local inference path"]
    G --> C
```

## Current Architectural Reality

### Strong, current layers

- upload + storage
- inference routing
- local dashboard loop
- persistence of recordings and analyses

### Legacy or secondary layers

- broader weather / AQI context engine
- alerting and wellness-summary interpretations
- mobile surfaces that still expose older mood-centric scope

Those secondary layers are still real code, but they are not the center of the current portfolio story.

## Demo Asset Placeholders

- TODO: add screenshot of the local dashboard verdict screen
- TODO: add short GIF of Mac microphone testing flow
- TODO: add screenshot of a mobile recording/upload screen
