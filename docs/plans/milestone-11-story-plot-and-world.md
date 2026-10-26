# Milestone 11: Story, in two halves (Plot and World)

Status: **Built** (2026-10-26) on branch `milestone-11/story-plot-and-world` (PR #28), waiting for the owner's review. Results are at the end of this document.

## Goal

Story is hard to read in three ways:

- **The view switch looks global.** Board / List / Cards sits at the far end of the Story header, as if it changed all of Story, but it only works for outlines.
- **List hides adding.** It has no visible way to add a card, a section or a detail; adding is only in each row's `⋯` menu.
- **The world has no overview.** Characters, places and notes open only as one text page each, with no picture of the whole cast or how they connect.

This milestone splits Story into two clearly named halves: **Plot** (building the story's events) and **World** (building the people, places and notes). Each half gets a simple visual way in.

**Basis:** a survey of about fifteen writing apps (Scrivener, Plottr, Dabble, Novelcrafter, Campfire, World Anvil, Obsidian, Aeon Timeline, Arc Studio, Bibisco and others). It found:

- **Separate areas with plain names.** Every app keeps plot and world apart. Plain names (Dabble's "Plots / Characters / Notebook") read best, and jargon ("Codex") reads worst.
- **Visible "+".** The best-liked apps put a dashed "+" at the end of every list.
- **Card galleries** for characters are common and well liked.
- **Most criticised:**
  - hand-drawn relationship webs, which get tangled (Campfire, Obsidian's "hairball", Scapple);
  - long profile forms with empty prompts (Campfire, World Anvil).
- **Light ways to connect a character to the plot are well liked:**
  - an "appears in" list;
  - picking out one character's cards on the board;
  - a separate arc outline for a character.

**Out of scope:**

- **Character portraits** (decision 4).
- **Drawn relationship maps or family trees.** If wanted later, a read-only map would be drawn from existing links, never drawn by hand.
- **Places on a map.**
- **Timelines.**
- **Guessing links from names in prose.**

## What the author will see

### The sidebar

```
 PLOT                         │  Ilka's arc            Board | List   ⋯
   Main story                 │  ─────────────────────────────────────
 ▸ Ilka's arc                 │  ┌ Before ───┐ ┌ The orchard ┐ ┌ + Add section
   Loose ideas                │  │ card      │ │ card        │
   + New outline              │  │ card      │ │ + Add card  │
   The book's chapters        │  │ + Add card│ └─────────────┘
                              │  └───────────┘
 WORLD
   Characters            3    │
   Places                2    │
   Notes                 5    │
```

- **Two labelled groups:**
  - **Plot**, holding the outlines, "+ New outline" and "The book's chapters" (the reading order).
  - **World**, holding Characters, Places and Notes, each with how many pages it has.
- **Hebrew:** **עלילה** and **עולם**.
- **World pages aren't listed one by one** in the sidebar any more; the gallery shows them (below). A long cast no longer pushes everything else off screen.

### Outlines: Board and List

- **Two views: Board and List.** Cards is removed (decision 1). It showed the board's cards without the columns, so it added nothing. Anyone who had Cards selected opens on Board.
- **The switch belongs to the outline.** It sits right after the outline's title, followed by `⋯`, so it reads as "how to show *this outline*".

### List: adding is visible

```
 Before the storm
   ▾ Ilka finds the letter                    +  ⋯
       She hides it in the hymn book
       + Add detail                       ← shown on hover or focus
   ▸ The auction
   + Add card
 The orchard
   + Add card
 + Add section
```

- **A dashed "+ Add card"** at the end of every section, and **"+ Add section"** at the end, matching the Board.
- **A "+" on a row adds a detail** under that card. It shows on hover and on keyboard focus.
- **Typing flows like a list in a word processor:**
  - **Enter** saves the card and starts a new one right below.
  - **Tab** turns the new line into a detail of the card above.
  - **Shift+Tab** moves it back out a level.
  - **Escape** on an empty new line drops it.
  - In Hebrew the same keys work; only the indentation mirrors.
- **Enter on a selected (not editing) row still opens it for editing**, as today.
- **An empty outline** shows "+ Add the first card".

### World: a gallery for each kind

```
 Characters                                          + New character
 ┌──────────────────┐ ┌──────────────────┐ ┌─ ─ ─ ─ ─ ─ ─ ─ ─┐
 │ Ilka Varga       │ │ Bea Varga        │   + New character
 │ Ilka, Ili        │ │                  │ └─ ─ ─ ─ ─ ─ ─ ─ ─┘
 │ Inherits the     │ │ Keeps the salt   │
 │ orchard; dis…    │ │ ledgers…         │
 │ Sister of Bea    │ │                  │
 └──────────────────┘ └──────────────────┘
```

- **Clicking Characters, Places or Notes** opens a grid of cards.
- **Each card shows** the title, other names (`aka`), the first paragraph (the description, already part of the file format) and the first few relationships (below).
- **A dashed card at the end** adds a new page.
- **Clicking a card** opens the page, as today.
- **A "Characters" link above the page** goes back to the gallery.
- **No new fields and no forms.**

### A character's (or place's, or note's) page

- **A "Connections" panel** beside the page's text (decision 7) holds two boxes: "Relationships" and "Linked from".
- **Relationships:** "+ Add relationship" picks a page and asks for the words, such as "Sister of". The app writes one bullet into the page's file (decision 3, ADR 0009).
  - In the page's text, the `## Relationships` section is folded into one quiet line ("Relationships: shown beside the page"), so the same thing isn't shown twice. Clicking the line unfolds it for editing by hand.
- **A "Linked from" list** shows everything that links to this page:
  - outline cards (with outline and section);
  - other pages (with their relationship words, if any);
  - chapters.
  - Each entry opens what it names. Nothing is guessed from names (DOMAIN_AND_FILE_FORMAT, "Links").
- **"Show on the board."** Next to an outline in "Linked from", this opens that outline with this page's cards picked out and the rest faded. The board then shows "Showing cards about Ilka ✕"; ✕ or Escape clears it.
- **"Start an arc outline"** creates a new outline named, for example, "Ilka's arc", whose first line links back to the character. It is an ordinary outline under Plot, and it appears in the character's "Linked from".

## Decisions (owner, 2026-10-26)

1. **Cards view is removed**; Board and List remain.
2. **The groups are "Plot" and "World"** (עלילה / עולם).
3. **Connections:** "Linked from", "Show on the board" and "Start an arc outline", **and** the `## Relationships` convention, adopted now (ADR 0009).
4. **Portraits come later.**
5. **The plan and ADR 0009 are approved**, with clickable mock-ups first.
6. **The gallery is alphabetical.** Dragging pages into an order would need somewhere new to store it.
7. **The mock-ups are approved** ([canvas](https://claude.ai/artifact/T6EkrMrUaDoTwrzhobdcW1), private). Relationships and "Linked from" sit in a panel beside the page's text, not under the description.

## Later: how important a character is, part by part (to discuss)

The owner raised this on 2026-10-26 as an idea to discuss and refine, not yet a decision. A novel may have 20 characters: 3 main ones throughout, and different secondary and minor ones in each part. While writing a part, the references would offer that part's main and secondary characters first, while search and pinning still reach everyone.

Questions to settle before deciding:

- **Where it's written.** In each character's page, for example `importance: main`, or per part as `part 2: secondary`? Or in the outline or part itself, as a cast list? Either way the file must stay readable without the app.
- **Typed by hand, or worked out?** The links already say which characters a part's chapters and cards mention. A suggestion built from those may be enough without a new field to keep up to date.
- **How it stays simple.** One optional word per character (main, secondary, minor) costs little. A word per part costs more to maintain.

## ADR 0009: relationships between pages (accepted; see `docs/adr/0009-relationships.md`)

**The question:** how does a character page say "Ilka is Bea's sister" in a way that reads fine without the app?

**Proposal:** an ordinary Markdown heading with a bulleted list. Each bullet has words and one or more links:

```markdown
---
title: Ilka Varga
aka: [Ilka, Ili]
---
Inherits the orchard; distrusts everyone in Marrow.

## Relationships
- Sister of [Bea](bea.md)
- Owes money to [the Salt Exchange](../places/salt-exchange.md)

## Family
Daughter of Bea's sister.
```

**Rules:**

- **The heading is recognised by name.** The names are "Relationships" and its Hebrew name ("קשרים"), case-insensitive. A small list in the domain, extended when a UI language is added.
  - When the app creates the heading, it uses the project's language.
  - It is added after the description, or at the end if the page has no description.
- **Each top-level bullet with at least one link is one relationship.** The words around the link are the relationship words ("Sister of"); the link says to whom.
  - Bullets without a link are shown as written and are not counted.
  - Nested bullets stay as details.
- **One direction only.** The app never writes the reverse ("Bea: sister of Ilka") on the other page. Bea's page shows it under "Linked from", with the words "Sister of".
- **The app writes only when the author adds, edits or removes a relationship**, and only as a targeted patch of that bullet (and the heading, the first time). It never reorders or rewrites the rest of the page, and pages without the heading are never changed.
- **Unchanged links:** ordinary relative links, as everywhere else; Obsidian's `[[bea]]` is read and never written.

**Alternatives rejected:**

- **Frontmatter** (`relationships: [{to: bea, as: sister}]`): hidden in other editors, and harder to write by hand.
- **A separate relationships file:** a second place to keep in step, and unreadable without the app.
- **Inferring relationships from any link in the page:** links in prose don't say what the relationship is. They still appear under "Linked from".

**Engineering notes:** the parser goes in `domain/references` beside the description and details split. Patches reuse the targeted-edit approach in ADR 0003.

## Files

- **Domain:** `packages/domain/src/references/` (find the relationships section and its bullets; patch one bullet), with tests.
- **Application:**
  - `packages/application/src/references/` (add, edit and remove a relationship; pages linking to a page);
  - `packages/application/src/outlines/` (an outline's cards linking to a page, generalising today's `cardsAbout(chapter)`).
- **Contracts:** `references.ts` (`relationships` on the page view; a `linkedFrom` query; a relationship-edit request), `api.ts`, the IPC channels and schemas.
- **Presentation:**
  - `references.ts` (gallery card text, "Linked from" groups);
  - `outline-views.ts` (which cards to pick out, rows for "+ Add detail");
  - `navigator.ts` (the Plot and World groups).
- **UI:**
  - `StoryView.vue` (the sidebar groups; the switch moved);
  - `OutlineList.vue` (the add rows and typing flow);
  - `use-outline-actions.ts`;
  - `OutlineBoard.vue` (picking out cards);
  - `ReferencePage.vue` (relationships, "Linked from", arc outline);
  - new `WorldGallery.vue`.
  - `OutlineCards.vue` is removed, and the `cards` value of the outline-view preference becomes `board` when read.
- **Words:** `packages/i18n/src/messages/en.json`, `he.json`.
- **Demo:** the Salt Orchard samples (English and Hebrew) gain a few relationships and one arc outline.
- **Docs:**
  - `UX_SPEC.md` (Story layout);
  - `DOMAIN_AND_FILE_FORMAT.md` (Relationships);
  - `PRD.md` (the "Board/Outline/Card projections" line);
  - `docs/adr/0009-relationships.md`;
  - the user guide (English and Hebrew) on the docs site.

## Tests

- **Domain (test-first):** relationship parsing.
  - Finds the heading in English and Hebrew.
  - Keeps the words around the link, in any position ("[Bea](bea.md)'s rival").
  - Handles a bullet with two links, bullets without links, nested details and `[[wiki]]` links.
  - Mixed Hebrew and English text, and emoji.
- **Domain:** patches.
  - Adding, editing and removing a relationship changes only that bullet.
  - The first one adds the heading after the description.
  - A load and save with no change is byte-identical.
  - Unknown frontmatter and line endings are kept.
- **Application:** "Linked from" covers:
  - outline cards (with outline and section);
  - pages (with relationship words);
  - chapters;
  - after a page's file is renamed.
  - It never matches by name alone.
- **Presentation:** the Plot and World groups; gallery card text (long descriptions shortened); an old `cards` preference reads as `board`.
- **End to end:**
  - **List:**
    - Type a card, press Enter, type another, press Tab, and the second becomes a detail.
    - "+ Add card" and "+ Add section" work.
    - "+ Add detail" appears on keyboard focus.
  - **World:**
    - Open Characters and see the gallery.
    - Add a character from the dashed card.
    - Add a relationship and see it on the other page under "Linked from".
  - **Plot and world together:**
    - "Show on the board" picks out the right cards, and Escape clears it.
    - "Start an arc outline" creates an outline that links back.
  - **Hebrew:** the sidebar groups and the gallery mirror, and Tab and Shift+Tab work.
- **Screens:** Story (outline, gallery, character page) in both themes and both languages, checked by eye.

## Work order

1. ADR 0009 (written) and the file-format docs.
2. Sidebar groups and moving the switch; removing Cards.
3. List: the add rows and typing flow.
4. World gallery.
5. Relationships (domain, then application, then UI).
6. "Linked from", "Show on the board", "Start an arc outline".
7. Demo novels, guide, screenshots.

The clickable mock-ups came before step 2 and are approved (decision 7).

## Results

### What the author can do

- **Story has two groups.** **Plot** holds the outlines and the book's chapters; **World** holds Characters, Places and Notes, each with a count. **Board | List** sits right after the outline's title. Cards is gone, and a project left in Cards reopens on the Board.
- **List.**
  - A dashed **+ Add card** under each section, **+ Add section** at the end, and a **+** on each row (on hover or focus) for a detail.
  - While typing a new line: **Enter** adds it and starts the next, **Tab** makes it a detail of the line above, **Shift+Tab** brings it back out, **Esc** stops. A hint under the line says so.
- **World galleries.** Each kind opens as cards, A to Z in the interface language: name, other names, description, first three relationships. A dashed card adds a page. **‹ Characters** goes back from a page.
- **A page's Connections panel.**
  - **Relationships:** add one (pick a page, then say how), reword it, or remove it, one bullet at a time (ADR 0009). In the page's text, the section folds into one line.
  - **Linked from:** cards (by outline and section), pages (with their relationship words) and chapters; each opens what it names.
  - **Show on the board:** opens that outline with the page's cards outlined in gold and the rest faded. **✕** or **Esc** shows every card again.
  - **Start an arc outline:** makes an outline that starts with a link back to the page.
  - The page's rename, file name and versions moved into its **⋯**.
- **Demo novels:** every character has relationships, and each book has an arc outline for Ilka.

### Also fixed

- Card text showed a link whose path has spaces (`[שער המטע](<../manuscript/שער המטע.md>)`) as raw Markdown. It existed before this milestone and showed on the Hebrew demo's board.

### Tests

| Command | Result |
|---|---|
| `pnpm lint` | OK |
| `pnpm typecheck` | OK |
| `pnpm test` | 857 passed |
| `pnpm arch` | 105 passed |
| `pnpm build` | OK |
| `pnpm e2e` (Playwright) | 61 passed |
| `pnpm site:screenshots`, `site:build`, `site:test` | OK; 4 new screens per language and theme |
| `pnpm perf` | **1 failed:** moving a card on a 2,000-card outline took 520–560 ms against a 500 ms limit. `main` fails the same way on this machine (540–560 ms in three runs), and this milestone doesn't touch that code. Left as is, to look at separately. |

New tests:

- **Unit:**
  - relationships, reading and writing: English and Hebrew headings, any level and case, words around a link, wikilinks, nested details, code, CRLF, the first one after the description, removing the last one;
  - where a new list line goes, and Tab and Shift+Tab;
  - gallery order;
  - links shown as their text, and which relationships can be reworded;
  - "Linked from";
  - the folded section;
  - an arc outline's first line;
  - a remembered Cards view reopening as Board;
  - the demo novels.
- **Integration (IPC, real files):**
  - adding a relationship to a page open in the editor reloads it there, and typing carries on without a conflict;
  - "Linked from" finds cards, pages and chapters, never by name.
- **End to end:**
  - typing in the List with Enter, Tab and Shift+Tab;
  - **+** on a row, and **+ Add section**;
  - the Plot and World groups and the gallery;
  - relationships from start to finish (add, see on the other page and the card, fold and unfold, Show on the board and Esc, arc outline, remove).

### Architecture

- Relationships are parsed and patched in `markdown` (beside the page parser), not in the domain as the ADR first said; the ADR's engineering notes are corrected.
- The heading names are in `shared`, because the page editor needs them and the renderer may not import the domain.
- Two calls were added to the app's connection to the host (`editRelationship`, `linkedFrom`); the test that lists every allowed call lists them.

### Known limitations

- "Linked from" reloads when pages or outlines change; a link typed into a chapter in Write shows the next time the page is opened.
- "Show on the board" recognises a card by its section and text, so two identical cards in one section both stand out.
- A relationship can point at a chapter too, because the picker offers chapters; it works, and is shown like any other.
- The folded line's label is in the interface language the page was opened in.
- Importance by part is still to be discussed (see "Later" above).

## Owner feedback, round 1 (2026-10-26)

| Feedback | Change |
|---|---|
| In the List, the button says "Add card", but a list has items | The List says **+ Add item**, and its new lines are "Item"; the Board keeps "Add card". |
| Editing a card shows raw Markdown links (`[Bea](../characters/bea.md)`). Adding "must meet [a character]" means typing the words, closing, then **⋯ → Link to…**. Authors can't be expected to write link paths. | Card and item text is edited in a small CodeMirror field:<br>• **Links show as names**, one chip each; the cursor steps over a chip and **Backspace** removes it whole.<br>• **Typing @** (or `[[`, as in Obsidian) and the start of a name offers matching characters, places, notes and chapters; **↑/↓** and **Enter** or a click choose one, and the app writes the ordinary relative link.<br>• **A link button** at the field's end opens the full picker.<br>• A hint under the field says "Type @ to link…".<br>• An `@` inside a word (an email address) is left alone.<br>• No new dependency: the list is the app's own, so it matches the picker's search and look. |

Engineering notes:

- **Where the code is:** `editor-codemirror/src/item-editor.ts` (the field) and `item-text.ts` (finding links and the name being typed: pure, unit-tested).
- **Security policy:** the field runs in a shadow root, as the chapter editor does, so CodeMirror's styles need no exception to the Content Security Policy. Without it, the policy also blocked the style that keeps spaces, and a space after a link was lost.
- **A late Escape:** after **Enter**, the next line opens once the kept one is saved. An **Esc** pressed in between now stops that next line from opening.
- **Section names** stay a plain field; they rarely hold links.
