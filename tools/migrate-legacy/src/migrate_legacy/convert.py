"""Convert a legacy paged-lesson HTML document into a `LessonImport` JSON document.

Only the "paged lesson" pattern is supported: a document with one or more
`div.lesson-page` elements inside `.container .flip-lesson-container`. Anything
else yields an `unsupported` report and an empty document.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from bs4 import BeautifulSoup, Tag

from migrate_legacy.html2prose import collapse_whitespace, html_to_prose, inline_nodes, strip_edges

_PAGE_TITLE_RE = re.compile(r"^Page\s+\d+:\s*", re.IGNORECASE)
_QUICK_CHECK_RE = re.compile(r"^quick\s+check[!.,;:]*$", re.IGNORECASE)
_EXPLANATION_PREFIX_RE = re.compile(r"^[A-Z]\.\s*")
_CORRECT_ANSWERS_RE = re.compile(r"const\s+lessonCorrectAnswers\s*=\s*(\{.*?\});", re.DOTALL)
_SLUG_RE = re.compile(r"[^a-z0-9]+")
_KEY_INVALID_RE = re.compile(r"[^a-z0-9_]")


@dataclass
class Report:
    page: str
    status: Literal["converted", "needs-review", "unsupported"]
    notes: list[str] = field(default_factory=list)


def _slugify(name: str) -> str:
    return _SLUG_RE.sub("-", name.lower()).strip("-")


def _find_tag(parent: Tag, name: str, **kwargs: Any) -> Tag | None:
    """`Tag.find`, narrowed to `Tag | None` (it can only ever match an element tag here)."""
    found = parent.find(name, **kwargs)
    return found if isinstance(found, Tag) else None


def _correct_answers(soup: BeautifulSoup) -> dict[str, str]:
    for script in soup.find_all("script"):
        match = _CORRECT_ANSWERS_RE.search(script.get_text())
        if match:
            answers: dict[str, str] = json.loads(match.group(1))
            return answers
    return {}


def _one_paragraph_doc(element: Tag, notes: list[str]) -> dict[str, Any]:
    return {
        "type": "doc",
        "content": [{"type": "paragraph", "content": strip_edges(inline_nodes(element, notes))}],
    }


def _explanation_doc(element: Tag, notes: list[str]) -> dict[str, Any]:
    nodes = strip_edges(inline_nodes(element, notes))
    if nodes and nodes[0]["type"] == "text":
        nodes = [{**nodes[0], "text": _EXPLANATION_PREFIX_RE.sub("", nodes[0]["text"])}, *nodes[1:]]
    return {"type": "doc", "content": [{"type": "paragraph", "content": nodes}]}


def _normalise_key(raw_key: str, notes: list[str]) -> str:
    """Force a radio `name` into the `^[a-z0-9_]+$` shape the API importer
    requires, noting the change so it's traceable back to the legacy markup."""
    normalised = _KEY_INVALID_RE.sub("_", raw_key.lower())
    if normalised != raw_key:
        notes.append(f"normalised key {raw_key} → {normalised}")
    return normalised


def _build_knowledge_check(
    block_div: Tag, page_num: int, correct_answers: dict[str, str], notes: list[str]
) -> dict[str, Any] | None:
    """Build a `knowledge_check` block, or `None` if the block has no radio
    input to key it on (the caller then falls back to a plain rich_text block
    so the question text isn't silently dropped)."""
    stem_el = _find_tag(block_div, "p", class_="question-text")
    stem = (
        _one_paragraph_doc(stem_el, notes)
        if stem_el
        else {"type": "doc", "content": [{"type": "paragraph", "content": []}]}
    )

    raw_key = None
    options: list[str] = []
    values: list[str | None] = []
    for label in block_div.find_all("label"):
        radio = label.find("input", type="radio")
        if raw_key is None and radio is not None and radio.get("name") is not None:
            raw_key = str(radio["name"])
        values.append(radio.get("value") if radio is not None else None)
        options.append(collapse_whitespace(label.get_text()).strip())

    if raw_key is None:
        notes.append(
            "unsupported element interactive-question-block without radio inputs "
            f"on page {page_num}"
        )
        return None

    key = _normalise_key(raw_key, notes)

    answer = 0
    if raw_key in correct_answers and correct_answers[raw_key] in values:
        answer = values.index(correct_answers[raw_key])
    else:
        notes.append(f"no correct answer for {key}")

    explanation_el = _find_tag(block_div, "div", class_="explanation")
    explanation = _explanation_doc(explanation_el, notes) if explanation_el else None

    return {
        "type": "knowledge_check",
        "key": key,
        "stem": stem,
        "options": options,
        "answer": answer,
        "explanation": explanation,
    }


