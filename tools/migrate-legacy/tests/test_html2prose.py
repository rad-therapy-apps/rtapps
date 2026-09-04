"""Unit tests for `html2prose`'s HTML-fragment -> ProseMirror-node mapping rules.

What this file does: exercises `inline_nodes`/`element_to_block`/`html_to_prose`
directly against small hand-written HTML fragments (not full lesson pages — see
`test_convert.py`/`test_needs_review.py` for that), one mapping rule per test.

Used here and why: fragment-level tests keep each rule's assertion small and
independent of page/knowledge-check structure, so a rule can be pinned down (or a
regression caught) without regenerating a golden file.

How it fits the project: covers the `docs/03-architecture.md` §5 mapping from legacy
markup onto the closed prose-doc schema.

Depends on: pytest, beautifulsoup4.
Used by: `make test-tools` / `uv run pytest` (from `tools/migrate-legacy`); the
`tools` job in `.github/workflows/pr.yml`.
"""

from bs4 import BeautifulSoup, Tag

from migrate_legacy.html2prose import element_to_block, html_to_prose, inline_nodes


def _fragment(html: str) -> Tag:
    """Parse an HTML fragment and return its single top-level tag."""
    soup = BeautifulSoup(html, "html.parser")
    tag = next(c for c in soup.contents if isinstance(c, Tag))
    assert isinstance(tag, Tag)
    return tag


# Mapping rule: strong/b, em/i, u, sub, sup each become a text node with one mark.
def test_paragraph_with_marks() -> None:
    p = _fragment(
        "<p>A <strong>bold</strong> word, an <em>italic</em> one, "
        "H<sub>2</sub>O and x<sup>2</sup>.</p>"
    )
    notes: list[str] = []
    assert inline_nodes(p, notes) == [
        {"type": "text", "text": "A "},
        {"type": "text", "text": "bold", "marks": [{"type": "bold"}]},
        {"type": "text", "text": " word, an "},
        {"type": "text", "text": "italic", "marks": [{"type": "italic"}]},
        {"type": "text", "text": " one, H"},
        {"type": "text", "text": "2", "marks": [{"type": "subscript"}]},
        {"type": "text", "text": "O and x"},
        {"type": "text", "text": "2", "marks": [{"type": "superscript"}]},
        {"type": "text", "text": "."},
    ]
    assert notes == []


# Mapping rule: span.highlight -> bold is lossy, so it must also append a note.
def test_span_highlight_becomes_bold_with_note() -> None:
    p = _fragment('<p>See <span class="highlight">this</span> now.</p>')
    notes: list[str] = []
    nodes = inline_nodes(p, notes)
    assert {"type": "text", "text": "this", "marks": [{"type": "bold"}]} in nodes
    assert notes == ["highlight→bold"]


# Mapping rule: <br> becomes a standalone hardBreak node, not a text node.
def test_br_becomes_hard_break() -> None:
    p = _fragment("<p>line one<br>line two</p>")
    notes: list[str] = []
    nodes = inline_nodes(p, notes)
    assert nodes == [
        {"type": "text", "text": "line one"},
        {"type": "hardBreak"},
        {"type": "text", "text": "line two"},
    ]


# Mapping rule: runs of whitespace collapse to one space, then leading/trailing
# whitespace is stripped off the paragraph's edge text nodes.
def test_whitespace_collapsing_and_edge_stripping() -> None:
    p = _fragment("<p>  Lots   of\n   whitespace   here  </p>")
    notes: list[str] = []
    block = element_to_block(p, notes)
    assert block == {
        "type": "paragraph",
        "content": [{"type": "text", "text": "Lots of whitespace here"}],
    }


# Mapping rule: div.key-principle with block children (<p>s) becomes a callout
# whose content is those blocks, mapped recursively.
def test_key_principle_with_paragraphs_becomes_callout() -> None:
    div = _fragment('<div class="key-principle"><p>First point.</p><p>Second point.</p></div>')
    notes: list[str] = []
    block = element_to_block(div, notes)
    assert block == {
        "type": "callout",
        "attrs": {"kind": "key-principle"},
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "First point."}]},
            {"type": "paragraph", "content": [{"type": "text", "text": "Second point."}]},
        ],
    }


# Mapping rule: a callout container with no block children (just bare text/inline
# tags) is wrapped as a single paragraph, not one paragraph per text run.
def test_key_principle_bare_text_becomes_one_paragraph() -> None:
    div = _fragment('<div class="key-principle">Just some <strong>text</strong>.</div>')
    notes: list[str] = []
    block = element_to_block(div, notes)
    assert block == {
        "type": "callout",
        "attrs": {"kind": "key-principle"},
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Just some "},
                    {"type": "text", "text": "text", "marks": [{"type": "bold"}]},
                    {"type": "text", "text": "."},
                ],
            }
        ],
    }


# Mapping rule: a mix of a block child and trailing loose text wraps the loose run
# in its own paragraph (in document order), rather than dropping it, and notes it.
def test_key_principle_mixed_block_and_loose_text_wraps_trailing_run() -> None:
    div = _fragment('<div class="key-principle"><p>Real point.</p>Some loose trailing text.</div>')
    notes: list[str] = []
    block = element_to_block(div, notes)
    assert block == {
        "type": "callout",
        "attrs": {"kind": "key-principle"},
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Real point."}]},
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Some loose trailing text."}],
            },
        ],
    }
    assert "mixed inline content wrapped in paragraph in div" in notes


