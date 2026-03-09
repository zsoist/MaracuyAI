import json

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Parakeet Wellness AI"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/parakeet_wellness"
    DB_AUTO_CREATE_ON_STARTUP: bool = False
    ENFORCE_ALEMBIC_HEAD: bool | None = None

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
    RATE_LIMIT_BACKEND: str = "memory"  # "memory" or "redis"
    RATE_LIMIT_REDIS_URL: str = "redis://redis:6379/0"
    RATE_LIMIT_KEY_PREFIX: str = "rate-limit"
    RATE_LIMIT_REDIS_STRICT: bool = False

    # Guest identity
    GUEST_SECRET_MIN_LENGTH: int = 24

    # Feature flags
    FEATURE_CONTEXT_ENGINE: bool = True
    FEATURE_CAPTURE_QUALITY: bool = True
    FEATURE_IOS_UX_FOUNDATION: bool = True
    FEATURE_ADVANCED_REASONING: bool = False
    FEATURE_OFFLINE_RESILIENCE: bool = False
    FEATURE_SMART_DISCOVERY: bool = False

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    UPLOAD_DIR: str = "/app/uploads"
    S3_BUCKET: str = ""
    S3_REGION: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # Audio processing
    AUDIO_SAMPLE_RATE: int = 22050
    AUDIO_MIN_DURATION_SECONDS: float = 2.0
    AUDIO_MAX_DURATION_SECONDS: int = 300  # 5 minutes max
    AUDIO_SEGMENT_DURATION: float = 3.0  # seconds per analysis window
    MARACUYA_BINARY_MODEL_PATH: str = "/external/downloads/modelo_periquitos.keras"
    MARACUYA_BINARY_MODEL_THRESHOLD: float = 0.4

    # Context providers
    AIRNOW_API_KEY: str = ""
    CONTEXT_HTTP_TIMEOUT_SECONDS: float = 8.0
    CONTEXT_AUTO_REFRESH_ENABLED: bool = False
    CONTEXT_REFRESH_INTERVAL_SECONDS: int = 1800

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
        if self.ENFORCE_ALEMBIC_HEAD is None:
            self.ENFORCE_ALEMBIC_HEAD = not self.DEBUG and not self.DB_AUTO_CREATE_ON_STARTUP
        if self.RATE_LIMIT_BACKEND not in {"memory", "redis"}:
            raise ValueError("RATE_LIMIT_BACKEND must be either 'memory' or 'redis'.")
        if self.GUEST_SECRET_MIN_LENGTH < 16:
            raise ValueError("GUEST_SECRET_MIN_LENGTH must be at least 16.")
        return self

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
