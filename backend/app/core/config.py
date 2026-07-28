from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "AML_Platform-backend"
    environment: str = "local"

    api_prefix: str = "/api"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://aml-platform.pages.dev"

    database_url: str = "sqlite:///./dev.db"
    google_service_account_key: str = ""
    google_drive_shared_drive_id: str = ""
    google_drive_parent_folder_id: str = ""

    # OAuth 2.0 for personal Google Drive (has storage quota)
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_drive_refresh_token: str = ""
    hf_token: str = ""

    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if not raw:
            return []
        return [part.strip() for part in raw.split(",") if part.strip()]

    def openapi_servers(self) -> list[dict[str, Any]]:
        origins = self.cors_origin_list()
        urls: list[str] = []
        for origin in origins:
            try:
                urls.append(str(AnyHttpUrl(origin)))
            except Exception:
                continue
        return [{"url": url} for url in urls]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
