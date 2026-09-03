"""Convert a legacy paged-lesson HTML document into a `LessonImport` JSON document.

Only the "paged lesson" pattern is supported: a document with one or more
`div.lesson-page` elements inside `.container .flip-lesson-container`. Anything
else yields an `unsupported` report and an empty document.

What this file does: reads one legacy `index.html`, finds the lesson pages and their
`interactive-question-block` knowledge checks, and assembles a `{subject, lesson}`
JSON document plus a `Report` describing how clean the conversion was.

Used here and why: BeautifulSoup with the built-in ("html.parser") parser — no
external C dependency (lxml) needed for input this small and this per-tool. Kept as a
pure function of `(html, notes) -> dict | None` (see `_convert`) so it can be
golden-tested (`tests/test_convert.py`) without touching argv or the filesystem; only
`convert_lesson` does file I/O, and only to read the one `index.html` it's given.

How it fits the project: implements the "Migration tool" row of
`docs/03-architecture.md` §11 and the `tools/migrate-legacy/` entry in §9; block-level
rich text is delegated to `html2prose.py`, which maps into the same closed ProseMirror
schema (`packages/schemas/prose-doc.schema.json`) the editor and renderer use.

Works with: `html2prose.html_to_prose`/`inline_nodes`/`collapse_whitespace`/`strip_edges`.
Depends on: beautifulsoup4.
Used by: `cli.convert_lesson` callers; `tests/test_convert.py` and
`tests/test_needs_review.py` exercise it directly.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import pyjson5
from bs4 import BeautifulSoup, Tag

from migrate_legacy.html2prose import collapse_whitespace, html_to_prose, inline_nodes, strip_edges

# Strips the "Page N: " prefix legacy <h3> page titles carry (kept in the source
# markup for authors, redundant once pages are separate `lesson_page` rows).
_PAGE_TITLE_RE = re.compile(r"^Page\s+\d+:\s*", re.IGNORECASE)
# Matches the "Quick check!" <h4> heading that precedes a knowledge check so it can
# be dropped (the block itself carries its own question text).
_QUICK_CHECK_RE = re.compile(r"^quick\s+check[!.,;:]*$", re.IGNORECASE)
# Strips a leading "A. " / "B. " answer-letter prefix off explanation text.
_EXPLANATION_PREFIX_RE = re.compile(r"^[A-Z]\.\s*")
# Pulls the `const lessonCorrectAnswers = {...};` (or the `correctAnswers` variant some
# pages use — keys there lack the radio name's `_ans` suffix) object literal out of an
# inline <script>; the captured group is parsed as JSON below (`_correct_answers`).
_CORRECT_ANSWERS_RE = re.compile(
    r"const\s+(?:lessonCorrectAnswers|correctAnswers)\s*=\s*(\{.*?\});", re.DOTALL
)
# The third answer encoding: per-question check buttons carrying the answer inline,
# e.g. onclick="checkPageAnswer('q_page3_1', 'B')".
_CHECK_PAGE_ANSWER_RE = re.compile(
    r"checkPageAnswer\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]"
)
_SLUG_RE = re.compile(r"[^a-z0-9]+")
# Anything not already lowercase alnum/underscore gets folded to `_` when normalising
# a knowledge-check key (see `_normalise_key`).
_KEY_INVALID_RE = re.compile(r"[^a-z0-9_]")


@dataclass
class Report:
    """One page's conversion outcome: `converted` cleanly, `needs-review` (something
    was mapped lossily or a knowledge check has no answer key — still written), or
    `unsupported` (not the paged-lesson pattern at all — nothing written)."""

    page: str
    status: Literal["converted", "needs-review", "unsupported"]
    notes: list[str] = field(default_factory=list)


def _slugify(name: str) -> str:
    """Turn a legacy directory name (e.g. `RBE_and_OER`) into a URL slug."""
    return _SLUG_RE.sub("-", name.lower()).strip("-")


def _find_tag(parent: Tag, name: str, **kwargs: Any) -> Tag | None:
    """`Tag.find`, narrowed to `Tag | None` (it can only ever match an element tag here)."""
    found = parent.find(name, **kwargs)
    return found if isinstance(found, Tag) else None


def _correct_answers(soup: BeautifulSoup, notes: list[str]) -> dict[str, str]:
    """Gather `{key: correct_value}` from every encoding the legacy pages use: the
    first `lessonCorrectAnswers`/`correctAnswers` object literal (parsed with pyjson5
    for JS-literal syntax), then any `checkPageAnswer('<key>', '<value>')` onclick
    args (which never override an object-literal entry). Keys may or may not carry
    the radio name's `_ans` suffix; `_build_knowledge_check` tries both."""
    answers: dict[str, str] = {}
    for script in soup.find_all("script"):
        match = _CORRECT_ANSWERS_RE.search(script.get_text())
        if match:
            try:
                answers.update(pyjson5.decode(match.group(1)))
            except Exception:
                notes.append("unparseable lessonCorrectAnswers object")
            break
    for tag in soup.find_all(onclick=True):
        m = _CHECK_PAGE_ANSWER_RE.search(str(tag["onclick"]))
        if m and m.group(1) not in answers:
            answers[m.group(1)] = m.group(2)
    return answers


