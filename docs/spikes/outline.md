# Spike A findings: outline parsing, transformation and round-trip

Date: 2026-10-25 · Branch: `spike/outline-roundtrip` · Code: `spikes/outline/` (throwaway, not for merging) · Plan: `docs/plans/phase-0-architecture-proposal.md` §9 and §13

## Verdict

**The approach works.** The approach: parse with mdast for source offsets, never re-serialize, and apply every edit as a splice on the original text. Every acceptance criterion passes on the 20-file corpus. The run found seven correctness traps and one performance trap; each has a fix and a regression test, and all are listed below. Recommended for production, with the decisions in the draft ADR `docs/adr/0003-markdown-fidelity-and-outline-mapping.md`.

## Results against the acceptance criteria

`pnpm test`: **7 files, 259 tests, all passing** (Linux, Node 22.22). `pnpm typecheck`: clean. `src/` is compiled without DOM or Node types.

| Criterion (§9) | Result |
|---|---|
| No-op: identical bytes | **Pass, 20/20 fixtures.** Covers decode then encode, renaming every card to its own text, and moving every card to its own position. |
| Commutation: parsing the edited text gives the same structure as applying the operation to the parsed model | **Pass.** Checked on every operation in every test: an exhaustive sweep of 995 moves (every card × every destination × 20 fixtures), every rename, delete and add, and 20 seeded random walks of 1,000 moves plus their reversals. |
| Locality: bytes outside the declared regions unchanged | **Pass** for every move, rename, delete and add. Ignored: blank lines, and the renumbering of a list's first item (finding 6). |
| Conservation, per operation | **Pass.** Moves keep every card's text, renames change only that text, adds add one line, deletes remove exactly that subtree. |
| Opaque blocks survive | **Pass.** Content inside a deleted card is removed with it, by definition. |
| Reversibility | **Uniform fixtures: 12/12 byte-identical** after about 400–550 random moves and their reversals. **Other fixtures: 8/8 restore the same structure.** 3 of those also restore identical bytes; 5 differ for the reasons in "Reversibility" below. |
| Unicode | **Pass.** Hebrew, niqqud, emoji, ZWJ sequences and flags; NFD text stays NFD. A guard throws if a splice would split a surrogate pair or detach a combining mark, and no test triggered it. |
| Refusals | **Pass.** Each case below has a reason code. |

### Reversibility: why 5 fixtures don't restore identical bytes

Every intermediate state was checked for commutation and locality. The bytes differ only for these reasons:

| Fixture | Reason |
|---|---|
| `mixed-markers.md` | A moved card takes its destination list's bullet character. Keeping `*` inside a `-` list would start a new list. |
| `ordered-and-task-lists.md` | The same, plus renumbering (finding 6). |
| `loose-lists.md` | Spacing follows the destination list, not the card. |
| `preamble-and-h3.md`, `embedded-blocks.md` | A card can return to a different list within the same section (finding 2). |

## Findings

Each finding has a fix in the spike and a test that fails without it.

1. **Frontmatter invents a section.** Without special handling, CommonMark reads `---\ntitle: x\n---` as a thematic break followed by a setext `##` heading. **Fix:** blank out the frontmatter (same length, newlines kept) before parsing, so offsets stay valid. Invalid YAML gives a warning, and the outline stays usable.
2. **A position can't always say which list a card belongs to.** When `###` headings, a table, or a change of bullet character split a section's cards into several Markdown lists, "index 3 in this section" is ambiguous at the boundary between two lists. **Fix:** moving a card to its own position is a no-op, and at a boundary the card is placed before the next card. **Production:** Gate 4 should treat `###` groups as visible groups inside a column, so a drop names its group.
3. **Spacing is set per item, not per list.** One list can mix tight and loose items. **Fix:** copy the spacing actually present at the insertion point.
4. **Deleting a card deletes everything inside it**, including continuation paragraphs and code blocks. That's correct behaviour; the conservation check was corrected to expect it.
5. **The unnamed section** (cards before the first `##`) exists only while it holds cards. When the last one moves out, it disappears. Naming it, or adding a section above it, is refused, because a heading there would capture those cards.
6. **CommonMark trap: only a list numbered `1.` can interrupt a paragraph.** Removing the first item of a nested `1. 2.` list left `2.` directly under the parent's text, and it silently became part of that paragraph. **Fix:** the next item takes over the removed item's number. That's the only edit outside the moved lines.
7. **The indentation style can disappear.** Once every nested item in a tab-indented file has moved to the top level, nothing is left to detect tabs from. **Fix:** an `EditOptions.nestingUnit` that the app remembers from when it opened the file. The fallback is two spaces.
8. **Performance.**
   - mdast-util-from-markdown is superlinear on long nested lists: 1,380 ms for 2,000 cards in one document.
   - A level-2 heading at column 0 closes every open block, so the parser now handles each section separately and shifts offsets back. It never splits inside fenced code or multi-line HTML comments, and a test proves the result is identical to whole-document parsing on all 20 fixtures.
   - I also fixed a quadratic `slice` in my own marker reading.

| Outline | Parse | Move (parse + splice) |
|---|---|---|
| 100 cards, 300 items | ~20 ms | ~21 ms |
| 2,000 cards, 6,000 items, 130 KiB | ~300 ms | ~400 ms |

