"""Map legacy lesson HTML elements to the closed prose-doc schema.

`inline_nodes` walks the children of an inline-context element (a `<p>`, `<li>`,
`<label>`, table cell, heading, …) into `text`/`hardBreak` prose nodes.
`element_to_block` maps a single top-level "rich text" element (a `<p>`,
`div.key-principle`, `<ul>`, `<table>`, …) into one prose block, or `None` when
the element is dropped (e.g. `<img>`). `html_to_prose` wraps a sequence of such
elements into one `doc`.

Every function takes a `notes` list it appends human-readable notes to
(lossy mappings, unsupported elements) — callers inspect it to decide the
overall conversion `Report` status.

What this file does: the pure HTML-fragment -> ProseMirror-JSON mapper used by
`convert.py`; every node/mark it can produce is one the closed schema in
`packages/schemas/prose-doc.schema.json` accepts, so output never needs a second
validation pass to catch an unknown type.

Used here and why: kept free of file I/O and of `convert.py`'s page/knowledge-check
concerns so the mapping rules (marks, callouts, lists, tables, the https-only link
rule, the highlight->bold lossiness) can be unit-tested in isolation
(`tests/test_html2prose.py`) against small HTML fragments.

How it fits the project: implements the legacy side of ADR-0003 (content as
ProseMirror JSON) referenced in `docs/03-architecture.md` §5 — the same node/mark set
the (future) TipTap editor and the `ProseNode.svelte` renderer use.

Works with: `convert.py` (block-level callers), `packages/schemas/prose-doc.schema.json`
(the schema every produced node must satisfy).
Depends on: beautifulsoup4 (`NavigableString`, `Tag`).
Used by: `convert.py`'s `_page_blocks`/`_one_paragraph_doc`/`_explanation_doc`.
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Iterable, Sequence
from typing import Any

from bs4 import NavigableString, Tag

_WHITESPACE_RE = re.compile(r"\s+")

_MARK_TAGS = {
    "strong": "bold",
    "b": "bold",
    "em": "italic",
    "i": "italic",
    "u": "underline",
    "code": "code",
    "sub": "subscript",
    "sup": "superscript",
}

# Inline-context tags whose content is kept and whose wrapper is meaningless in the
# closed schema: unwrap silently (no note) instead of flagging them for review.
_UNWRAP_INLINE = {"span", "label", "font", "p", "div", "small", "section", "article"}

# Tags that `element_to_block`/`blocks_from_container` treat as top-level
# "rich text" block producers; anything else falls into the unsupported bucket.
_BLOCK_TAGS = {"p", "div", "h2", "h3", "h4", "ul", "ol", "table", "blockquote", "img"}


def collapse_whitespace(text: str) -> str:
    """Collapse runs of whitespace (including newlines) into a single space."""
    return _WHITESPACE_RE.sub(" ", text)


def strip_edges(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Strip leading/trailing whitespace off the first/last text node, dropping
    either if it becomes empty. Never mutates the input list's node dicts."""
    nodes = list(nodes)
    if nodes and nodes[0]["type"] == "text":
        stripped = nodes[0]["text"].lstrip()
        if stripped == "":
            nodes = nodes[1:]
        else:
            nodes[0] = {**nodes[0], "text": stripped}
    if nodes and nodes[-1]["type"] == "text":
        stripped = nodes[-1]["text"].rstrip()
        if stripped == "":
            nodes = nodes[:-1]
        else:
            nodes[-1] = {**nodes[-1], "text": stripped}
    return nodes


