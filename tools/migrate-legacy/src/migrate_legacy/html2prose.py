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
"""

from __future__ import annotations

import re
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
                notes.append("highlight→bold")
                out.extend(inline_nodes(child, notes, [*marks, {"type": "bold"}]))
            elif name == "a" and str(child.get("href", "")).startswith("https://"):
                link_mark = {"type": "link", "attrs": {"href": child["href"]}}
                out.extend(inline_nodes(child, notes, [*marks, link_mark]))
            elif name == "a":
                notes.append("dropped non-https link")
                out.extend(inline_nodes(child, notes, marks))
            else:
                notes.append(f"unsupported inline element {name}")
                out.extend(inline_nodes(child, notes, marks))
    return out


def _paragraph(element: Tag, notes: list[str]) -> dict[str, Any]:
    return {"type": "paragraph", "content": strip_edges(inline_nodes(element, notes))}


def _heading(element: Tag, level: int, notes: list[str]) -> dict[str, Any]:
    return {
        "type": "heading",
        "attrs": {"level": level},
        "content": strip_edges(inline_nodes(element, notes)),
    }


def _list_block(element: Tag, kind: str, notes: list[str]) -> dict[str, Any]:
    items = [
        {
            "type": "listItem",
            "content": [{"type": "paragraph", "content": strip_edges(inline_nodes(li, notes))}],
        }
        for li in element.find_all("li", recursive=False)
    ]
    return {"type": kind, "content": items}


def _table_block(element: Tag, notes: list[str]) -> dict[str, Any]:
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
        notes.append("img without media asset")
        return None

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
            block = element_to_block(el, notes, page_num)
            if block is not None:
                content.append(block)
    return {"type": "doc", "content": content}
