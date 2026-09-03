"""Tests for silent unwrapping of benign legacy elements in html2prose.py.

What this file does: pins that plain spans/labels/divs/p in inline context unwrap with no
note, inline lists flatten to hardBreak-separated runs with no note, inline h4 unwraps as
bold, and a plain block-level div recurses into its children instead of flattening to one
text glob — while a genuinely unknown element still produces a note.
Used here and why: fragment-level tests via BeautifulSoup + the public mapper functions,
matching test_html2prose.py's style.
How it fits the project: plan 3b Task 2 — clears the benign "unsupported element" families
from the needs-review report.
Works with: migrate_legacy.html2prose.
"""

from bs4 import BeautifulSoup, Tag

from migrate_legacy.html2prose import html_to_prose, inline_nodes


def _el(html: str) -> Tag:
    tag = BeautifulSoup(html, "html.parser").find(True)
    assert isinstance(tag, Tag)
    return tag


def test_plain_span_unwraps_silently():
    notes: list[str] = []
    nodes = inline_nodes(_el("<p>alpha <span>beta</span> gamma</p>"), notes)
    assert "".join(n.get("text", "") for n in nodes) == "alpha beta gamma"
    assert notes == []


def test_inline_list_flattens_with_hardbreaks_silently():
    notes: list[str] = []
    nodes = inline_nodes(_el("<p>Signs: <ul><li>one</li><li>two</li></ul></p>"), notes)
    assert {"type": "hardBreak"} in nodes
    texts = [n["text"] for n in nodes if n["type"] == "text"]
    assert "one" in texts and "two" in texts
    assert notes == []


def test_inline_h4_unwraps_as_bold():
    notes: list[str] = []
    nodes = inline_nodes(_el("<p><h4>Heading-ish</h4>rest</p>"), notes)
    bolded = [n for n in nodes if {"type": "bold"} in n.get("marks", [])]
    assert bolded and bolded[0]["text"].startswith("Heading-ish")
    assert notes == []


def test_plain_div_block_recurses_into_children():
    notes: list[str] = []
    doc = html_to_prose(
        [_el("<div><p>first para</p><ul><li>item</li></ul></div>")], notes, page_num=1
    )
    types = [b["type"] for b in doc["content"]]
    assert types == ["paragraph", "bulletList"]
    assert not any(n.startswith("unsupported element div") for n in notes)


def test_unknown_element_still_noted():
    notes: list[str] = []
    inline_nodes(_el("<p><canvas>x</canvas></p>"), notes)
    assert any("unsupported inline element canvas" in n for n in notes)
