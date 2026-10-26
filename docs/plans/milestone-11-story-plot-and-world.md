# Milestone 11: Story, in two halves (Plot and World)

Status: **Approved** (2026-10-26), with ADR 0009 (relationships), on branch `milestone-11/story-plot-and-world`. Clickable mock-ups come before the interface work (step 2).

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

- **A "Relationships" list** under the description. "+ Add relationship" picks a page and asks for the words, such as "Sister of". The app writes one bullet into the page's file (decision 3, ADR 0009).
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

Before step 2: clickable mock-ups of the sidebar, the List, the gallery and a character page, for the owner to check.
