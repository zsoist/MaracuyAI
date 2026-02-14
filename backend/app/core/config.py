import json

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Parakeet Wellness AI"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/parakeet_wellness"

    # JWT
    SECRET_KEY: str = "replace-with-a-very-long-random-secret-32-plus-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:19006",
            "http://127.0.0.1:19006",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 120
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    UPLOAD_DIR: str = "/app/uploads"
    S3_BUCKET: str = ""
    S3_REGION: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # Audio processing
    AUDIO_SAMPLE_RATE: int = 22050
    AUDIO_MAX_DURATION_SECONDS: int = 300  # 5 minutes max
    AUDIO_SEGMENT_DURATION: float = 3.0  # seconds per analysis window

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                return json.loads(raw)
            return [item.strip() for item in raw.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        insecure_values = {
            "",
            "change-me-in-production-use-a-real-secret-key",
            "replace-with-a-very-long-random-secret-32-plus-chars",
        }
        if not self.DEBUG and (self.SECRET_KEY in insecure_values or len(self.SECRET_KEY) < 32):
            raise ValueError(
                "SECRET_KEY must be set to a strong value (32+ chars) when DEBUG is false."
            )
        return self

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
