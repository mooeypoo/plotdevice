# Roadmap: an approachable studio (Milestones 16–22)

Status: **Direction accepted** (owner, 2026-11-04): decisions D1–D9 as recommended, with the adjustments below. Recorded in `PRD.md` 0.4, `UX_SPEC.md` 0.4, `DOMAIN_AND_FILE_FORMAT.md` 0.5 and ADRs 0010–0012. Milestone numbers are provisional.

Owner adjustments (2026-11-04):
- **D1:** the audience is non-technical, even technophobe, writers. Hebrew leads, but English must work and be tested just as well.
- **D9:** reading `.docx` for chapters only. Export to Word is later, designed together first.
- **Later ideas** (story vs. book order, several outlines on one timeline, real dates, a relationship map) are documented features, brainstormed with the owner before any plan.
- **Kinds** need no schema version change and no migration (ADR 0011).

## Change of order (owner, 2026-11-05)

After Milestone 19 the roadmap changes order:

1. **Next: Milestone 20, "Ready for writers"** (`milestone-20-ready-for-writers.md`), a tightening milestone for non-technical writers. Automatic backups (moved here from Milestone 22, decided below), a sample book to try, help inside the app, plain wording everywhere, installing and updating, and a short session with real writers.
2. **Then two big features, each researched and designed with the owner before any plan:**
   - **Import and export:** Word first, and which other formats (PDF, ePub, others) are worth it. Brief: `docs/features/import-export.md`;
   - **The timeline and lanes** (the roadmap's Milestones 20–21 below). The draft plan (`timeline-view.md`) waits for that research. Brief: `docs/features/timeline.md`.

Milestone numbers below are kept as written; the new milestones are numbered when planned.

### Automatic backups: the owner's decisions (2026-11-05)

- **The author's choice, never forced.** The app offers it once, calmly, after the author has been writing for a while ("Keep a copy of your book somewhere safe?"). It can be turned on, off or moved later in Settings.
- **Local backups, called just that.** Plot Device copies the book into a folder on the computer that the author chooses. It never uploads anything itself, so the app never calls this a cloud backup.
- **Off the computer, through the author's own sync:** the app recommends choosing a folder that already syncs online, such as Google Drive, Dropbox, OneDrive or Obsidian Sync, and explains why. A local folder or a USB drive is fine too. Uploading to cloud services directly is a later discussion.
- **Once a day,** when something changed since the last backup. Other schedules may come later.
- **Nothing is deleted unless the author asks.** When backups are turned on, the app says plainly that it will add copies to that folder and never delete them, so the author should keep an eye on the space there.
- **Clean-up is opt-in.** Settings offers rules the author can turn on explicitly, such as "remove backups older than N months" or "keep only the newest N". Then the app removes only automatic backups it made itself, never the newest one, and says when it has removed any.
- **Each book has its own backup folder** (the last one chosen is offered first), holding the book's backups as zip files.
- **Clear names, with the date and time:** "‹Book› backup 2026-11-05 14.30". Windows can't use `:` in names.
- **Only when something changed:** no copy is made of a book that hasn't changed since the last one.
- **Restore** lists the backups by date, shows what would change, and saves the current state first, so a restore can be undone.
- **Restore points stay as they are** (Milestone 6: the Versions of each file, in the app's own data). They're for undoing the app's own operations, not the author's backup, so limits that tidy them are reasonable. Later, a separate feature: keep a number of restore points rather than an age, so slow and fast writers both get a useful history, and let the author adjust that number ("how many steps back you can go").
- **Never silent:** the book menu says when the last backup ran, and the app says so if the folder is missing (a USB drive unplugged, Dropbox removed).

### Installers and accounts (owner, 2026-11-05)

- **Later, revisited together:** anything that needs paid accounts or certificates. That means signing the Windows installer, Apple's developer programme for signed and notarised Mac builds, and with them updates that install themselves.
- **Now:** Mac builds run in CI, unsigned, with the tests, so the app is known to work on a Mac before it's offered there.

## Why

Plot Device will be sold, first to Hebrew writers and then to non-technical English writers: people who work in Word today, who are wary of cloud tools and subscriptions, and who will never type `## ` on purpose. Technical authors are still served, the way WordPress serves developers: the everyday interface is for writers, and there are plain-text ways in for fixing things by hand.

"Approachable" here means three things:

1. **What the author sees is calm and finished.** Rendered text instead of Markdown, and one consistent layout.
2. **The project fits what the author is making.** A novel, a short story or a D&D campaign starts from a template, with the right kinds of pages already named, and the author can adjust them without touching a file.
3. **The tools speak the author's language.** Timelines of the story, and Word in and out.

One milestone at a time, as `AGENTS.md` says. Each milestone below gets its own plan file, with files to change, tests and open decisions, before any code is written. This document fixes the direction, the phases and the order; the per-milestone plans fix the details.

## Phases at a glance

| Phase | Milestones | What authors get | Suggested release |
| --- | --- | --- | --- |
| A. A calm studio | M16 Rendered editing · M17 Main screen | No Markdown symbols in sight; a layout that looks finished | 0.4 |
| B. Your kind of project | M18 Page kinds per project · M19 Templates | Start a novel, short story or campaign from a template; add or rename kinds of pages | 0.5 |
| C. Story in time | M20 Timeline · M21 Lanes | The plot in time, and each character's (or faction's) path through it | 0.6 |
| D. Coming from Word | M22 Word in and out, backups | Bring a manuscript in, send chapters out, trust the backups | 0.7, then 1.0 |

```
A: M16 Rendered editing ──┐
   M17 Main screen ───────┼──> B: M18 Page kinds ──> M19 Templates
                          │                  │
                          └──> C: M20 Timeline ──> M21 Lanes (by any kind; needs M18)

D: M22 Word and backups   (superseded 2026-11-05: backups move to the tightening milestone; import and export become their own researched feature)
```

## Product decisions this roadmap needs (owner)

These change existing specs, so they are recorded here and then in the specs themselves.

| # | Decision | Changes | Recommendation |
| --- | --- | --- | --- |
| D1 | The primary audience is non-technical writers, Hebrew first. Markdown is the safety net, not a feature authors see | `PRD.md` §1–2, `UX_SPEC.md` | Accept |
| D2 | Every editing surface shows rendered text by default; raw Markdown is a separate **plain-text** mode | ADR 0004 (amend), Milestone 14's Text view | Accept; new ADR 0010 |
| D3 | The kinds of pages (characters, places, notes) are set per project in `project.md`, with today's three as the default | ADR 0006 (amend), `DOMAIN_AND_FILE_FORMAT.md` | Accept; new ADR 0011 |
| D4 | All kinds of pages behave the same: title, other names, description, relationships, tags. No kind gets special behaviour | `DOMAIN_AND_FILE_FORMAT.md` | Accept. This is what keeps kinds cheap |
| D5 | Renaming a kind never renames its folder. A separate, explicit helper matches folder names to the names in the app, with a preview and a backup first | `DOMAIN_AND_FILE_FORMAT.md` (extends "Synchronize filenames"), ADR 0005 | Accept |
| D6 | New projects start from a template; templates are bundled project skeletons, written once and then the author's own | `PRD.md` §5 ("no mandatory creative template") stays true: Blank is always offered | Accept |
| D7 | Timelines move from OUT to IN, **as views of outlines only**, not a separate timeline engine or data store | `PRD.md` §9, Milestone 11 "Out of scope" | Accept; new ADR 0012 |
| D8 | Which way time runs in a Hebrew interface | `UX_SPEC.md` RTL section | Earlier on the reading-start side: right in Hebrew, left in English. Validate with Hebrew testers |
| D9 | Reading `.docx` comes into scope (Milestone 13 left it to assistants) | Milestone 13, `PRD.md` §6 | Accept for chapters only |

**What stays fixed** (and is explained clearly instead of made configurable): the outline mapping (`##` sections, bullets as cards, nested bullets as details), links, `CONTENTS.md` and one file per chapter. An author who needs a different structure makes another outline.

---

# Phase A: A calm studio

## Milestone 16: Rendered editing everywhere

### Goal

An author edits every kind of page (chapters, outlines in Text, and every World page) and sees what the text **means**: a heading looks like a heading, a card looks like a card, a link is a name. Markdown symbols never appear unless the author asks for plain text.

Today the chapter editor's live preview hides markup except on the cursor's line, so `## ` and `[Bea](../characters/bea.md)` still show there. Milestone 14's Text view shows outline links as raw Markdown ("Known limits"). For a writer from Word, both read as broken.

### What the author will see

- **Headings stay headings.** The `#` marks are never shown, even on the cursor's line. The level is set from the format bubble or the keyboard (Ctrl+1/2/3, Ctrl+0 for body text), as in Word.
- **Outline Text looks like an outline.** Sections are headings, cards are drawn bullets, details are indented under them. The hint changes from "## starts a section" to plain words: "Enter adds a card, Tab makes it a detail, Ctrl+2 makes a section."
- **Links are names everywhere.** The chips from the card field (Milestone 11) come to Text and to pages: one chip per link, the cursor steps over it, Backspace removes it whole. `@` and `[[` offer names, as today.
- **Bold and italics** show as formatting, never as asterisks, including on the cursor's line.
- **Typing Markdown still works** for those who know it: `## ` at the start of a line becomes a heading and `- ` a bullet, and the marks disappear once understood.
- **Plain text, one step away.** Each page's `⋯` menu has **Edit as plain text**: the same file in the same editor, every mark visible, no chips, under a quiet banner: "Plain text. Changes here are saved exactly as typed." The banner has **Back to normal view**. Settings → Advanced has **Show plain text when I open a page** (off by default).
- **"Kept as written" passages** (tables, code, unusual Markdown) still show as written, with the existing style and count. Pointed out, never changed.

### Decisions

1. **One editor, two modes.** Rendered and plain text are the same CodeMirror instance with different extensions, switched by a compartment. Switching never remounts the editor or loses undo history.
2. **Rendering never changes the file.** Decorations only. What the author types is written as typed (ADR 0003, point 1); a no-op load and save stays byte-identical.
3. **Plain text is not hidden, just not first.** It is in every page's menu and in Settings, not behind a developer switch. This replaces Milestone 14's "Text visible to everyone" with the same idea one level down: Text is now rendered, and plain text is the raw view.
4. **No new editor library.** This extends `live-preview.ts`, `item-text.ts` and `outline-text.ts`.

### Risks and tests

- **Highest risk, tested first:** arrows, Home/End, Shift+arrows and double-click over hidden marks and chips, in English, Hebrew and mixed lines.
- **Screen readers:** hidden marks not read out, headings announced as headings (the outstanding Orca/NVDA check in `docs/spikes/README.md`).
- **Fidelity:** every fixture opens and saves byte-identical in rendered mode; unknown Markdown stays "kept as written".
- **Editor:** `## ` and `- ` convert; Ctrl+1/2/3/0 write exactly one heading line; switching to plain text and back keeps undo history and selection.
- **End to end:** write an outline in Text without typing any Markdown symbol, switch to Board and see the expected sections and cards; open plain text from `⋯`, edit, return, see the change.

## Milestone 17: The main screen, tightened

### Goal

Story and Write share one layout language. The sidebar and the main area feel related, with consistent width, spacing, collapse behaviour and headers, so the app looks finished in screenshots and in the first ten minutes.

**This milestone starts with a design session, not code.** The owner and Claude produce mockups (Hebrew and English, light and dark) for Write, a Story outline, the World gallery, the start screen and the template picker (M19), and only then write the milestone plan.

### Questions for the design session

- **One sidebar or two?** Write's chapter navigator and Story's Plot/World sidebar as one component with different contents, keeping the same width when switching.
- **Collapse.** One gesture and shortcut collapses the sidebar in both workspaces; Focus becomes "sidebar and shelf collapsed" rather than a separate layout.
- **Headers.** Where the open item's title, its view switch (Board · List · Text · Timeline) and its `⋯` sit, so they read as "this item", not "the whole app".
- **The World group with any number of kinds** (M18): five or six kinds must still fit and scan well.
- **Density.** Row height, indentation and the gold thread, checked with a 60-chapter manuscript and a 40-character cast.
- **Empty states.** What a new book looks like in each area, with one clear next step.
- **Hebrew first.** Each mockup is drawn in Hebrew and mirrored for English.

### Constraints

Colours, fonts and radii from `DESIGN_SYSTEM.md`, no new colours; the editor is never remounted by a layout change; everything works at 1280×720 and at 200% zoom.

---

# Phase B: Your kind of project

## Milestone 18: Page kinds per project

### Goal

The author decides what kinds of pages the book has. A novel keeps Characters, Places and Notes; a campaign has NPCs, Locations, Factions, Items and Lore. The author adds, renames and reorders kinds from a friendly settings screen, never from a file.

### Where it lives

`project.md` frontmatter gains two optional keys. Without them, a project behaves exactly as today:

```yaml
---
title: The Sunken Crown
language: en
kinds:
  - folder: characters
    one: NPC
    many: NPCs
  - folder: places
    one: Location
    many: Locations
  - folder: factions
    one: Faction
    many: Factions
  - folder: notes
    one: Lore
    many: Lore
manuscriptUnit:
  one: Session
  many: Sessions
---
```

- `kinds` is the list, in sidebar order. Each kind is a folder plus the names the app shows.
- `manuscriptUnit` renames "chapter" in the interface only ("New session", "Session 3"). Files, `CONTENTS.md` and compiling are unchanged.
- The three built-in kinds without custom names keep their English and Hebrew translations. Custom names are shown as the author typed them, in any language.
- The app writes these keys with targeted frontmatter patches, as it does for `title`; the body of `project.md` stays the author's.

### What the author will see

- **Book settings → "What your world has"**: the kinds as a list. **+ Add a kind** asks for its name ("Faction") and its plural ("Factions"). Each row can be renamed, dragged to reorder, or removed.
- **The sidebar's World group** shows the project's kinds, each with its count, and each opens a gallery as Characters do today.
- **Links, "Linked from", relationships, tags, the shelf and "Link to…"** work across all kinds, because they already work on links, not on kinds.
- **Removing a kind never deletes anything.** Its pages move to a quiet "Not sorted yet" tray in World, where they can still be opened, linked and given a kind again.
- **Folders the project doesn't list** (made by hand or by another app) appear in the same tray, with **Make this a kind…**.

### Keeping folder names in step (the sync helper)

Renaming a kind changes only what the app shows. The folder keeps its name (D5): renaming is never automatic, and links never break behind the author's back.

- When a kind's name no longer matches its folder, "What your world has" shows one quiet line, never a pop-up: "Some folder names no longer match what you call them in Plot Device. This only matters if you open the book's folder in other apps." with **Match folder names…**.
- **Match folder names…** opens a preview:
  - each folder's old and new name (`characters/` → `npcs/`);
  - how many links in chapters, outlines and pages will be updated to the new folder;
  - anything that blocks a rename: a folder with that name already exists, a name Windows can't use, a case-only change.
- Before the button that does it, a clear step: "Make a backup first. Plot Device is about to rename folders and update links across your book." with **Make a backup now** (a copy of the book folder to a place the author picks) and a checkbox "I have a backup". The rename button stays disabled until one of them is done.
- The renames and link updates are written to the recovery journal and run as one recoverable operation (ADR 0005). **Undo folder renames** is offered right after, and in the book menu until the book is closed.
- The same mechanism later serves the existing plan to "synchronize chapter filenames with manuscript order" (`DOMAIN_AND_FILE_FORMAT.md`). That is not part of this milestone.

### Decisions

1. **All kinds behave the same** (D4). No kind-specific fields or views.
2. **Folder names are chosen once,** when a kind is added: from its plural name, made safe for every system (the existing path checks), and shown so the author can change it before it is created.
3. **The domain's `ReferenceKind` union becomes data.** Today it is `'character' | 'place' | 'note'`, used in about 11 files. It becomes a kind id read from the project, with the three built-ins as defaults.
4. **Older versions of Plot Device** ignore folders they don't know. Nothing is lost if a project is opened in one; ADR 0011 says so.

### Tests

- **Domain and storage:** a project with no `kinds` key behaves exactly as before (existing fixtures unchanged); custom kinds read and written with frontmatter key order and comments preserved; Hebrew kind names and folder names; a listed folder that doesn't exist; an unlisted folder in the tray.
- **Sync helper (test-first, highest risk):** the preview lists exactly the links that will change; links in chapters, outlines, pages and `CONTENTS.md` updated; collisions, Windows reserved names and case-only renames refused with a reason; a failure halfway rolls back from the journal; undo restores names and links byte-identical.
- **End to end:** add "Factions", create a faction, link it from an outline card, rename the kind, match folder names, and see the link still working in the app and in the file.

## Milestone 19: Templates for new projects

### Goal

A new author doesn't face an empty folder. **New project** asks what they're making, and the app creates a ready, labelled project they can adjust: the right kinds of pages, a starter outline or two, suggested tags, and nothing that has to be deleted before writing.

### The first templates

| Template | Kinds | Manuscript unit | Starter outlines | Suggested tags |
| --- | --- | --- | --- | --- |
| **Novel** | Characters, Places, Notes | Chapter | Main story (three acts: beginning, middle, end), Loose ideas | Main character, Secondary |
| **Short story** | Characters, Notes | Chapter (one, ready to write) | The story (opening, turn, ending) | none |
| **D&D campaign** | NPCs, Locations, Factions, Items, Lore | Session | Campaign arc, Session plan | Player character, NPC, Villain, Ally |
| **Blank** | Characters, Places, Notes | Chapter | none | none |

Later candidates, once these four are tested: memoir (People, Places, Events, Sources), series bible, children's book, web serial.

### What the author will see

- **New project** shows the templates as cards with a one-line description and a small picture of what's inside ("5 kinds of pages · 2 outlines · sessions"). Blank is always there, so no template is ever forced (`PRD.md` §5).
- **Then the usual details:** title, where to keep it, the story's language. Templates come in English and Hebrew; the story's language picks which.
- **The project opens ready to work:** Write on the first chapter for Novel and Short story; Story on the Session plan for a campaign.
- **Everything is adjustable afterwards** in "What your world has" (M18). A template leaves no trace that matters: once created, it is simply the author's project.

### Explaining the outline, gently

Outlines have one fixed shape, so the app explains it the first time an author meets one, instead of making it configurable:

- An outline that has never been opened shows a short, dismissible guide above it: "Sections are the big steps of your story. Cards are the moments in each step. Add details under a card." with a tiny picture of the Board.
- Starter outlines contain only section headings and a few short example cards, written as real story beats ("The hero refuses the call"), never as instructions inside the author's file.
- **"New outline from…"** offers the same starters to any project: Three acts, Save the Cat beats, Character arc, Session plan, Empty.

### Decisions to make in the milestone plan

- **Suggested tags.** Tags exist today only once a page uses them. Either `project.md` gains a short `suggestedTags` list that "+ Tag" offers first, or templates don't suggest tags. Recommendation: the list, since it's small and readable.
- **Where templates live:** bundled folders in the app, one per template and language, checked by the same fixture tests as real projects. No downloading.
- **Template wording** in Hebrew written by a Hebrew writer, not translated from the English.

### Tests

- Each template, in each language, creates a project that passes the project check with no warnings and opens without any write (a no-op load).
- Creating from a template never overwrites an existing folder.
- End to end: create a D&D campaign, see five kinds and "Sessions", add an NPC, link it from the Session plan; create a Hebrew novel and see Hebrew outline headings and RTL layout.

---

# Phase C: Story in time

## Milestone 20: Timeline view of an outline

### Goal

The author sees the plot laid out in time, using an outline they already have. **Timeline** is a fourth view beside Board · List · Text: the outline's sections are moments along a line, and their cards are the events at each moment.

### How it reads the outline

The same file and mapping (ADR 0003). No new file, field or syntax:

```markdown
# Main story

## Spring, 1912
- Ilka finds the letter
- The auction is announced

## The night of the storm
- [Bea](../characters/bea.md) leaves Marrow
```

- Each `##` section is a **moment**, in file order, labelled by its heading. No dates are parsed, so "Day 3", "Before the war" and invented calendars all work.
- Each card is an **event** at that moment, with its details folded under it.
- Moving a card to another moment is the same operation as moving it to another column on the Board.

### What the author will see

- A line of moments with their cards stacked under each, earlier moments on the reading-start side (D8).
- Drag between moments, with the existing Move menu as the keyboard equivalent.
- Cards linked to a chapter (or session) show its name as a small label, so the author sees where each event is told.
- Any outline can be shown as a timeline. The view is remembered per outline, like Board and List.

### Architecture note

Timeline is the first view added since the architecture settled. It registers itself with an **internal view registry** (id, name, icon, the projection it needs, its component), rather than as another branch in `StoryView.vue`. Board, List and Text move onto the registry when they are next touched. The registry is internal only; there is no public plugin API.

### Tests

- **Presentation:** the projection from outline to moments and events, with empty sections, cards before the first section (a moment called "Before"), Hebrew and English headings.
- **Fidelity:** dragging on Timeline produces the same file change as the equivalent Board move (shared fixture).
- **End to end:** Board → Timeline → List with no change to the file; move a card on Timeline; Hebrew direction.

## Milestone 21: Lanes, and each one's path

### Goal

The timeline splits into **lanes**, one per page of a chosen kind or per tag, so the author sees each character's, faction's or location's path through the story, where paths cross, and where someone disappears for half the book.

### What the author will see

- **"Lanes by…"** on Timeline: nothing, **any kind in the project** (Characters, Factions, Locations…), or Tags.
- **A card goes in a lane** when it, or one of its details, links to that page or carries that tag: the same links "Linked from" uses. Nothing is guessed from names.
  - A card linked to two pages appears in both lanes, marked as shared.
  - Cards with no links go in a folded lane ("No one", "Nowhere", "Untagged").
- **Choosing lanes:** all pages of the kind, picked by hand, or by tag ("main cast", "party"), reusing Milestone 12's tag filter.
- **From a page:** "show the page's cards on the board" gains **Show on the timeline**, opening the timeline with that page's lane alone.
- **Gaps are visible:** a moment where a lane has no card shows as an empty stretch.

### Priority and later ideas

| Priority | Feature | Notes |
| --- | --- | --- |
| P1 (this milestone) | Lanes by any kind or tag; one page's timeline from the page | Projection only |
| P2 | **Story order vs. book order:** chapters in reading order, each joined to the moments it tells | For non-linear novels and flashbacks; uses existing card-to-chapter links |
| P2 | Several outlines on one timeline (main plot plus subplot), aligned by moment names | Needs a matching rule; design first |
| P3 | Optional real dates on moments, calendar spacing | Only if testers ask; ADR first |
| P3 | Read-only relationship map from ADR 0009 relationships | Milestone 11 allowed it "drawn from existing links" |
| Not planned | Hand-drawn webs, a separate timeline file, dates guessed from prose | Against the invariants and the Milestone 11 survey |

### Tests

- **Presentation:** lane assignment from links in cards and details, for built-in and custom kinds; shared and unlinked cards; links to missing pages; deterministic lane order.
- **Performance:** 300 cards × 40 lanes within the existing perf budget.
- **Accessibility:** each lane a labelled region; cards reachable by keyboard in moment order; screen-reader name "Bea, Spring 1912, Ilka finds the letter".

---

# Phase D: Coming from Word

## Milestone 22: Word in and out, and backups

### Goal

A writer coming from Word can bring a manuscript in, hand chapters to an editor in Word, and trust that the book is backed up, all without learning anything about files.

### What the author will see

- **Import from Word**, on the start screen (as a fifth way to start, beside the templates) and in the book menu: choose a `.docx`, preview how it splits into chapters (by headings or page breaks), rename or merge in the preview, then import. The original file is never changed.
- **Export to Word**: the whole book or one chapter, as a clean `.docx` with chapter headings.
- **Backups to a folder you choose**, such as Google Drive or Dropbox: a copy of the book daily and on closing, keeping the last 30. **Restore from a backup** is one button in the book menu, with a preview. M18's "Make a backup now" becomes part of this.
- **Save status** says, in plain words, when the last backup ran.

### Decisions to make in the milestone plan

- The `.docx` library: offline, keeps Hebrew and mixed-direction text, licence compatible with Plot Device's.
- What is lost on import (comments, tracked changes, footnotes) and how the preview says so.
- How restore avoids overwriting newer work (ADR 0005).

---

## What this roadmap doesn't cover

- Pricing, licensing and the purchase flow (`LICENSE` is GPL-3.0; how a paid version fits is a separate decision).
- macOS, and signing the Windows installer.
- A public plugin API (not planned; see the internal view registry in M20).
- A third interface language.
- Optional nikkud (Hebrew vowel points), possibly with a dedicated way to type them: planned later, with its own plan. Milestone 16 only keeps pointed text working.