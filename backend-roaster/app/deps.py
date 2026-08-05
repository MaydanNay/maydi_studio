"""Shared FastAPI dependencies."""

from __future__ import annotations

from functools import lru_cache

from fastapi import Request

from app.config import Settings, get_settings
from app.services.rate_limit import SlidingWindowRateLimiter
from app.services.roaster import RoasterService


@lru_cache
def get_rate_limiter() -> SlidingWindowRateLimiter:
    settings = get_settings()
    return SlidingWindowRateLimiter(
        max_requests=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )


@lru_cache
def get_wow_rate_limiter() -> SlidingWindowRateLimiter:
    settings = get_settings()
    return SlidingWindowRateLimiter(
        max_requests=settings.rate_limit_wow_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )


@lru_cache
def get_roaster_service() -> RoasterService:
    return RoasterService(get_settings())


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def get_settings_dep() -> Settings:
    return get_settings()
