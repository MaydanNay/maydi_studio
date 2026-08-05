"""Lightweight URL content fetcher via Jina.ai Reader."""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import re
import socket
from urllib.parse import urlparse

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

_SCHEME_RE = re.compile(r"^https?://", re.IGNORECASE)
# bare domain / domain+path without scheme (maydi.net, www.x.ru/pricing)
_BARE_DOMAIN_RE = re.compile(
    r"^(?:www\.)?"
    r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
    r"(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+"
    r"(?:[/:?#].*)?$",
    re.IGNORECASE,
)

_BLOCKED_HOSTS = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata",
}

# Keywords that usually carry conversion-critical copy
_PRIORITY_RE = re.compile(
    r"(?i)("
    r"price|pricing|тариф|цена|стоимост|руб|₽|\$|usd|eur|"
    r"roi|кейс|case stud|отзыв|клиент|логотип|trust|proof|"
    r"cta|демо|запис|связ|контакт|купить|оформит|"
    r"интеграц|внедрен|api|безопасност|sla|"
    r"для кого|icp|b2b|для бизнес"
    r")"
)


def prioritize_content(text: str, max_chars: int) -> str:
    """
    Keep hero (head) + keyword windows + footer (tail) within max_chars.

    Avoids dumb mid-page truncation that drops pricing/CTA.
    """
    cleaned = text.strip()
    if len(cleaned) <= max_chars:
        return cleaned

    head_budget = int(max_chars * 0.45)
    tail_budget = int(max_chars * 0.15)
    mid_budget = max_chars - head_budget - tail_budget

    head = cleaned[:head_budget]
    tail = cleaned[-tail_budget:] if tail_budget else ""

    windows: list[str] = []
    used = 0
    for match in _PRIORITY_RE.finditer(cleaned):
        start = max(0, match.start() - 180)
        end = min(len(cleaned), match.end() + 320)
        # Skip overlaps with head/tail regions
        if end <= head_budget or start >= len(cleaned) - tail_budget:
            continue
        chunk = cleaned[start:end].strip()
        if not chunk or chunk in windows:
            continue
        if used + len(chunk) + 8 > mid_budget:
            break
        windows.append(chunk)
        used += len(chunk) + 8

    mid = "\n\n---\n\n".join(windows)
    parts = [head]
    if mid:
        parts.append(f"\n\n[…priority excerpts…]\n\n{mid}")
    if tail:
        parts.append(f"\n\n[…footer…]\n\n{tail}")
    parts.append("\n\n[…truncated…]")
    return "".join(parts)



class ScrapeError(Exception):
    """Raised when remote page content cannot be fetched."""


class UnsafeUrlError(ScrapeError):
    """Raised when a URL is blocked for SSRF / hygiene reasons."""


def looks_like_url(value: str) -> bool:
    """True if value is http(s) URL or a bare domain we can auto-https."""
    text = value.strip()
    if _SCHEME_RE.match(text):
        parsed = urlparse(text)
        return bool(parsed.scheme and parsed.netloc)
    return bool(_BARE_DOMAIN_RE.match(text))


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
    )


def _assert_host_safe_sync(host: str) -> None:
    if host in _BLOCKED_HOSTS or host.endswith(".localhost"):
        raise UnsafeUrlError("Private / local hosts are not allowed")

    try:
        ip = ipaddress.ip_address(host)
        if _is_blocked_ip(ip):
            raise UnsafeUrlError("Private / reserved IP addresses are not allowed")
        return
    except ValueError:
        pass

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise UnsafeUrlError(f"Could not resolve host: {host}") from exc

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if _is_blocked_ip(ip):
            raise UnsafeUrlError("URL resolves to a private / reserved address")


async def normalize_url(value: str) -> str:
    """Strip, auto-prefix https:// for bare domains, validate host safety."""
    text = value.strip()
    if not text:
        raise UnsafeUrlError("Empty URL")

    if not _SCHEME_RE.match(text):
        if not _BARE_DOMAIN_RE.match(text):
            raise UnsafeUrlError("Not a valid URL")
        text = f"https://{text}"

    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"}:
        raise UnsafeUrlError("Only http/https URLs are allowed")
    if not parsed.netloc:
        raise UnsafeUrlError("URL is missing a host")

    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        raise UnsafeUrlError("URL is missing a host")

    await asyncio.to_thread(_assert_host_safe_sync, host)
    return text


async def fetch_page_content(url: str, settings: Settings) -> str:
    """
    Fetch readable markdown/text for a URL using Jina Reader.

    Jina endpoint: GET https://r.jina.ai/{url}
    """
    safe_url = await normalize_url(url)
    reader_url = f"{settings.jina_reader_base_url.rstrip('/')}/{safe_url}"
    headers: dict[str, str] = {
        "Accept": "text/plain",
        "X-Return-Format": "markdown",
    }
    if settings.jina_api_key:
        headers["Authorization"] = f"Bearer {settings.jina_api_key}"

    try:
        async with httpx.AsyncClient(
            timeout=settings.scrape_timeout_seconds,
            follow_redirects=True,
        ) as client:
            response = await client.get(reader_url, headers=headers)
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        logger.warning("Jina scrape timed out for %s", safe_url)
        raise ScrapeError("Timed out while fetching page content") from exc
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Jina scrape HTTP %s for %s",
            exc.response.status_code,
            safe_url,
        )
        raise ScrapeError(
            f"Failed to fetch page content (HTTP {exc.response.status_code})"
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("Jina scrape network error for %s: %s", safe_url, exc)
        raise ScrapeError("Network error while fetching page content") from exc

    text = (response.text or "").strip()
    if not text:
        raise ScrapeError("Fetched page content was empty")

    return prioritize_content(text, settings.scrape_max_chars)