Medians of 15 runs, measured alone. **Implication:** parse once per file revision and reuse it during a drag. Don't re-parse on every pointer movement.

## Supported Markdown in outlines

| Construct | Behaviour |
|---|---|
| `#` title (before any section) | Outline title; preserved |
| `##` heading (ATX, closing `##` kept) | Section / board column; rename, add |
| Setext `##` (one line) | Section; multi-line setext headings refuse renaming |
| `-` `*` `+` bullets, `1.` `1)` numbers | Cards and details at any depth; markers kept; a moved card adopts its destination list's marker |
| Task items `- [ ]` / `- [x]` | Cards; the checkbox is kept outside the card text and survives renames |
| Paragraph between `##` and the first card | Section intro; preserved, not a card |
| Cards before the first `##` | The unnamed section |
| Inline formatting and links in card text | Kept verbatim (relative links, `[[wikilinks]]` and `plotdevice:` links all tested) |
| Continuation paragraphs, code, tables, quotes inside a card | Carried with the card; flagged as `item-continuation` |
| `###` and deeper headings | Preserved in place; flagged as `subheading` (see finding 2) |
| Blocks between or after cards (tables, HTML comments, paragraphs) | Stay in place; flagged |
| Lists inside block quotes | Not cards; preserved |
| `- - x` (marker sharing a line) | The inner item can't move (`unmovable-item`) |
| Frontmatter, valid or invalid | Never touched; invalid gives a warning |
| Invalid UTF-8 | Refused at decode (the app would open the file read-only) |

## Offset policy (confirmed)

- **Internally:** UTF-16 code units into the decoded text, with the BOM removed. These are mdast's own units, so no conversion is needed.
- **At the I/O boundary only:** bytes. Decoding is strict UTF-8, the BOM is recorded, and re-encoding reproduces the original bytes.
- **Tests:** a UTF-16 slice of an emoji card is exact, while its byte length differs (34 code units vs. 36 bytes).

## Writer UX for unsupported content (recommendations for Gate 4)

The guiding rule: keep what the board can't show visible and explained, and never hide or delete it.

- **Content inside a card** (code, a table, a quote, extra paragraphs): the card shows a small "kept as written" mark. Moving the card carries the content. Its details open in an editor view that shows the content as written. No raw Markdown appears on the board.
- **Blocks between cards:** a quiet, non-draggable note tile in place, labelled "kept as written". Showing it in place also explains why a drop next to it lands where it does. Hiding these behind a count would make the drop behaviour mysterious.
- **`###` groups:** visible group labels inside a column. Writers use them, and making the groups visible resolves finding 2.
- **Unmovable items:** a locked card with a one-line explanation.
- **Invalid frontmatter:** a banner saying the file's details couldn't be read. The outline stays fully usable.

## Card IDs and link syntax

- **Card IDs are not needed in the MVP.** Links are stored on the card, pointing at chapters, characters and places, so only the targets need stable IDs. Ephemeral per-revision paths are enough for editing.
- **If card IDs are needed later**, all three encodings survived 300 random moves on English, Hebrew, mixed and emoji fixtures, and none changed the outline's structure. The rendering notes below come from documentation and were **not verified with screenshots** in this spike:

  | Encoding | Obsidian | GitHub / VS Code preview |
  |---|---|---|
  | `^k3f9` | Hidden in reading view; linkable as `[[file#^k3f9]]` | Visible as text |
  | `<!-- id: k3f9 -->` | Hidden in reading view | Hidden |
  | `{#k3f9}` | Visible as text | Visible as text |

  **Leaning:** the Obsidian block ID, because it's the only one that means something in another tool.
- **Link syntax** isn't decided by this spike: all three forms survive edits unchanged. **Recommendation:** relative Markdown links (`[The Crossing](../manuscript/the-crossing.md)`). They work in Obsidian, GitHub and VS Code without any app. The decision belongs to ADR 3 or the project-format ADR.

## Architecture answer (§4.1 open question)

**`markdown` should return its own source-mapped model, not domain types.** The parsed model carries source ranges, list markers, indentation and spacing, which are storage details. `storage` maps it to the domain `Outline` (sections and items with text) and keeps the parsed model for the current revision to plan splices. Domain operations refer to items by path or an ephemeral handle. The dashed `markdown → domain` arrow in §4.3 should be removed.

## Limits of this spike

- **Not run on Windows.** The code is pure string handling with no OS calls, and CRLF is covered by a fixture. CI on `windows-latest` comes with the walking skeleton.
- **Multi-line HTML blocks other than comments** (for example a `<div>` containing a `##` line at column 0) could mislead the per-section split. They're rare; production should either detect HTML blocks too, or fall back to whole-document parsing when an HTML block is present.
- **Renaming a card whose text spans several lines** collapses it to one line. That's by design for single-line card titles, but the Gate 4 detail editor needs a multi-line path.
- **Not evaluated:** markdown-it or a hand-written line scanner as faster alternatives. They'd only be worth it if real outlines approach thousands of cards.
- **Library versions:** micromark 4.0.3, mdast-util-from-markdown 2.1.0, micromark-extension-gfm 3.0.0, mdast-util-gfm 3.1.0, yaml 2.9.1, TypeScript 7.0.2, Vitest 5.0.5.
