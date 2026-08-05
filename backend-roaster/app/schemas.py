"""Request/response schemas for the AI Offer Roaster."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


Severity = Literal["HIGH", "MED", "LOW"]
RoastMode = Literal["standard", "wow"]

BuyerRole = Literal[
    "CEO",
    "CFO",
    "CTO",
    "CMO",
    "Head of Sales",
    "Head of Marketing",
    "Founder",
    "Other",
]


class IcpContext(BaseModel):
    """Optional buyer context — sharply improves roast specificity."""

    niche: str | None = Field(
        default=None,
        max_length=120,
        description="Industry / niche, e.g. B2B EdTech",
        examples=["B2B SaaS для продаж"],
    )
    buyer_role: BuyerRole | None = Field(
        default=None,
        description="Primary decision-maker persona",
    )
    avg_check: str | None = Field(
        default=None,
        max_length=80,
        description="Average deal size / price point",
        examples=["80 000₽/мес", "$2k ARR"],
    )

    @field_validator("niche", "avg_check")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    def is_empty(self) -> bool:
        return not any([self.niche, self.buyer_role, self.avg_check])

    def as_prompt_block(self) -> str:
        if self.is_empty():
            return "ICP_CONTEXT: (not provided — infer carefully from offer, do not invent)"
        parts: list[str] = []
        if self.niche:
            parts.append(f"niche={self.niche}")
        if self.buyer_role:
            parts.append(f"buyer_role={self.buyer_role}")
        if self.avg_check:
            parts.append(f"avg_check={self.avg_check}")
        return "ICP_CONTEXT: " + "; ".join(parts)


class RoastRequest(BaseModel):
    """Accepts a landing-page URL or raw offer copy + optional ICP context."""

    input: str = Field(
        ...,
        min_length=1,
        max_length=50_000,
        description="Landing page URL or offer copy text",
        examples=["https://example.com", "Мы помогаем B2B-компаниям…"],
    )
    icp: IcpContext | None = Field(
        default=None,
        description="Optional ICP / buyer context for sharper critique",
    )
    mode: RoastMode = Field(
        default="standard",
        description="standard = fast model; wow = stronger model on roast pass",
    )

    @field_validator("input")
    @classmethod
    def strip_input(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("input must not be empty")
        return cleaned


class RoastObjection(BaseModel):
    id: str = Field(..., description="Zero-padded objection id, e.g. '01'")
    title: str = Field(..., description="Short objection headline")
    severity: Severity
    detail: str = Field(..., description="Why this blocks conversion for a B2B buyer")


class RoastResponse(BaseModel):
    objections: list[RoastObjection] = Field(..., min_length=1, max_length=5)
    source: str = Field(..., description="Normalized URL or Direct Offer Copy")
    mode: RoastMode = "standard"
    engine: str | None = Field(
        default=None,
        description="Model used for the roast pass",
    )


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "ai-offer-roaster"
    openai_configured: bool | None = None


class LeadRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    contact: str = Field(..., min_length=2, max_length=200)
    source: Literal["ai_roaster", "booking", "footer", "other"] = "booking"
    roast_source: str | None = Field(default=None, max_length=500)
    objection_titles: list[str] = Field(default_factory=list, max_length=5)
    niche: str | None = Field(default=None, max_length=120)
    buyer_role: str | None = Field(default=None, max_length=80)

    @field_validator("name", "contact")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned

    @field_validator("objection_titles")
    @classmethod
    def clean_titles(cls, value: list[str]) -> list[str]:
        return [t.strip() for t in value if t and t.strip()][:5]


class LeadResponse(BaseModel):
    ok: bool = True
    id: str
    telegram_notified: bool = False
