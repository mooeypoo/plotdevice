# Milestone 5: Characters, places, notes and the reference shelf (Gate 5)

Status: **Complete** (2026-10-25), on branch `milestone-5/references`. Approved by the owner with the recommended page format, link syntax and shelf placement. Results are at the end of this document.

## Goal

Authors keep their story's people, places and notes as plain Markdown pages, link outline cards to them and to chapters, and consult them while writing without leaving the page. This covers PRD scenario D end to end, in the real app, and Gate 5: character, place and note views, explicit references, on-demand search, and a reference shelf whose cards can be pinned and rearranged. Nothing is ever changed in the prose automatically.

**What an author can do at the end:**
1. **Keep characters, places and notes** in the Story workspace (working name). Each is one page: a title, a short description, and details that open when needed (UX_SPEC: not developer-like forms). Pages can be created, renamed and edited with the same editor, autosave and conflict protection as chapters.
2. **Link** an outline card to a chapter, character, place or note from the card's menu ("Link to…"). The link is ordinary Markdown in the card's text, so it works in Obsidian and on GitHub too. Choosing a link opens what it points to: a chapter in Write, anything else as its page.
3. **Consult references while writing** (scenario D):
   - A **reference shelf** beside the page, which can be hidden, with **search** by name.
   - A result opens as a card on the shelf. Cards can be **pinned** and **rearranged** by dragging, with the keyboard, or with a menu.
   - The shelf also shows **"From the outline":** the cards that link to the chapter being written, and what those cards link to.
   - Opening a reference never moves the cursor out of the chapter or loses undo history (PRD G2).
4. **Nothing changes by itself:** references are explicit links written by the author. The app never infers a link from a name, and never rewrites prose (AGENTS.md).

**Out of scope:**
- Renaming a reference page's *file*, with its links updated (as chapters already allow). It comes next, reusing the same recovery journal.
- Full-text search inside pages; search covers names and descriptions.
- Images in pages.
- Relationship graphs (PRD §9: out of scope).

## How a page looks on disk

```markdown
---
title: Ilka Varga
aka: [Ilka, Ili]          ← optional: other names, for search
---
Inherits the orchard; distrusts everyone in Marrow.   ← the description (first paragraph)

## Family                                              ← the details, shown when opened
Daughter of Bea's sister. See [Bea](bea.md).
```

- Files live in `characters/`, `places/` and `notes/` (DOMAIN_AND_FILE_FORMAT.md). The folder says what the page is; a `type` key is optional and informational.
- `title` names the page. Pages written elsewhere without one use their first `#` heading, then the file name, so existing notes such as `notes/loose-ideas.md` work unchanged.
- A link from an outline card is an ordinary relative link:
  ```markdown
  - Ilka crosses the river, see [The Crossing](../manuscript/the-crossing.md) and [Ilka](../characters/ilka.md)
  ```

## What gets built

| Package | New |
|---|---|
| `domain` | `references` context: reference kinds, the page model (title, other names, description, details), finding links in text, search ranking, page file names |
| `markdown` | Reading a page (title, other names, description, details) and the links in a piece of text, ignoring code; writing a new page |
| `application` | Reference ports; queries (list, search, "from the outline" for a chapter); pinned shelf cards per project in app data. Pages are edited through the existing chapter session, so autosave and conflicts apply unchanged |
| `storage` | The reference repository: list, read and create pages; read the links in outline cards |
| `contracts`, `apps/desktop` | Reference calls and views, with zod schemas; the shelf's pins in app data; the watcher refreshes references |
| `presentation` | Shelf and search view models; link targets for the "Link to…" picker |
| `ui-vue` | Characters, places and notes in Story; the page view; "Link to…" on cards; the reference shelf in Write with search, pinning and rearranging; EN/HE text |

## Decisions I recommend (**Decide** where marked)

