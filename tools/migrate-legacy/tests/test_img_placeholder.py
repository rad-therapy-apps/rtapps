"""Tests for the img → placeholder prose image node mapping.

What this file does: pins that legacy <img> elements become schema-valid `image` nodes
with a deterministic uuid5 placeholder id and preserved alt, that the note is the
actionable "img placeholder (<src>)" form, and that a placeholder marks the document
needs-review.
Used here and why: fragment tests via html_to_prose plus one _convert-level status check.
How it fits the project: plan 3b Task 3 — placeholders let the authoring editor attach
real assets instead of images being silently dropped.
Works with: migrate_legacy.html2prose, migrate_legacy.convert.
"""

import uuid

from bs4 import BeautifulSoup, Tag

from migrate_legacy.convert import _convert
from migrate_legacy.html2prose import html_to_prose


def _el(html: str) -> Tag:
    tag = BeautifulSoup(html, "html.parser").find(True)
    assert isinstance(tag, Tag)
    return tag


def test_img_becomes_placeholder_image_node():
    notes: list[str] = []
    doc = html_to_prose([_el('<img src="figs/linac.png" alt="A linac">')], notes, 1)
    [node] = doc["content"]
    assert node["type"] == "image"
    assert node["attrs"]["alt"] == "A linac"
    expected = str(uuid.uuid5(uuid.NAMESPACE_URL, "figs/linac.png"))
    assert node["attrs"]["mediaAssetId"] == expected
    assert notes == ["img placeholder (figs/linac.png)"]


def test_img_without_alt_uses_filename():
    notes: list[str] = []
    doc = html_to_prose([_el('<img src="figs/beam_profile.png">')], notes, 1)
    assert doc["content"][0]["attrs"]["alt"] == "beam_profile.png"


def test_placeholder_marks_document_needs_review():
    notes: list[str] = []
    html = (
        '<div class="container"><div class="flip-lesson-container">'
        '<div class="lesson-page"><h3>Page 1: Figures</h3>'
        '<p>See below.</p><img src="a.png" alt="A"></div></div></div>'
    )
    assert _convert(html, notes) is not None
    assert any(n.startswith("img placeholder") for n in notes)
