# Milestone 4: Story outlines (Gate 4)

Status: **Proposed, awaiting owner approval.** No code yet.

## Goal

The Story workspace: authors plan in ordinary Markdown outlines and see each outline as a Board, an Outline or Cards. It builds on ADR 0003 and Spike A, which proved the editing approach on 20 fixtures. It covers PRD scenarios B and C end to end, in the real app.

**What an author can do at the end:**
1. **Switch** between **Story** and **Write** at any time, in any order. Each remembers where the author was: the outline and view, or the chapter and cursor.
2. **Keep several outlines**, such as the main story, a character arc and loose ideas. Each is a file in `outlines/`. Authors can create, rename and open them, and an empty outline invites a first section or card instead of a template.
3. **See one outline three ways,** all showing the same file:
   - **Board:** a column for each section, with cards and their details.
   - **Outline:** an indented list that can collapse at any depth.
   - **Cards:** index cards in reading order, labelled with their section.
4. **Edit visually:**
   - **Add and rename** sections, cards and details in place.
   - **Move cards** with everything nested in them, by dragging, with Alt+Arrow keys, or with a "Move to…" menu (UX_SPEC: keyboard and menu alternatives are mandatory).
   - **Delete** with confirmation.
   - **Undo** structural edits.
5. **Never lose what the board can't show:**
   - Content the board can't display (code, tables, quotes, extra paragraphs inside a card) is carried with the card and marked "kept as written".
   - Blocks between cards stay in place as quiet "kept as written" tiles.
   - `###` headings appear as group labels inside a column.
   - An item that can't be moved safely shows a lock and one sentence explaining why.
6. **The manuscript outline:** a read-only view of the book's parts and chapters in reading order, from `CONTENTS.md`. Choosing a chapter opens it in Write. It is not a second copy of the book (PRD §4).
7. **Changes made elsewhere** reload the outline. An edit planned on an outdated version is refused and redone on the new one, never written over the change (ADR 0005).

**Out of scope:**
- Links from cards to chapters, characters and places, and consulting them while writing (scenario D, Gate 5).
- Characters, places and the reference shelf (Gate 5).
- Card colours and plotlines.
- Editing multi-line content inside a card. It stays "kept as written" (see decision 3).

## How an outline maps to the screen (ADR 0003, unchanged)

```markdown
# Main story                          ← the outline's title (optional)

## Beginning                          ← a section: a Board column
The opening, before anyone speaks.    ← the section's intro, shown under its name

- Ilka crosses the river              ← a card
  - Bea at the landing                ← a detail (any depth)
- The gate

## Ending
- Back to the crossing
```

Moving "The gate" to *Ending* changes exactly two lines of this file and nothing else, and never touches a chapter (scenario C).

## What gets built

| Package | New |
|---|---|
| `markdown` | The outline reader (source-mapped, parsed one section at a time) and editor (splices only), rebuilt from Spike A with its seven fixes: frontmatter masking, list boundaries, spacing per item, the unnamed section, renumbering, nesting unit, per-section parsing |
| `domain` | `Outline`, `OutlineSection`, `OutlineItem`; outline operations and their rules (what can move where, what is refused and why); the outline file name from its title |
| `application` | Outline ports and an outline session: open an outline, apply an operation with a revision check, undo, reload after outside changes. The Story/Write position kept in app data |
| `storage` | The outline repository: list `outlines/`, create, read, and apply operations as splices; maps the markdown model to domain types (ADR 0003, point 7) |
| `contracts` | Outline calls and views, with zod schemas |
| `presentation` | Board, Outline and Cards view models; move targets for the menu and the keyboard |
| `ui-vue` | Story/Write switch, outline list, the three views, inline editing, drag and drop, kept-as-written tiles, the manuscript outline, EN/HE text |
| `apps/desktop` | IPC handlers; outlines refresh from the file watcher |

## Decisions I recommend (**Decide** where marked)