# Mapping rule: same loose-content wrapping as callouts, but leading (not
# trailing) and for blockquote, confirming document order is preserved either way.
def test_blockquote_mixed_leading_inline_and_block_preserves_order() -> None:
    bq = _fragment("<blockquote>Lead <strong>text</strong><p>Then a para.</p></blockquote>")
    notes: list[str] = []
    block = element_to_block(bq, notes)
    assert block == {
        "type": "blockquote",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Lead "},
                    {"type": "text", "text": "text", "marks": [{"type": "bold"}]},
                ],
            },
            {"type": "paragraph", "content": [{"type": "text", "text": "Then a para."}]},
        ],
    }
    assert "mixed inline content wrapped in paragraph in blockquote" in notes


# Mapping rule: <ul><li> becomes bulletList/listItem, each item's text in its own
# paragraph.
def test_unordered_list_becomes_bullet_list() -> None:
    ul = _fragment("<ul><li>One</li><li>Two</li></ul>")
    notes: list[str] = []
    block = element_to_block(ul, notes)
    assert block == {
        "type": "bulletList",
        "content": [
            {
                "type": "listItem",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "One"}]}],
            },
            {
                "type": "listItem",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Two"}]}],
            },
        ],
    }
    assert notes == []


# Mapping rule: <table> becomes table/tableRow/tableCell; <th> cells get
# attrs.header: true so the renderer can style them.
def test_table_with_header_row() -> None:
    table = _fragment(
        "<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>"
    )
    notes: list[str] = []
    block = element_to_block(table, notes)
    assert block == {
        "type": "table",
        "content": [
            {
                "type": "tableRow",
                "content": [
                    {
                        "type": "tableCell",
                        "attrs": {"header": True},
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Name"}]}
                        ],
                    }
                ],
            },
            {
                "type": "tableRow",
                "content": [
                    {
                        "type": "tableCell",
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Value"}]}
                        ],
                    }
                ],
            },
        ],
    }


# Mapping rule: https-only link rule — a plain http:// link loses its mark
# (becomes bare text) and is noted, rather than importing a disallowed href.
def test_plain_http_link_is_dropped_to_text() -> None:
    p = _fragment('<p>See <a href="http://example.com">this page</a> for more.</p>')
    notes: list[str] = []
    nodes = inline_nodes(p, notes)
    assert {"type": "text", "text": "this page"} in nodes
    assert not any(n.get("marks") for n in nodes)
    assert "dropped non-https link" in notes


# Mapping rule: https-only link rule's positive case — an https:// link keeps
# its href as a `link` mark, with no note (nothing lossy happened).
def test_https_link_is_kept() -> None:
    p = _fragment('<p>See <a href="https://example.com">this page</a>.</p>')
    notes: list[str] = []
    nodes = inline_nodes(p, notes)
    assert {
        "type": "text",
        "text": "this page",
        "marks": [{"type": "link", "attrs": {"href": "https://example.com"}}],
    } in nodes
    assert notes == []


# Mapping rule: an unrecognised block tag still keeps its text (mapped to a plain
# paragraph) rather than being silently dropped, and gets an "unsupported element"
# note carrying the page number — this note prefix is what downgrades a lesson's
# overall status to needs-review (see `convert.py`).
def test_unknown_element_is_noted_and_mapped_to_paragraph() -> None:
    tag = _fragment("<marquee>scrolling text</marquee>")
    notes: list[str] = []
    block = element_to_block(tag, notes, page_num=3)
    assert block == {"type": "paragraph", "content": [{"type": "text", "text": "scrolling text"}]}
    assert notes == ["unsupported element marquee on page 3"]


# Mapping rule: <img> becomes a placeholder `image` node with a deterministic uuid5
# mediaAssetId (so re-scans are stable), preserving the alt text. The note is
# "img placeholder (<src>)" to be actionable for review (the author must attach
# the actual asset), and the placeholder presence downgrades the document to
# needs-review status.
def test_img_becomes_placeholder_image_node() -> None:
    import uuid

    img = _fragment('<img src="a.png" alt="a">')
    notes: list[str] = []
    block = element_to_block(img, notes)
    expected_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "a.png"))
    assert block == {"type": "image", "attrs": {"mediaAssetId": expected_id, "alt": "a"}}
    assert notes == ["img placeholder (a.png)"]


# Mapping rule: html_to_prose wraps a top-level sequence of elements (a page's
# accumulated rich-text children) into one `doc`, each mapped by element_to_block.
def test_html_to_prose_wraps_multiple_elements_in_one_doc() -> None:
    soup = BeautifulSoup("<p>First.</p><div class='key-principle'><p>Key.</p></div>", "html.parser")
    elements = [c for c in soup.contents if isinstance(c, Tag)]
    notes: list[str] = []
    doc = html_to_prose(elements, notes)
    assert doc == {
        "type": "doc",
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "First."}]},
            {
                "type": "callout",
                "attrs": {"kind": "key-principle"},
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Key."}]}],
            },
        ],
    }
