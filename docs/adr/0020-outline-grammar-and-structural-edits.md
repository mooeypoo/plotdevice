# ADR 0020: A small outline grammar with line-exact structural edits

**Status:** accepted (2026-10-22). Amends the "Outlines" section of `docs/file-format.md`,
which said the app never parses or changes an outline's structure. See
`docs/plans/workbench-ui-plan.md`.

## Context

Plotting mode shows a board over the writer's outline and lets the writer rearrange it.
The outline is free Markdown that must stay safe to edit anywhere. Re-rendering Markdown
would reformat it, and a general Markdown AST library can't run in pure domain code.

## Decision

- A new **`outline` bounded context** owns `type: outline` files: listing, creation,
  text open/save (moved from codex), the grammar, structural commands, and capture.
- The grammar is a conservative, line-based reading of the body with source ranges:
  - an ATX `##` heading starts a **column**; text before the first `##` is the preamble;
  - a top-level bullet item (`-`, `*`, `+`) in a column is a **beat**. Its continuation
    lines (nested items, indented text) are its **notes**;
  - a project link in a beat's first line ties it to a chapter;
  - a tag equal to a thread key from `novel.md` (for example `#strike`) marks its thread;
  - fenced code, HTML blocks, setext headings, ordered items and anything else are plain
    content. They keep their place and are never moved implicitly.
- The board is a **projection**: it holds nothing the file can't express.
- Structural commands (move beat, move column, add beat, retitle beat, edit notes, capture)
  are pure planners over source ranges. They splice whole lines, write new lines with the
  file's own line ending, never touch frontmatter, and refuse when the text changed since
  it was read (version check) or when an edit would require changing an unmodelled line.
- Every command is proven on fixture outlines, including hostile ones (CRLF, BOM, mixed
  endings, no trailing newline, YAML comments, mixed-direction text, code fences, text
  that doesn't match the grammar): bytes outside the edited lines are identical.
- **Capture** appends a bullet under the Inbox column at the end of the chosen outline,
  creating the heading from the resolved vocabulary (ADR 0019) if missing. It never edits
  or moves existing beats.
- Writes follow ADR 0018: flush the editor, refuse an unresolved draft of the outline,
  then the editor adopts the written text.

- Lines keep their own endings. New lines use the file's most common ending, and a last line
  without one gains one only when something is placed after it. A moved block carries the
  blank lines that separated it, so a move and its reverse restore the original bytes.
- A card's linked chapter is edited (synopsis, status) through the manuscript's property
  commands, never through the outline: each file is written by the context that owns it.
- Until the board needs it (P2), outlines keep travelling through the codex API: its IPC handler
  forwards listing, creation, open and save to the outline context, so P1 changes no contract.

## Consequences

- An outline that matches the grammar gets a board; one that doesn't is still readable
  and editable as text, with nothing lost.
- The renderer's Markdown view (markdown-it) and the board grammar can disagree on rare
  constructs. The board is conservative: when in doubt, a line is plain content.
- The thread grid (threads × chapters) is derived from chapter frontmatter, not the
  outline, and is planned separately.