1. **Workspace names** (**Decide**): **Story** and **Write** (Hebrew: **סיפור** and **כתיבה**), shown as a two-button switch in the header. PRD §11 leaves "Story" as a working name; this keeps it until authors test it. (**Recommended**)
2. **Undo** (**Decide**): each structural edit can be undone during the session. Undo restores the file's previous text **only if the file hasn't changed since the app's own edit**. If it has (another app edited it), undo is refused with an explanation instead of overwriting. Nothing is stored in the project folder. (**Recommended**)
3. **What can be edited in a card** (**Decide**, PRD §11's open question): in this milestone, a card or detail is **one line of text**, edited in place. Inline formatting and links in that line are kept exactly and shown formatted. Anything longer inside a card (extra paragraphs, code, a table) is carried along and marked "kept as written"; it is edited in a text editor for now. For example:
   ```markdown
   - The letter arrives *at night*        ← editable in place; the italics are kept
     - No return address                  ← editable in place (a detail)

     A second paragraph inside the card.  ← kept as written: moves with the card,
                                            shown read-only with an explanation
   ```
   A rich multi-line card editor can come later without changing the file format. (**Recommended**)
4. **New outline files:** named from the title like chapters (`outlines/character-arcs.md`), starting as just `# Character arcs`. No hidden files, no IDs (ADR 0003, point 8).
5. **Drag and drop:** the browser's built-in drag and drop, no library. Every drag has a keyboard and a "Move to…" menu equivalent. In Hebrew, columns run right to left, and "previous" and "next" follow the interface direction (UX_SPEC).
6. **Remembered position:** the workspace (Story or Write), the last outline and its view, kept per project in app data next to the chapter position.
7. **Performance:** an outline is parsed once per file revision, never during a drag (Spike A: about 20 ms for 100 cards, 400 ms for 2,000).

## Dependencies (**Decide**; both MIT, compatible with GPL-3.0)

| Package | Why |
|---|---|
| `micromark-extension-gfm`, `mdast-util-gfm` | Recognise task lists (`- [ ] write the letter`) and tables as Spike A did. Without them, checkboxes become part of a card's text and tables aren't recognised as "kept as written" blocks |

No other new dependencies. Drag and drop uses the browser's built-in support.

## Tests

These follow `AGENTS.md`. The markdown editor and the domain rules are written test-first: they are the milestone's highest risk.

- **Markdown** (all 20 outline fixtures, byte-exact):
  - **No-op:** reading and writing back gives identical bytes.
  - **Every move:** each card to each destination. Re-reading the result gives the structure the operation predicts (commutation), and nothing outside the affected lines changes (locality).
  - **Random walks:** seeded random sequences of moves and their reversals.
  - **Adding, renaming and deleting** sections, cards and details, including in Hebrew, CRLF, BOM, tab-indented and no-final-newline files.
  - **Refusals:** each refusal has its reason code, with a test that it writes nothing.
  - **Each of Spike A's seven traps** has a regression test.
- **Domain:** allowed and refused operations; the outline file name from its title; the unnamed section's rules.
- **Application:** stale operations are refused, then redone after a reload. Undo restores only an unchanged file, otherwise it is refused. Operations on one outline are serialized.
- **Storage** (real temporary folders): create, list, edit and reopen outlines; an outside edit between reading and writing is never overwritten; chapters are never touched by outline edits.
- **Presentation:** Board, Outline and Cards models from the same outline; move targets, including `###` groups and locked items, in left-to-right and right-to-left layouts.
- **Desktop, end to end** (Playwright, the real app):
  - **Scenario B:** create `outlines/main-story.md`, add sections and nested cards visually, switch among Board, Outline and Cards, and check that the file contains everything added.
  - **Scenario C:** move a card to another column by dragging, and again with the keyboard. Only the expected lines of the outline change, and every chapter file is byte-identical.
  - **Kept as written:** an outline with a code block and a table inside cards survives moves, with its marks shown.
  - **Outside edits:** an edit in another app reloads the outline; undo after that edit is refused.
  - **Story and Write:** switching keeps the editor's cursor and undo history (scenario H's rule, for the new switch). The app reopens in the last workspace and view.
  - **Hebrew:** a Hebrew outline in a Hebrew interface, with columns right to left and the keyboard moves following them.
  - **Accessibility:** every action reachable by keyboard; every control named in both languages; no CSP violations.

## Work order (one commit or small PR each; results reported at the end)

1. The markdown outline reader and editor with the fixture tests, test-first, plus the GFM dependencies.
2. Domain outline model and rules; the storage repository; the application outline session and undo, all test-first.
3. Contracts, IPC and the watcher; the Story/Write switch and remembered position.
4. The interface: outline list, Board, Outline and Cards, inline editing, drag and drop, menus and keyboard moves, kept-as-written tiles, the manuscript outline.
5. End-to-end scenarios, the accessibility pass, docs (ADR 0003 implementation note, package READMEs) and results.
