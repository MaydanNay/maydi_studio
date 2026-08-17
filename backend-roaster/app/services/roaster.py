"""LLM integration: two-pass (facts → roast) + optional wow model."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    OpenAIError,
    RateLimitError as OpenAIRateLimitError,
)
from pydantic import BaseModel, Field

from app.config import Settings
from app.schemas import IcpContext, RoastMode, RoastObjection, RoastResponse
from app.services.quality import QualityError, validate_objections_quality
from app.services.scraper import (
    ScrapeError,
    UnsafeUrlError,
    fetch_page_content,
    looks_like_url,
    normalize_url,
)

logger = logging.getLogger(__name__)

SeverityOut = Literal["HIGH", "MED", "LOW"]
LlmSeverity = Literal["high", "medium", "low"]


class LlmObjection(BaseModel):
    id: int = Field(..., ge=1, le=5)
    title: str
    severity: LlmSeverity
    detail: str


class LlmRoastPayload(BaseModel):
    source: str = ""
    objections: list[LlmObjection]


class OfferFacts(BaseModel):
    """Pass-1 structured extraction - roast only against these facts."""

    value_proposition: str = Field(description="What the offer claims to sell / deliver")
    pricing: str = Field(description="Price / tariff signals, or 'не указано'")
    proof: str = Field(description="Cases, metrics, logos, testimonials - or 'не указано'")
    cta: str = Field(description="Primary next step / CTA - or 'не указано'")
    icp_signals: str = Field(description="Who it seems for - or 'не указано'")
    gaps: list[str] = Field(description="Critical missing info for a B2B buyer")
    key_quotes: list[str] = Field(description="Short verbatim quotes from the source (3–8)")

    def as_prompt_block(self) -> str:
        gaps = "\n".join(f"- {g}" for g in self.gaps) or "- (none listed)"
        quotes = "\n".join(f"- «{q}»" for q in self.key_quotes) or "- (none)"
        return (
            "EXTRACTED_FACTS:\n"
            f"- value_proposition: {self.value_proposition or 'не указано'}\n"
            f"- pricing: {self.pricing or 'не указано'}\n"
            f"- proof: {self.proof or 'не указано'}\n"
            f"- cta: {self.cta or 'не указано'}\n"
            f"- icp_signals: {self.icp_signals or 'не указано'}\n"
            f"- gaps:\n{gaps}\n"
            f"- key_quotes:\n{quotes}"
        )


FACTS_SYSTEM_PROMPT = """\
Ты - аналитик B2B-офферов. Задача: извлечь ТОЛЬКО факты из входного текста.
Не критикуй и не додумывай. Если поля нет во входе - пиши «не указано».
key_quotes: 3–8 коротких дословных цитат из текста (без кавычек внутри поля).
gaps: список информационных дыр, важных для ЛПР (цена, ROI, proof, ICP, next step, риски внедрения).
Верни строго JSON по схеме.
"""

FACTS_USER_TEMPLATE = """\
SOURCE_TYPE: {source_type}
SOURCE_LABEL: {source_label}
{icp_block}

SOURCE CONTENT:
---
{content}
---

Извлеки факты. Не выдумывай то, чего нет в тексте.
"""

ROAST_SYSTEM_PROMPT = """\
Ты - циничный, сверханалитический B2B-покупатель.
Если в запросе указан ICP_CONTEXT - Criticize STRICTLY from that buyer's perspective.
Если ICP не указан - действуй как CFO + CTO + Founder, но не выдумывай отрасль.

Тебе даны EXTRACTED_FACTS (pass-1). Критикуй ТОЛЬКО на их основе + исходный текст.
Не выдумывай кейсы/цифры/функции, которых нет в фактах.

Задача: ровно 3 критических возражения, из-за которых этот ЛПР УЙДЁТ без покупки/звонка.

Правила:
1. Никаких агентских штампов. Только критика по сути бизнеса.
2. Каждый detail ОБЯЗАН содержать короткую цитату в «ёлочках» (из key_quotes или исходника).
3. Три РАЗНЫЕ оси: ROI, цена/TCO, proof, ICP-fit, внедрение, позиционирование, next step.
4. Если в facts.gaps есть дыра - это сильный сигнал для возражения.
5. Пиши на деловом русском.
6. Верни ТОЛЬКО валидный JSON:
{{
  "source": "<url или 'Direct Offer Copy'>",
  "objections": [
    {{
      "id": 1,
      "title": "<хлёсткий заголовок>",
      "severity": "high | medium | low",
      "detail": "<«цитата». 1–2 предложения критики.>"
    }},
    {{ "id": 2, "title": "...", "severity": "...", "detail": "..." }},
    {{ "id": 3, "title": "...", "severity": "...", "detail": "..." }}
  ]
}}
"""

ROAST_USER_TEMPLATE = """\
SOURCE_TYPE: {source_type}
SOURCE_LABEL: {source_label}
MODE: {mode}
{icp_block}

{facts_block}

ORIGINAL CONTENT (for quotes only):
---
{content}
---