def _page_blocks(
    page_div: Tag,
    title_el: Tag | None,
    page_num: int,
    correct_answers: dict[str, str],
    notes: list[str],
) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    accumulator: list[Tag] = []

    def flush() -> None:
        if accumulator:
            blocks.append(
                {"type": "rich_text", "body": html_to_prose(accumulator, notes, page_num)}
            )
            accumulator.clear()

    for child in page_div.children:
        if not isinstance(child, Tag):
            continue
        if title_el is not None and child is title_el:
            continue
        if child.name == "h4" and _QUICK_CHECK_RE.match(
            collapse_whitespace(child.get_text()).strip()
        ):
            continue
        if child.name == "button" and "check-page-answers" in (child.get("class") or []):
            continue
        if child.name == "div" and "interactive-question-block" in (child.get("class") or []):
            flush()
            check = _build_knowledge_check(child, page_num, correct_answers, notes)
            if check is not None:
                blocks.append(check)
            else:
                text = collapse_whitespace(child.get_text()).strip()
                body = {
                    "type": "doc",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": text}] if text else [],
                        }
                    ],
                }
                blocks.append({"type": "rich_text", "body": body})
            continue
        accumulator.append(child)

    flush()
    return blocks


def _convert(html: str, notes: list[str]) -> dict[str, Any] | None:
    soup = BeautifulSoup(html, "html.parser")
    page_divs = soup.select("div.lesson-page")
    if not page_divs:
        return None

    correct_answers = _correct_answers(soup)

    pages = []
    for page_num, page_div in enumerate(page_divs, start=1):
        title_el = _find_tag(page_div, "h3")
        if title_el is not None:
            title = _PAGE_TITLE_RE.sub("", collapse_whitespace(title_el.get_text()).strip())
        else:
            title = f"Page {page_num}"
        blocks = _page_blocks(page_div, title_el, page_num, correct_answers, notes)
        pages.append({"title": title, "blocks": blocks})

    return {"pages": pages}


def convert_lesson(index_html: Path, legacy_root: Path) -> tuple[dict[str, Any], Report]:
    """Convert one legacy paged-lesson HTML file into a `LessonImport` document."""
    html = index_html.read_text(encoding="utf-8")
    page = str(index_html.parent.relative_to(legacy_root))
    notes: list[str] = []

    converted = _convert(html, notes)
    if converted is None:
        return {}, Report(page=page, status="unsupported", notes=notes)

    soup = BeautifulSoup(html, "html.parser")
    lesson_dir = index_html.parent
    subject_dir = lesson_dir.parent

    subject_title = subject_dir.name.replace("_", " ")
    subject_slug = _slugify(subject_dir.name)
    lesson_slug = _slugify(lesson_dir.name)

    h1 = soup.select_one(".container h1")
    if h1 is not None:
        lesson_title = collapse_whitespace(h1.get_text()).strip()
    elif soup.title is not None:
        lesson_title = collapse_whitespace(soup.title.get_text()).strip()
    else:
        lesson_title = lesson_slug

    doc = {
        "subject": {"slug": subject_slug, "title": subject_title, "order": 0},
        "lesson": {
            "slug": lesson_slug,
            "title": lesson_title,
            "order": 0,
            "pages": converted["pages"],
        },
    }

    if any(n.startswith("unsupported element") or n.startswith("no correct answer") for n in notes):
        status: Literal["converted", "needs-review", "unsupported"] = "needs-review"
    else:
        status = "converted"

    return doc, Report(page=page, status=status, notes=notes)
