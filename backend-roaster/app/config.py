"""Environment configuration via Pydantic Settings."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "AI Offer Roaster"
    app_env: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # CORS - comma-separated origins, or "*" for all
    cors_origins: str = (
        "http://localhost:5173,http://localhost:5174,http://localhost:5175,"
        "http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,"
        "http://localhost:3000"
    )

    # LLM (OpenAI)
    openai_api_key: str = Field(..., description="Required OpenAI API key")
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    openai_model_wow: str = "gpt-4o"
    openai_timeout_seconds: float = 60.0
    max_completion_tokens: int = 2500
    temperature: float = 0.4

    # Jina Reader
    jina_reader_base_url: str = "https://r.jina.ai"
    jina_api_key: str = ""
    scrape_timeout_seconds: float = 30.0
    scrape_max_chars: int = 12000

    # Roast behaviour
    roast_objection_count: int = 3
    roast_json_retries: int = 2
    two_pass_enabled: bool = True

    # Rate limiting (per client IP, in-memory)
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 8
    rate_limit_window_seconds: int = 3600
    rate_limit_wow_requests: int = 3

    # Lead capture
    leads_file: str = "data/leads.jsonl"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
