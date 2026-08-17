"""Post-generation quality gates for roast objections."""

from __future__ import annotations

import re
from collections import Counter

from app.schemas import RoastObjection

# Must contain a short quote in Russian «ёлочки» or ASCII quotes
_QUOTE_RE = re.compile(
    r"«[^»]{3,}»|"  # «цитата»
    r"\"[^\"]{3,}\"|"  # "quote"
    r"'[^']{3,}'"  # 'quote'
)

# Risk axes - keep mutually distinct enough for lead-magnet quality
_AXIS_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "price",
        re.compile(
            r"(?i)цен[аыуе]|тариф|стоимост|прайс|tco|бюджет|руб|₽|скрыт\w*\s+расход"
        ),
    ),
    (
        "roi",
        re.compile(
            r"(?i)\broi\b|окупаем|экономик|выручк|марж|unit.?econ|payback|возврат\s+инвест"
        ),
    ),
    (
        "proof",
        re.compile(
            r"(?i)кейс|отзыв|proof|довер|социальн\w*\s+доказа|логотип|метрик|цифр"
        ),
    ),
    (
        "icp",
        re.compile(
            r"(?i)\bicp\b|для\s+кого|целев|сегмент|не\s+ваш|не\s+подходит|аудитор"
        ),
    ),
    (
        "integration",
        re.compile(
            r"(?i)внедрен|интеграц|\bapi\b|техническ|срок\w*\s+запуск|сложн\w*\s+внедр"
        ),
    ),
    (
        "positioning",
        re.compile(
            r"(?i)альтернатив|конкурент|чем\s+отлича|позицион|vs\b|сравнен"
        ),
    ),
    (
        "cta",
        re.compile(
            r"(?i)next\s*step|следующ\w*\s+шаг|\bcta\b|демо|что\s+будет\s+после|"
            r"непонятн\w*\s+(шаг|действие)|призыв"
        ),
    ),
]


class QualityError(Exception):
    """Raised when objections fail quality gates (triggers retry)."""

    def __init__(self, issues: list[str]) -> None:
        self.issues = issues
        super().__init__("; ".join(issues))


def detect_axis(title: str, detail: str) -> str:
    blob = f"{title} {detail}"
    for name, pattern in _AXIS_PATTERNS:
        if pattern.search(blob):
            return name
    return "other"


def validate_objections_quality(objections: list[RoastObjection]) -> None:
    """
    Enforce:
    1) each detail has a quote
    2) no duplicate risk axes (except 'other' once each is ok, but 2+ other is fine;
       duplicate named axes fail)
    """
    issues: list[str] = []

    for obj in objections:
        if not _QUOTE_RE.search(obj.detail):
            issues.append(
                f"objection {obj.id}: detail must include a short quote in «ёлочки» "
                f"taken from the offer"
            )

    axes = [detect_axis(o.title, o.detail) for o in objections]
    counts = Counter(a for a in axes if a != "other")
    dupes = [axis for axis, n in counts.items() if n >= 2]
    if dupes:
        issues.append(
            "duplicate risk axes: "
            + ", ".join(dupes)
            + " - each objection must attack a DIFFERENT axis "
            "(price / roi / proof / icp / integration / positioning / cta)"
        )

    if issues:
        raise QualityError(issues)
