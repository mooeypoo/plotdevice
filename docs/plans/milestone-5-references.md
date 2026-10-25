# Milestone 5: Characters, places, notes and the reference shelf (Gate 5)

Status: **Approved** (owner, 2026-10-25), with the recommended page format, link syntax and shelf placement.

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
