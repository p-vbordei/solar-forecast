"""Configuration settings using Pydantic"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/solar_forecast"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Weather API (deprecated - now using database)
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # SvelteKit Integration
    SVELTEKIT_URL: str = "http://localhost:5173"
    SVELTEKIT_API_TIMEOUT: int = 30  # seconds

    # Weather Data Settings
    WEATHER_FRESHNESS_MINUTES: int = 15  # Data older than this triggers sync
    WEATHER_SYNC_TIMEOUT: int = 30       # Timeout for sync operations
    WEATHER_MAX_RETRIES: int = 3         # Max retries for sync failures
    WEATHER_RETRY_DELAY: int = 2         # Seconds between retries
    
    # ML Models
    MODELS_PATH: str = "/app/models"
    DEFAULT_MODEL: str = "solar-forecast-lstm"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # Monitoring
    ENABLE_METRICS: bool = True
    LOG_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


# Create settings instance
settings = Settings()