1. **Page format** (**Decide**): as shown above. `title` and an optional `aka` list in frontmatter; the first paragraph is the description; everything after it is details. No ids yet (ADR 0008 keeps them to chapters). Pages written elsewhere are read leniently and never rewritten to fit. (**Recommended**)
2. **Link syntax** (**Decide**, closes ADR 0003's open point 9): the app **writes** relative Markdown links (`[Ilka](../characters/ilka.md)`), which work in Obsidian, GitHub and VS Code without the app. It **reads** Obsidian's `[[ilka]]` too, but never writes it. (**Recommended**)
3. **The shelf** (**Decide**): on the end side of the page (right in English, left in Hebrew), hidden by default, opened from the toolbar or with Ctrl+Shift+R. Pinned cards and their order are personal, kept per project in app data, never in the project folder. (**Recommended**)
4. **Editing pages:** in the Story workspace, with the chapter editor and everything that protects chapters (autosave, conflicts, direction markers). The shelf is for reading; "Edit" on a shelf card opens the page in Story.
5. **"Link to…"** adds the link at the end of the card's text, using the target's title as the link text. The author can edit it like any other text.
6. **Search** matches titles, other names and descriptions, in any language and ignoring Hebrew niqqud and accents. Results are ranked: names first, then descriptions.

No new dependencies.

## Tests

These follow `AGENTS.md`. Reading pages and links, and search, are written test-first.

- **Markdown:**
  - Pages read leniently: frontmatter title, a `#` heading, or neither; `aka` as a list or a single name; invalid frontmatter.
  - Links found in inline, reference-style and wiki form, but never inside code. Relative paths resolved from the file's folder. English, Hebrew and mixed text.
  - A new page's exact bytes.
- **Domain:** search ranking and normalisation (niqqud, accents, case); a page's file name from its title; link targets resolved and outside paths refused.
- **Application:** pins kept per project and survive a restart; "from the outline" finds cards linking to a chapter, including after the outline changes.
- **Storage** (real temporary folders): list, read and create pages in each folder. A page created in Hebrew. Editing a page keeps unknown frontmatter keys and bytes outside the edit.
- **Desktop, end to end** (Playwright, the real app):
  - **Scenario D:**
    1. Create a character.
    2. Link a card to it and to a chapter.
    3. Open that chapter in Write.
    4. The shelf shows the card and the character.
    5. Open the character on the shelf: the cursor and undo history in the chapter are unchanged, and no file except the outline changed.
  - **Pinning:** pin and rearrange shelf cards by keyboard; restart, and they are still there.
  - **Search** in Hebrew and English.
  - **A page edited in another app** while open shows the conflict choices, as chapters do.
  - **Accessibility:** every action reachable by keyboard; every control named in both languages; no CSP violations.

## Work order (one commit or small PR each; results reported at the end)

1. Reading pages and links in `markdown`; the `references` domain context, test-first.
2. The reference repository, queries and pins; contracts and IPC.
3. Characters, places and notes in Story; the page view and editing.
4. "Link to…" on cards; the reference shelf with search, pinning and rearranging.
5. End-to-end scenario D, the accessibility pass, docs (ADR 0003 link-syntax note, DOMAIN_AND_FILE_FORMAT, package READMEs) and results.

## Results

| Check | Result |
|---|---|
| `pnpm lint` | OK |
| `pnpm typecheck` | OK |
| `pnpm test` | **745 tests pass** (704 before this milestone) |
| `pnpm arch` | **86 checks pass**, including the working-name check on the new interface files |
| `pnpm build` | OK |
| `pnpm e2e` | **35 end-to-end tests pass** in the real app (30 before), with no CSP violations |

**What the tests prove:**
- **Pages are read leniently:**
  - The title comes from frontmatter, a `#` heading or the file name.
  - Other names can be a list or a single name.
  - Invalid frontmatter is reported and the page still read.
  - The sample novel's existing notes work unchanged.
- **Links are found in every form,** never in code, images or web links. Outside paths are refused, and `[[name]]` resolves only when unambiguous.
- **Search** ranks names before descriptions and ignores case, accents and niqqud, in English and Hebrew.
- **Renaming an open page while typing raises no conflict.** The title is written between saves; a mutation check confirms the test catches its removal.
- **Scenario D in the real app:**
  1. A character is created and a card linked to it, which writes an ordinary relative link.
  2. The card's chapter link opens the chapter in Write.
  3. The shelf shows the card and opens the character.
  4. The cursor and undo history in the chapter are intact, and consulting references changed no file.
- **Also covered:**
  - Pinned pages and their keyboard-set order survive a restart.
  - A page changed in another app gets the same conflict choices as a chapter.
  - Every shelf and page control is named in both languages.

**Where the work differs from the plan:**
- **Search lives in `presentation`, not `domain`.** It ranks a list the page already holds, on every keystroke, without a round trip to the host.
- **A page's text is edited as a whole** in the chapter editor; the description is simply its first paragraph.
- **Bugs found and fixed while building:**
  - A "keep both" copy of a page got a chapter id, though only chapters have ids (ADR 0008). Regression test added.
  - The watcher could report a page change before the window existed, while the last project reopened.
  - A crash test was flaky under load: it assumed its child process starts writing within 150 ms. It now waits until the writer reports it is writing.

**Not done, needs the owner:**
- **Trying the shelf and "Link to…" with authors.**
- **A screen-reader pass with Orca,** as in earlier milestones.

**Later (noted, not in this milestone):**
- Renaming a page's file, updating every link to it (the chapter rename and its recovery journal, generalised).
- Full-text search inside pages.
- **Keystrokes after the conflict dialog opens are not typed anywhere**, because the dialog blocks the page. Nothing saved is lost, but a word typed in that moment is. A gentler prompt could let typing continue.