def _one_paragraph_doc(element: Tag, notes: list[str]) -> dict[str, Any]:
    """Wrap one element's inline content in a single-paragraph `doc` (used for a
    knowledge check's question stem)."""
    return {
        "type": "doc",
        "content": [{"type": "paragraph", "content": strip_edges(inline_nodes(element, notes))}],
    }


def _explanation_doc(element: Tag, notes: list[str]) -> dict[str, Any]:
    """Wrap a knowledge check's explanation `<div>` in a single-paragraph `doc`,
    stripping a leading answer-letter prefix ("A. ") from the legacy markup."""
    nodes = strip_edges(inline_nodes(element, notes))
    if nodes and nodes[0]["type"] == "text":
        # Only the first text node can carry the "A. " prefix; drop it here so it
        # doesn't leak into the rendered explanation.
        nodes = [{**nodes[0], "text": _EXPLANATION_PREFIX_RE.sub("", nodes[0]["text"])}, *nodes[1:]]
    return {"type": "doc", "content": [{"type": "paragraph", "content": nodes}]}


def _normalise_key(raw_key: str, notes: list[str]) -> str:
    """Force a radio `name` into the `^[a-z0-9_]+$` shape the API importer
    requires, noting the change so it's traceable back to the legacy markup."""
    # key normalisation: lowercase, then fold every other character to "_"
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

    # Answer index resolution: the answer dict may be keyed by the raw radio `name`
    # (lessonCorrectAnswers) or by the name without its `_ans` suffix (the
    # correctAnswers/checkPageAnswer variants); try both before giving up.
    lookup_keys = [raw_key]
    if raw_key.endswith("_ans"):
        lookup_keys.append(raw_key[: -len("_ans")])
    resolved = next((correct_answers[k] for k in lookup_keys if k in correct_answers), None)
    answer = 0
    if resolved is not None and resolved in values:
        answer = values.index(resolved)
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
    """Walk one page's direct children in document order, dropping the title
    heading, the "Quick check!" heading and the check-answers button, converting
    each `interactive-question-block` into a knowledge check (or a plain rich_text
    fallback if it has no radio input), and batching everything else into
    `rich_text` blocks via `html_to_prose`."""
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
        if child.name == "button" and (
            "check-page-answers" in (child.get("class") or [])
            or _CHECK_PAGE_ANSWER_RE.search(str(child.get("onclick") or ""))
        ):
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
    """Parse the page and convert every `div.lesson-page` into `{title, blocks}`.
    Returns `None` (not `{"pages": []}`) when there are no lesson-page elements at
    all, which `convert_lesson` maps to an `unsupported` report."""
    soup = BeautifulSoup(html, "html.parser")
    page_divs = soup.select("div.lesson-page")
    if not page_divs:
        return None

    correct_answers = _correct_answers(soup, notes)

    # Some legacy files are two whole documents concatenated (a source authoring bug —
    # `</html>` immediately followed by another `<head>...<body>`); html.parser still
    # walks past the close tag and picks up the second copy's `.lesson-page` elements too,
    # so the same page (identical title + blocks) shows up twice in `page_divs`. Drop an
    # exact repeat rather than emit a lesson with duplicate knowledge_check keys.
    pages: list[dict[str, Any]] = []
    for page_num, page_div in enumerate(page_divs, start=1):
        title_el = _find_tag(page_div, "h3")
        if title_el is not None:
            title = _PAGE_TITLE_RE.sub("", collapse_whitespace(title_el.get_text()).strip())
        else:
            title = f"Page {page_num}"
        blocks = _page_blocks(page_div, title_el, page_num, correct_answers, notes)
        page = {"title": title, "blocks": blocks}
        if page in pages:
            notes.append(f"duplicate lesson page dropped (page {page_num}, {title!r})")
            continue
        pages.append(page)

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

    # A document is only "converted" cleanly if nothing was mapped lossily
    # (unsupported element) or left ambiguous (missing answer key); those two note
    # prefixes are the ones downgrading it to "needs-review" for a human to check.
    if any(n.startswith("unsupported element") or n.startswith("no correct answer") for n in notes):
        status: Literal["converted", "needs-review", "unsupported"] = "needs-review"
    else:
        status = "converted"

    return doc, Report(page=page, status=status, notes=notes)
