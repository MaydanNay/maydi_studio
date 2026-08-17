"""FastAPI application entrypoint - AI Offer Roaster microservice."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.routes import router
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description=(
        "Standalone B2B landing-page critique engine. "
        "POST a URL or offer copy; receive ranked conversion objections."
    ),
)

_origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    # Browsers reject credentials with wildcard origins
    allow_credentials=_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "service": "ai-offer-roaster",
        "version": __version__,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
        "roast": f"{settings.api_prefix}/tools/roast",
    }
