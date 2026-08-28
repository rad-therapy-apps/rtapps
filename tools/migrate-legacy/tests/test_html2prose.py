from bs4 import BeautifulSoup, Tag

from migrate_legacy.html2prose import element_to_block, html_to_prose, inline_nodes


def _fragment(html: str) -> Tag:
    """Parse an HTML fragment and return its single top-level tag."""
    soup = BeautifulSoup(html, "html.parser")
    tag = next(c for c in soup.contents if isinstance(c, Tag))
    assert isinstance(tag, Tag)
    return tag


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


def test_span_highlight_becomes_bold_with_note() -> None:
    p = _fragment('<p>See <span class="highlight">this</span> now.</p>')
    notes: list[str] = []
    nodes = inline_nodes(p, notes)
    assert {"type": "text", "text": "this", "marks": [{"type": "bold"}]} in nodes
    assert notes == ["highlight→bold"]


def test_br_becomes_hard_break() -> None:
    p = _fragment("<p>line one<br>line two</p>")
    notes: list[str] = []
    nodes = inline_nodes(p, notes)
    assert nodes == [
        {"type": "text", "text": "line one"},
        {"type": "hardBreak"},
        {"type": "text", "text": "line two"},
    ]


def test_whitespace_collapsing_and_edge_stripping() -> None:
    p = _fragment("<p>  Lots   of\n   whitespace   here  </p>")
    notes: list[str] = []
    block = element_to_block(p, notes)
    assert block == {
        "type": "paragraph",
        "content": [{"type": "text", "text": "Lots of whitespace here"}],
    }


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


def test_plain_http_link_is_dropped_to_text() -> None:
    p = _fragment('<p>See <a href="http://example.com">this page</a> for more.</p>')
    notes: list[str] = []
    nodes = inline_nodes(p, notes)
    assert {"type": "text", "text": "this page"} in nodes
    assert not any(n.get("marks") for n in nodes)
    assert "dropped non-https link" in notes


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


def test_unknown_element_is_noted_and_mapped_to_paragraph() -> None:
    tag = _fragment("<marquee>scrolling text</marquee>")
    notes: list[str] = []
    block = element_to_block(tag, notes, page_num=3)
    assert block == {"type": "paragraph", "content": [{"type": "text", "text": "scrolling text"}]}
    assert notes == ["unsupported element marquee on page 3"]


def test_img_is_dropped_without_flagging_unsupported_prefix() -> None:
    img = _fragment('<img src="a.png" alt="a">')
    notes: list[str] = []
    block = element_to_block(img, notes)
    assert block is None
    assert notes == ["img without media asset"]


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
