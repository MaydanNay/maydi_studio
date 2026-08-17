"""Unit tests for scraper hygiene, prioritization, rate limit, and roast normalize."""

from __future__ import annotations

import asyncio

import pytest

from app.services.rate_limit import RateLimitExceeded, SlidingWindowRateLimiter
from app.services.roaster import _map_severity, _normalize_objections
from app.services.scraper import (
    UnsafeUrlError,
    looks_like_url,
    normalize_url,
    prioritize_content,
)


def test_looks_like_url_accepts_bare_domain_and_https() -> None:
    assert looks_like_url("maydi.net")
    assert looks_like_url("https://maydi.net/pricing")
    assert looks_like_url("www.example.com/path?x=1")
    assert not looks_like_url("просто текст оффера про ROI")
    assert not looks_like_url("ftp://example.com")


def test_normalize_url_auto_https() -> None:
    url = asyncio.run(normalize_url("example.com/path"))
    assert url == "https://example.com/path"


@pytest.mark.parametrize(
    "bad",
    [
        "http://127.0.0.1",
        "http://localhost",
        "http://10.0.0.5",
        "http://192.168.1.1",
        "http://169.254.169.254",
    ],
)
def test_normalize_url_blocks_private(bad: str) -> None:
    with pytest.raises(UnsafeUrlError):
        asyncio.run(normalize_url(bad))


def test_prioritize_content_keeps_pricing_and_cta() -> None:
    hero = "A" * 2000
    pricing = "\n## Pricing\nЦена от 49 000₽/мес с прозрачным ROI.\n"
    filler = "B" * 8000
    cta = "\n## Контакт\nЗапишитесь на демо сегодня.\n"
    text = hero + pricing + filler + cta
    out = prioritize_content(text, max_chars=4000)
    assert len(out) <= 4200
    assert "49 000" in out or "Pricing" in out
    assert "демо" in out or "footer" in out
    assert out.startswith("A")


def test_severity_mapping() -> None:
    assert _map_severity("high") == "HIGH"
    assert _map_severity("medium") == "MED"
    assert _map_severity("MED") == "MED"
    assert _map_severity("weird") == "MED"


def test_normalize_objections() -> None:
    payload = {
        "objections": [
            {"id": 1, "title": "T1", "severity": "high", "detail": "D1 «цитата»"},
            {"id": 2, "title": "T2", "severity": "low", "detail": "D2"},
            {"id": 3, "title": "T3", "severity": "medium", "detail": "D3"},
        ]
    }
    objs = _normalize_objections(payload, 3)
    assert [o.id for o in objs] == ["01", "02", "03"]
    assert objs[0].severity == "HIGH"
    assert objs[2].severity == "MED"


def test_rate_limiter_blocks_after_max() -> None:
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=60)
    limiter.check("1.2.3.4")
    limiter.check("1.2.3.4")
    with pytest.raises(RateLimitExceeded) as ei:
        limiter.check("1.2.3.4")
    assert ei.value.retry_after >= 1
    # other IP still allowed
    limiter.check("9.9.9.9")


def test_quality_requires_quotes() -> None:
    from app.schemas import RoastObjection
    from app.services.quality import QualityError, validate_objections_quality

    objs = [
        RoastObjection(
            id="01",
            title="Цена без якоря",
            severity="HIGH",
            detail="Нет прозрачной цены - CFO уйдёт.",
        ),
        RoastObjection(
            id="02",
            title="Слабый proof",
            severity="HIGH",
            detail="«Кейс +37%» без методологии - доверия нет.",
        ),
        RoastObjection(
            id="03",
            title="Размытый CTA",
            severity="MED",
            detail="«Запишитесь на демо» - неясно, что будет на звонке.",
        ),
    ]
    with pytest.raises(QualityError) as ei:
        validate_objections_quality(objs)
    assert any("quote" in i or "ёлочк" in i for i in ei.value.issues)


def test_quality_rejects_duplicate_axes() -> None:
    from app.schemas import RoastObjection
    from app.services.quality import QualityError, validate_objections_quality

    objs = [
        RoastObjection(
            id="01",
            title="Неясная цена",
            severity="HIGH",
            detail="«от 29 000₽» - скрытые расходы пугают CFO.",
        ),
        RoastObjection(
            id="02",
            title="Тариф непрозрачен",
            severity="HIGH",
            detail="«Тариф от 29к» без состава пакета - риск для бюджета.",
        ),
        RoastObjection(
            id="03",
            title="Слабый next step",
            severity="MED",
            detail="«Запишитесь на демо» - нет ясности следующего шага.",
        ),
    ]
    with pytest.raises(QualityError) as ei:
        validate_objections_quality(objs)
    assert any("duplicate" in i for i in ei.value.issues)


def test_quality_passes_diverse_quoted() -> None:
    from app.schemas import RoastObjection
    from app.services.quality import validate_objections_quality

    objs = [
        RoastObjection(
            id="01",
            title="ROI не доказан",
            severity="HIGH",
            detail="«+37% к сделкам» без базы сравнения - экономика покупки не сходится.",
        ),
        RoastObjection(
            id="02",
            title="Цена без TCO",
            severity="HIGH",
            detail="«от 29 000₽/мес» - CFO не видит полную стоимость владения.",
        ),
        RoastObjection(
            id="03",
            title="CTA размыт",
            severity="MED",
            detail="«Запишитесь на демо» - неясно, что будет на созвоне и сколько займёт.",
        ),
    ]
    validate_objections_quality(objs)


def test_icp_prompt_block() -> None:
    from app.schemas import IcpContext

    empty = IcpContext()
    assert "not provided" in empty.as_prompt_block()
    filled = IcpContext(niche="B2B EdTech", buyer_role="CFO", avg_check="80к")
    block = filled.as_prompt_block()
    assert "B2B EdTech" in block and "CFO" in block and "80к" in block


def test_save_lead_jsonl(tmp_path, monkeypatch) -> None:
    import asyncio

    from app.config import Settings
    from app.schemas import LeadRequest
    from app.services import leads as leads_mod

    settings = Settings(
        openai_api_key="sk-test",
        leads_file=str(tmp_path / "leads.jsonl"),
    )

    async def _run() -> None:
        body = LeadRequest(
            name="Test",
            contact="@tester",
            source="ai_roaster",
            roast_source="https://example.com",
            objection_titles=["Цена", "Proof", "CTA"],
        )
        saved = await leads_mod.save_lead(body, settings, ip="1.1.1.1")
        assert saved["id"]
        assert saved["telegram_notified"] is False
        text = (tmp_path / "leads.jsonl").read_text(encoding="utf-8")
        assert "Test" in text and "ai_roaster" in text and "Цена" in text

    asyncio.run(_run())
