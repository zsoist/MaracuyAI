from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Parakeet Wellness AI"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/parakeet_wellness"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-a-real-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

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

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
