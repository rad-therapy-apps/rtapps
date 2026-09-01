"""Extract JS array literals from legacy HTML and parse them via pyjson5.

What this file does: finds inline `const/let/var NAME = [ … ];` array-of-dicts
declarations in <script> blocks, validates their syntax via bracket matching,
and parses the JSON5 literals into Python objects. Skips unparseable arrays with
a note (not fatal — parsing failures are flagged for review but do not stop
extraction of other arrays).

Used here and why: `pyjson5` (runtime dep) handles legacy JS syntax (unquoted
keys, single quotes, trailing commas) without requiring a full JS parser.
Bracket matching is done manually (`_match_bracket`) because regexes cannot
balance nesting or skip string contents reliably; only complete, well-formed
literals make it to pyjson5.

How it fits the project: implements the JS-literal-extraction leg of the
activity-data migration path (Task 6 of plan 3a); used by `activities.py`
to classify and convert quiz, flashcard, and other interactive data.

Works with: `activities.classify_arrays` and `activities.convert_quiz`, etc.
Depends on: pyjson5 (1.6+).
Used by: Task 7's scanner and converter pipeline; `tests/test_extract.py` exercises
this directly.
"""

import re
from typing import Any

import pyjson5

# Matches the declaration up to its opening bracket; the literal itself is bracket-matched
# below because regexes can't balance nesting or skip string contents.
_DECL_RE = re.compile(r"(?:const|let|var)\s+(\w+)\s*=\s*\[")


def _match_bracket(text: str, start: int) -> int | None:
    """Index just past the ']' matching text[start] == '[', honouring JS strings/escapes."""
    depth, i, quote = 0, start, None
    while i < len(text):
        c = text[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "'\"`":
            quote = c
        elif c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return None


def js_arrays(html: str, notes: list[str]) -> dict[str, list[Any]]:
    """Every parseable `const NAME = [ {…} ];` array-of-objects literal in the document."""
    out: dict[str, list[Any]] = {}
    for m in _DECL_RE.finditer(html):
        name = m.group(1)
        end = _match_bracket(html, m.end() - 1)
        if end is None:
            notes.append(f"unbalanced array literal {name}")
            continue
        literal = html[m.end() - 1 : end]
        try:
            value = pyjson5.decode(literal)
        except Exception:
            # Any parse failure just flags the array for review; non-fatal.
            notes.append(f"unparseable array literal {name}")
            continue
        # Only arrays of objects are candidate activity data.
        if isinstance(value, list) and value and all(isinstance(v, dict) for v in value):
            out[name] = value
    return out
