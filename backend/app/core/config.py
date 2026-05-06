from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    project_name: str = 'AI Clinic Booking & Patient CRM Platform'
    api_v1_prefix: str = '/api/v1'

    secret_key: str = 'change-me-secret-key'
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = 'HS256'

    database_url: str = 'postgresql+psycopg://postgres:postgres@db:5432/clinic'

    frontend_url: str = 'http://localhost:3000'
    cors_origins: str = 'http://localhost:3000'

    app_timezone: str = 'UTC'

    openai_api_key: Optional[str] = None
    openai_model: str = 'gpt-4.1-mini'

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None

    telegram_bot_token: Optional[str] = None

    reminders_scheduler_enabled: bool = True

    @field_validator('cors_origins')
    @classmethod
    def normalize_cors_origins(cls, value: str) -> str:
        return value.strip()

    @property
    def cors_origins_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(',') if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
