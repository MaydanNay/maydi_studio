"""API routes for the AI Offer Roaster."""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.config import Settings
from app.deps import (
    client_ip,
    get_rate_limiter,
    get_roaster_service,
    get_settings_dep,
    get_wow_rate_limiter,
)
from app.schemas import HealthResponse, LeadRequest, LeadResponse, RoastRequest, RoastResponse
from app.services.leads import LeadStoreError, save_lead
from app.services.rate_limit import RateLimitExceeded, SlidingWindowRateLimiter
from app.services.roaster import RoastError, RoastUpstreamError, RoasterService

logger = logging.getLogger(__name__)

router = APIRouter()


def _unprocessable_status() -> int:
    return getattr(
        status,
        "HTTP_422_UNPROCESSABLE_CONTENT",
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health(settings: Settings = Depends(get_settings_dep)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-offer-roaster",
        openai_configured=bool(settings.openai_api_key),
    )


@router.post(
    "/tools/roast",
    response_model=RoastResponse,
    tags=["roast"],
    summary="Roast a landing page URL or offer copy",
)
async def roast_offer(
    body: RoastRequest,
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings_dep),
    limiter: SlidingWindowRateLimiter = Depends(get_rate_limiter),
    wow_limiter: SlidingWindowRateLimiter = Depends(get_wow_rate_limiter),
    service: RoasterService = Depends(get_roaster_service),
) -> RoastResponse:
    started = time.perf_counter()
    ip = client_ip(request)

    if settings.rate_limit_enabled:
        try:
            if body.mode == "wow":
                wow_limiter.check(ip)
            else:
                limiter.check(ip)
        except RateLimitExceeded as exc:
            response.headers["Retry-After"] = str(exc.retry_after)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"rate_limited: слишком много запросов. "
                    f"Повторите через {exc.retry_after}с"
                ),
                headers={"Retry-After": str(exc.retry_after)},
            ) from exc

    try:
        result = await service.roast(body.input, icp=body.icp, mode=body.mode)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
        response.headers["X-Roast-Mode"] = result.mode
        if result.engine:
            response.headers["X-Roast-Engine"] = result.engine
        logger.info(
            "roast ok ip=%s mode=%s engine=%s source=%s objections=%s ms=%s",
            ip,
            result.mode,
            result.engine,
            result.source[:80],
            len(result.objections),
            elapsed_ms,
        )
        return result
    except RoastError as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
        logger.warning("Roast failed (client) ip=%s ms=%s: %s", ip, elapsed_ms, exc)
        raise HTTPException(
            status_code=_unprocessable_status(),
            detail=str(exc),
        ) from exc
    except RoastUpstreamError as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
        logger.warning(
            "Roast failed (upstream %s) ip=%s ms=%s: %s",
            exc.status_code,
            ip,
            elapsed_ms,
            exc,
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected roast failure ip=%s", ip)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal roast engine error",
        ) from exc


@router.post(
    "/leads",
    response_model=LeadResponse,
    tags=["leads"],
    summary="Capture a lead (after roast or booking CTA)",
)
async def create_lead(
    body: LeadRequest,
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings_dep),
    limiter: SlidingWindowRateLimiter = Depends(get_rate_limiter),
) -> LeadResponse:
    ip = client_ip(request)
    if settings.rate_limit_enabled:
        try:
            # Separate bucket so booking after roast is not blocked by roast quota
            limiter.check(f"lead:{ip}")
        except RateLimitExceeded as exc:
            response.headers["Retry-After"] = str(exc.retry_after)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"rate_limited: повторите через {exc.retry_after}с",
                headers={"Retry-After": str(exc.retry_after)},
            ) from exc

    try:
        saved = await save_lead(body, settings, ip=ip)
        return LeadResponse(
            ok=True,
            id=saved["id"],
            telegram_notified=bool(saved.get("telegram_notified")),
        )
    except LeadStoreError as exc:
        logger.exception("Lead store failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