Верни ровно 3 возражения.
Поле "source" = {source_label!r}.
Каждый detail - цитата в «ёлочках» + критика. Оси разные.
"""

RETRY_USER_SUFFIX = """

CRITICAL: Previous output failed validation.
{feedback}
Return ONLY a valid JSON object matching the required schema. No markdown, no commentary.
"""

_SEVERITY_MAP: dict[str, SeverityOut] = {
    "high": "HIGH",
    "medium": "MED",
    "med": "MED",
    "low": "LOW",
    "HIGH": "HIGH",
    "MED": "MED",
    "MEDIUM": "MED",
    "LOW": "LOW",
}


class RoastError(Exception):
    """Raised when the roast pipeline fails (client/input issues)."""


class RoastUpstreamError(Exception):
    """Raised when upstream LLM/scrape infrastructure fails."""

    def __init__(self, message: str, *, status_code: int = 502) -> None:
        self.status_code = status_code
        super().__init__(message)


def _extract_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def _map_severity(raw: Any) -> SeverityOut:
    key = str(raw or "medium").strip()
    return _SEVERITY_MAP.get(key) or _SEVERITY_MAP.get(key.lower(), "MED")


def _normalize_objections(payload: dict[str, Any], count: int) -> list[RoastObjection]:
    items = payload.get("objections")
    if not isinstance(items, list) or not items:
        raise RoastError("LLM returned no objections")

    normalized: list[RoastObjection] = []
    for idx, item in enumerate(items[:count], start=1):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        detail = str(item.get("detail", "")).strip()
        if not title or not detail:
            continue
        normalized.append(
            RoastObjection(
                id=f"{idx:02d}",
                title=title,
                severity=_map_severity(item.get("severity")),
                detail=detail,
            )
        )

    if len(normalized) < count:
        raise RoastError(
            f"LLM returned {len(normalized)} valid objections, expected {count}"
        )
    return normalized[:count]


class RoasterService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            timeout=settings.openai_timeout_seconds,
        )

    def _model_for(self, mode: RoastMode, *, stage: Literal["facts", "roast"]) -> str:
        # Facts always on fast/cheap model; roast uses wow model when requested
        if stage == "facts":
            return self.settings.openai_model
        if mode == "wow":
            return self.settings.openai_model_wow
        return self.settings.openai_model

    async def roast(
        self,
        user_input: str,
        *,
        icp: IcpContext | None = None,
        mode: RoastMode = "standard",
    ) -> RoastResponse:
        count = self.settings.roast_objection_count
        source_type, source_label, content = await self._resolve_content(user_input)
        icp_ctx = icp if icp and not icp.is_empty() else IcpContext()

        facts: OfferFacts | None = None
        if self.settings.two_pass_enabled:
            facts = await self._extract_facts(
                source_type=source_type,
                source_label=source_label,
                content=content,
                icp_block=icp_ctx.as_prompt_block(),
            )
            logger.info(
                "facts extracted mode=%s gaps=%s quotes=%s",
                mode,
                len(facts.gaps),
                len(facts.key_quotes),
            )

        user = ROAST_USER_TEMPLATE.format(
            source_type=source_type,
            source_label=source_label,
            mode=mode,
            content=content,
            icp_block=icp_ctx.as_prompt_block(),
            facts_block=facts.as_prompt_block()
            if facts
            else "EXTRACTED_FACTS: (two-pass disabled - roast from source only)",
        )

        roast_model = self._model_for(mode, stage="roast")
        last_error: Exception | None = None
        attempts = 1 + max(0, self.settings.roast_json_retries)
        feedback = (
            "Previous output was invalid JSON or incomplete. "
            "Return ONLY valid JSON matching the schema."
        )

        for attempt in range(attempts):
            prompt = (
                user
                if attempt == 0
                else user + RETRY_USER_SUFFIX.format(feedback=feedback)
            )
            try:
                payload = await self._complete_structured(
                    system=ROAST_SYSTEM_PROMPT,
                    user_prompt=prompt,
                    response_model=LlmRoastPayload,
                    model=roast_model,
                )
                objections = _normalize_objections(payload, count)
                validate_objections_quality(objections)
                return RoastResponse(
                    objections=objections,
                    source=source_label,
                    mode=mode,
                    engine=roast_model,
                )
            except RoastUpstreamError:
                raise
            except QualityError as exc:
                last_error = exc
                feedback = (
                    "QUALITY GATE FAILED:\n- "
                    + "\n- ".join(exc.issues)
                    + "\nFix ALL issues. Different risk axes. "
                    "Each detail MUST include a short quote in «ёлочки»."
                )
                logger.warning(
                    "Roast quality gate failed (attempt %s/%s) model=%s: %s",
                    attempt + 1,
                    attempts,
                    roast_model,
                    exc,
                )
                continue
            except (json.JSONDecodeError, RoastError, ValueError) as exc:
                last_error = exc
                feedback = (
                    f"Parse/schema error: {exc}. "
                    "Return ONLY a valid JSON object matching the required schema."
                )
                logger.warning(
                    "Roast parse/normalize failed (attempt %s/%s) model=%s: %s",
                    attempt + 1,
                    attempts,
                    roast_model,
                    exc,
                )
                continue

        raise RoastError(
            f"LLM failed quality/schema validation after {attempts} attempt(s): "
            f"{last_error}"
        )

    async def _extract_facts(
        self,
        *,
        source_type: str,
        source_label: str,
        content: str,
        icp_block: str,
    ) -> OfferFacts:
        user = FACTS_USER_TEMPLATE.format(
            source_type=source_type,
            source_label=source_label,
            content=content,
            icp_block=icp_block,
        )
        model = self._model_for("standard", stage="facts")
        try:
            payload = await self._complete_structured(
                system=FACTS_SYSTEM_PROMPT,
                user_prompt=user,
                response_model=OfferFacts,
                model=model,
            )
            return OfferFacts.model_validate(payload)
        except (json.JSONDecodeError, RoastError, ValueError) as exc:
            logger.warning("Fact extraction failed, continuing without facts: %s", exc)
            return OfferFacts(
                value_proposition="не извлечено",
                pricing="не указано",
                proof="не указано",
                cta="не указано",
                icp_signals="не указано",
                gaps=["не удалось структурировать факты - опирайся на исходный текст"],
                key_quotes=[],
            )

    async def _complete_structured(
        self,
        *,
        system: str,
        user_prompt: str,
        response_model: type[BaseModel],
        model: str,
    ) -> dict[str, Any]:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ]
        try:
            completion = await self.client.beta.chat.completions.parse(
                model=model,
                temperature=self.settings.temperature,
                max_completion_tokens=self.settings.max_completion_tokens,
                response_format=response_model,
                messages=messages,
            )
            parsed = completion.choices[0].message.parsed
            if parsed is not None:
                return parsed.model_dump()
            refusal = completion.choices[0].message.refusal
            if refusal:
                raise RoastError(f"LLM refused request: {refusal}")
            raw = completion.choices[0].message.content or ""
            if raw.strip():
                return _extract_json(raw)
            raise RoastError("LLM returned an empty structured response")
        except (RoastError, json.JSONDecodeError, ValueError):
            raise
        except OpenAIRateLimitError as exc:
            raise RoastUpstreamError(
                "LLM rate limit exceeded", status_code=503
            ) from exc
        except APITimeoutError as exc:
            raise RoastUpstreamError("LLM request timed out", status_code=504) from exc
        except APIConnectionError as exc:
            raise RoastUpstreamError(
                "LLM connection failed", status_code=502
            ) from exc
        except APIStatusError as exc:
            if exc.status_code in {400, 404, 422}:
                logger.info(
                    "Structured parse rejected (HTTP %s), falling back to json_object",
                    exc.status_code,
                )
                raw = await self._complete_json_object(messages, model=model)
                return _extract_json(raw)
            code = 503 if exc.status_code == 429 else 502
            raise RoastUpstreamError(
                f"LLM upstream error (HTTP {exc.status_code})",
                status_code=code,
            ) from exc
        except OpenAIError as exc:
            logger.info(
                "Structured parse unavailable, falling back to json_object: %s", exc
            )
            raw = await self._complete_json_object(messages, model=model)
            return _extract_json(raw)

    async def _complete_json_object(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
    ) -> str:
        try:
            completion = await self.client.chat.completions.create(
                model=model,
                temperature=self.settings.temperature,
                max_completion_tokens=self.settings.max_completion_tokens,
                response_format={"type": "json_object"},
                messages=messages,
            )
        except OpenAIRateLimitError as exc:
            raise RoastUpstreamError(
                "LLM rate limit exceeded", status_code=503
            ) from exc
        except APITimeoutError as exc:
            raise RoastUpstreamError("LLM request timed out", status_code=504) from exc
        except APIConnectionError as exc:
            raise RoastUpstreamError(
                "LLM connection failed", status_code=502
            ) from exc
        except APIStatusError as exc:
            code = 503 if exc.status_code == 429 else 502
            raise RoastUpstreamError(
                f"LLM upstream error (HTTP {exc.status_code})",
                status_code=code,
            ) from exc
        except OpenAIError as exc:
            logger.exception("OpenAI request failed")
            raise RoastUpstreamError(f"LLM request failed: {exc}") from exc

        raw = completion.choices[0].message.content or ""
        if not raw.strip():
            raise RoastError("LLM returned an empty response")
        return raw

    async def _resolve_content(self, user_input: str) -> tuple[str, str, str]:
        if looks_like_url(user_input):
            try:
                safe_url = await normalize_url(user_input)
                page = await fetch_page_content(safe_url, self.settings)
            except UnsafeUrlError as exc:
                raise RoastError(str(exc)) from exc
            except ScrapeError as exc:
                raise RoastUpstreamError(str(exc), status_code=502) from exc
            return "url", safe_url, page

        return "offer_copy", "Direct Offer Copy", user_input