def inline_nodes(
    element: Tag, notes: list[str], marks: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    """Map the children of an inline-context element into prose inline nodes."""
    return _inline_nodes_from(element.children, notes, marks)


def _inline_nodes_from(
    children: Iterable[Any], notes: list[str], marks: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    """Map a run of sibling nodes (not necessarily all of one element's
    children) into prose inline nodes. Shared by `inline_nodes` and by
    `blocks_from_container`'s loose-content wrapping."""
    marks = marks or []
    out: list[dict[str, Any]] = []
    for child in children:
        if isinstance(child, NavigableString):
            text = collapse_whitespace(str(child))
            if text == "":
                continue
            node: dict[str, Any] = {"type": "text", "text": text}
            if marks:
                node["marks"] = list(marks)
            out.append(node)
        elif isinstance(child, Tag):
            name = child.name
            if name == "input":
                continue  # radio inputs inside knowledge-check labels
            if name == "br":
                out.append({"type": "hardBreak"})
            elif name in _MARK_TAGS:
                out.extend(inline_nodes(child, notes, [*marks, {"type": _MARK_TAGS[name]}]))
            elif name == "span" and "highlight" in (child.get("class") or []):
                # span.highlight -> bold: the schema has no "highlight" mark, so this
                # is a lossy but readable substitute; flagged so a reviewer can see
                # where visual emphasis changed meaning.
                notes.append("highlight→bold")
                out.extend(inline_nodes(child, notes, [*marks, {"type": "bold"}]))
            elif name == "a" and str(child.get("href", "")).startswith("https://"):
                # https-only link rule: the schema's `link` mark only allows https
                # hrefs (ADR-0003 / §5), matching the strict CSP's same policy.
                link_mark = {"type": "link", "attrs": {"href": child["href"]}}
                out.extend(inline_nodes(child, notes, [*marks, link_mark]))
            elif name == "a":
                # Non-https link: dropped to plain text rather than imported as an
                # invalid mark that would fail schema validation.
                notes.append("dropped non-https link")
                out.extend(inline_nodes(child, notes, marks))
            elif name in ("ul", "ol"):
                # An inline-context list can't become a list block (lists are block
                # nodes); flatten each <li> to its inline content, separated by
                # hardBreaks, so nothing is lost and nothing needs review.
                for i, li in enumerate(child.find_all("li")):
                    if i:
                        out.append({"type": "hardBreak"})
                    out.extend(inline_nodes(li, notes, marks))
            elif name == "li":
                out.extend(inline_nodes(child, notes, marks))
            elif name in ("h4", "h5", "h6"):
                # A heading nested in inline context: keep the text, bolded.
                out.extend(inline_nodes(child, notes, [*marks, {"type": "bold"}]))
            elif name == "img":
                src = str(child.get("src") or "")
                alt = collapse_whitespace(str(child.get("alt") or "")).strip() or "image"
                notes.append(f"img placeholder ({src or 'no src'})")
                out.append({"type": "text", "text": f"[{alt}]"})
            elif name in _UNWRAP_INLINE:
                out.extend(inline_nodes(child, notes, marks))
            else:
                notes.append(f"unsupported inline element {name}")
                out.extend(inline_nodes(child, notes, marks))
    return out


def _image_placeholder(element: Tag, notes: list[str]) -> dict[str, Any]:
    """Map an <img> to a prose `image` node with a deterministic placeholder id.

    uuid5(src) resolves to no real media_asset, so the renderer shows the alt text;
    the authoring editor replaces the id when the author uploads the real image.
    Deterministic so re-scans and golden tests are stable."""
    src = str(element.get("src") or "")
    alt = collapse_whitespace(str(element.get("alt") or "")).strip()
    if not alt:
        alt = src.rsplit("/", 1)[-1] if src else "image"
    notes.append(f"img placeholder ({src or 'no src'})")
    placeholder = str(uuid.uuid5(uuid.NAMESPACE_URL, src or alt))
    return {"type": "image", "attrs": {"mediaAssetId": placeholder, "alt": alt}}


def _paragraph(element: Tag, notes: list[str]) -> dict[str, Any]:
    """Map a `<p>` (or any inline-context element) to a `paragraph` block."""
    return {"type": "paragraph", "content": strip_edges(inline_nodes(element, notes))}


def _heading(element: Tag, level: int, notes: list[str]) -> dict[str, Any]:
    """Map an `<h2>`/`<h3>`/`<h4>` to a `heading` block at the given level."""
    return {
        "type": "heading",
        "attrs": {"level": level},
        "content": strip_edges(inline_nodes(element, notes)),
    }


def _list_block(element: Tag, kind: str, notes: list[str]) -> dict[str, Any]:
    """Map a `<ul>`/`<ol>`'s direct `<li>` children to `bulletList`/`orderedList`
    (`kind`), each wrapped as a `listItem` containing one `paragraph`."""
    items = [
        {
            "type": "listItem",
            "content": [{"type": "paragraph", "content": strip_edges(inline_nodes(li, notes))}],
        }
        for li in element.find_all("li", recursive=False)
    ]
    return {"type": kind, "content": items}


def _table_block(element: Tag, notes: list[str]) -> dict[str, Any]:
    """Map a `<table>` to a `table` block; `<th>` cells get `attrs.header: true`."""
    rows = []
    for tr in element.find_all("tr"):
        cells = []
        for cell in tr.find_all(["th", "td"], recursive=False):
            cell_block: dict[str, Any] = {
                "type": "tableCell",
                "content": [
                    {"type": "paragraph", "content": strip_edges(inline_nodes(cell, notes))}
                ],
            }
            if cell.name == "th":
                cell_block["attrs"] = {"header": True}
            cells.append(cell_block)
        rows.append({"type": "tableRow", "content": cells})
    return {"type": "table", "content": rows}


_CALLOUT_CLASSES = {"key-principle", "clinical-note", "warning"}


def _is_plain_div(el: Tag) -> bool:
    """A block-level <div> with no callout class: a layout wrapper, not content."""
    return el.name == "div" and not (set(el.get("class") or []) & _CALLOUT_CLASSES)


def blocks_from_container(element: Tag, notes: list[str], page_num: int) -> list[dict[str, Any]]:
    """Map the direct children of a container (callout, blockquote, li, td, …)
    into blocks: block-level children (`<p>`, lists, …) map recursively via
    `element_to_block`. Loose runs of non-block content (bare text, or inline
    tags like `<span>`/`<strong>` directly under the container) between/around
    the block children are wrapped into synthesized paragraph blocks, in
    document order, rather than dropped. If the container has no block
    children at all, the whole thing is wrapped in one paragraph."""
    block_children = [c for c in element.children if isinstance(c, Tag) and c.name in _BLOCK_TAGS]
    if not block_children:
        return [_paragraph(element, notes)]

    blocks: list[dict[str, Any]] = []
    run: list[Any] = []
    wrapped_loose_content = False

    def flush_run() -> None:
        nonlocal wrapped_loose_content
        if not run:
            return
        content = strip_edges(_inline_nodes_from(run, notes))
        if content:
            blocks.append({"type": "paragraph", "content": content})
            wrapped_loose_content = True
        run.clear()

    for child in element.children:
        if isinstance(child, Tag) and child.name in _BLOCK_TAGS:
            flush_run()
            if _is_plain_div(child):
                blocks.extend(blocks_from_container(child, notes, page_num))
            else:
                block = element_to_block(child, notes, page_num)
                if block is not None:
                    blocks.append(block)
        else:
            run.append(child)
    flush_run()

    if wrapped_loose_content:
        notes.append(f"mixed inline content wrapped in paragraph in {element.name}")

    return blocks or [_paragraph(element, notes)]


def element_to_block(element: Tag, notes: list[str], page_num: int = 0) -> dict[str, Any] | None:
    """Map one top-level rich-text element to a prose block, or None to drop it."""
    name = element.name
    classes = element.get("class") or []

    if name == "p":
        return _paragraph(element, notes)
    if name == "div" and "key-principle" in classes:
        return {
            "type": "callout",
            "attrs": {"kind": "key-principle"},
            "content": blocks_from_container(element, notes, page_num),
        }
    if name == "div" and "clinical-note" in classes:
        return {
            "type": "callout",
            "attrs": {"kind": "clinical-note"},
            "content": blocks_from_container(element, notes, page_num),
        }
    if name == "div" and "warning" in classes:
        return {
            "type": "callout",
            "attrs": {"kind": "warning"},
            "content": blocks_from_container(element, notes, page_num),
        }
    if name in ("h2", "h3", "h4"):
        return _heading(element, int(name[1]), notes)
    if name == "ul":
        return _list_block(element, "bulletList", notes)
    if name == "ol":
        return _list_block(element, "orderedList", notes)
    if name == "table":
        return _table_block(element, notes)
    if name == "blockquote":
        return {"type": "blockquote", "content": blocks_from_container(element, notes, page_num)}
    if name == "img":
        return _image_placeholder(element, notes)
    if name == "div":
        # Plain layout div (both callers normally intercept this): recurse rather than
        # flatten, and return a single blockquote-free wrapper is impossible — so fall
        # back to the first child block or an empty paragraph.
        inner = blocks_from_container(element, notes, page_num)
        return inner[0] if len(inner) == 1 else {"type": "paragraph", "content": []}

    notes.append(f"unsupported element {name} on page {page_num}")
    text = collapse_whitespace(element.get_text()).strip()
    return {"type": "paragraph", "content": [{"type": "text", "text": text}] if text else []}


def html_to_prose(
    elements: Iterable[Any] | Sequence[Any], notes: list[str], page_num: int = 0
) -> dict[str, Any]:
    """Wrap a sequence of top-level rich-text elements into one `doc`."""
    content = []
    for el in elements:
        if isinstance(el, Tag):
            if _is_plain_div(el):
                content.extend(blocks_from_container(el, notes, page_num))
            else:
                block = element_to_block(el, notes, page_num)
                if block is not None:
                    content.append(block)
    return {"type": "doc", "content": content}
