# ADR 0003: Markdown fidelity and outline mapping

Status: **Accepted** (owner, 2026-10-25) · Date: 2026-10-25 · Evidence: `docs/spikes/outline.md`

## Context

Authors own their Markdown. Loading and saving without changes must produce identical bytes, and edits must touch only what changed (`AGENTS.md`). Outlines are plain Markdown (`##` sections, bullets as cards, nested bullets as details) shown as Board, Outline and Cards views (`PRD.md` §4). Spike A tested whether this can be edited structurally without regenerating files.

## Decision

1. **Never re-serialize a document.** Parse with micromark / mdast-util-from-markdown (plus GFM) only to get structure and source offsets. Every edit is a splice on the original text. remark-stringify and similar serializers are not used for author files.
2. **Offsets** are UTF-16 code units into the decoded text, with the BOM removed. Bytes exist only at the I/O boundary: strict UTF-8 decoding, the BOM recorded, and re-encoding that reproduces the original bytes. Invalid UTF-8 opens read-only. A splice may never split a surrogate pair or detach a combining mark.
3. **Line endings** are preserved per line, and inserted lines use the file's dominant ending. Whether the file ends with a newline is preserved.
4. **Outline mapping:**
   - The `#` title is optional.
   - A `##` heading is a section, and a paragraph before the first card is that section's intro.
   - Top-level list items are cards, and nested items are details at any depth.
   - Cards before the first `##` form an unnamed section that exists only while it has cards.
   - Task checkboxes, list markers and inline Markdown are kept verbatim.
   - Everything else is preserved in place, or carried inside its card, and flagged.
5. **Edits:**
   - A moved subtree is re-indented by prefix shift only.
   - It adopts the destination list's marker.
   - It copies the spacing at the insertion point.
   - Removing a numbered list's first item hands its number to the next item.
   - Moving an item to its own position writes nothing.
   - Operations that can't be applied safely are refused with a reason code, never applied lossily.
6. **Frontmatter is masked before parsing** and never touched by outline edits.
7. **Package boundary:** `markdown` returns a source-mapped model of its own. `storage` maps it to domain types and keeps it per revision to plan splices. `markdown` does not import `domain`.
8. **Card IDs are not stored in the MVP.** If they're needed later, the Obsidian block ID (`^id`) is the leading candidate.
9. **Link syntax** in outlines and references: relative Markdown links are recommended. **Open:** confirm here or in the project-format ADR.

## Consequences

- **Correctness checks:** commutation (parsing the edited text gives the same structure as applying the operation to the model) and locality become the standard tests for every Markdown edit.
- **Performance:** parsing is superlinear on long nested lists, so it runs per `##` section, never splitting inside fences or HTML comments. Parse once per revision; a 100-card outline takes about 20 ms.
- **Indentation style:** the app must remember a file's nesting unit while the file is open.
- **Board design (Gate 4):** `###` groups inside a column and "kept as written" tiles. The board UI must explain unsupported content instead of hiding it.

## Implementation note (Milestone 4)

- **Built as decided.** Spike A's reader and editor are now production code in `markdown`, with all seven of its fixes and their regression tests. The `storage` package maps the source model to the domain's `Outline` (point 7).
- **Three operations added:** setting the outline's title, moving a whole section, and deleting a section. They follow the same rules: splices only, the unnamed section can't be moved, renamed or deleted, and nothing can be placed above it.
- **Spike A's open limit is closed.** A multi-line HTML block could hide a `##` line from the per-section parser. A file containing one is now parsed whole; a regression test covers it.
- **Undo** restores the file's previous text only if the file is unchanged since the app's own edit (Milestone 4, decision 2).
- **Card IDs are still not stored** (point 8): nothing in Milestone 4 needed them.
- **Link syntax decided (Milestone 5; point 9 is closed).** The app writes relative Markdown links (`[Ilka](../characters/ilka.md)`) and reads Obsidian's `[[name]]` too, resolved only when the name is unique. Recorded in `DOMAIN_AND_FILE_FORMAT.md`.
