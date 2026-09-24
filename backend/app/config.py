from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Experiment Governor API"
    app_version: str = "1.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = (
        "postgresql+psycopg://zero_protocol:zero_protocol@localhost:5432/zero_protocol"
    )
    default_organization_id: str = "pulseboard"
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
