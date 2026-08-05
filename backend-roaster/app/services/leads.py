"""Lead capture persistence + optional Telegram notify."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from app.config import Settings
from app.schemas import LeadRequest

logger = logging.getLogger(__name__)


class LeadStoreError(Exception):
    """Raised when a lead cannot be persisted."""


def _leads_path(settings: Settings) -> Path:
    path = Path(settings.leads_file)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent.parent / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _telegram_text(lead_id: str, body: LeadRequest) -> str:
    lines = [
        "🔥 New lead — maydiStudio",
        f"id: {lead_id}",
        f"source: {body.source}",
        f"name: {body.name}",
        f"contact: {body.contact}",
    ]
    if body.roast_source:
        lines.append(f"roast: {body.roast_source}")
    if body.niche:
        lines.append(f"niche: {body.niche}")
    if body.buyer_role:
        lines.append(f"buyer: {body.buyer_role}")
    if body.objection_titles:
        lines.append("objections:")
        for i, title in enumerate(body.objection_titles[:5], start=1):
            lines.append(f"  {i}. {title}")
    return "\n".join(lines)


async def _notify_telegram(settings: Settings, text: str) -> bool:
    token = (settings.telegram_bot_token or "").strip()
    chat_id = (settings.telegram_chat_id or "").strip()
    if not token or not chat_id:
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json={"chat_id": chat_id, "text": text},
            )
            resp.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.warning("Telegram notify failed: %s", exc)
        return False


async def save_lead(body: LeadRequest, settings: Settings, *, ip: str) -> dict[str, Any]:
    lead_id = uuid4().hex[:12]
    record = {
        "id": lead_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ip": ip,
        "name": body.name,
        "contact": body.contact,
        "source": body.source,
        "roast_source": body.roast_source,
        "objection_titles": body.objection_titles,
        "niche": body.niche,
        "buyer_role": body.buyer_role,
    }

    path = _leads_path(settings)
    try:
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError as exc:
        raise LeadStoreError(f"Failed to persist lead: {exc}") from exc

    notified = await _notify_telegram(settings, _telegram_text(lead_id, body))
    logger.info(
        "lead saved id=%s source=%s telegram=%s",
        lead_id,
        body.source,
        notified,
    )
    return {"id": lead_id, "telegram_notified": notified}
