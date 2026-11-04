# Milestone 18: Kinds of pages per project

Status: **Built** (2026-11-04). Approved by the owner on 2026-11-04, with the recommended answers to the open questions. See [Results](#results). Direction from `roadmap-16-approachable-studio-and-timelines.md` (Phase B); decisions in ADR 0011 (amends ADR 0006) and the note of 2026-11-04 in ADR 0005.

## Goal

The author decides what kinds of pages the book has. A novel keeps Characters, Places and Notes. A campaign has NPCs, Locations, Factions, Items and Lore, and calls its chapters sessions. The author adds, renames, reorders and removes kinds from a friendly screen, never from a file. A project with no `kinds` key behaves exactly as today.

**Out of scope:**

- **Templates** (Milestone 19). This milestone makes them possible.
- **Kind-specific fields or views** (ADR 0011, decision 3). All kinds behave the same.
- **Synchronising chapter file names with reading order.** The folder-rename machinery is built so it can serve this later.
- **Changing chapter files, `CONTENTS.md` or export** for `manuscriptUnit`. Only the interface's words change.

## What I found in the code

- **The three kinds are fixed in many layers:**
  - the domain: the `ReferenceKind` type `'character' | 'place' | 'note'`, the `REFERENCE_FOLDERS` map, `kindOfFile` and `referenceFileFor`;
  - the contracts: `referenceKindSchema`, and a path check `^(characters|places|notes)/` used by six request schemas;
  - storage: listing, summarising, falling back to `note` for an unknown folder, and the project check;
  - the desktop's file watcher, which notices changes only under the three folders;
  - presentation: `LINK_KINDS`, `suggestedLinkTargets` and `galleryPages`;
  - the interface: `StoryView`, `WorldGallery`, `ReferenceShelf` (order, colours and opening), `LinkPicker`, `LinkSuggestions`, `ReferencePage` and the story store;
  - i18n keys built from the kind's name: `story-`, `new-`, `gallery-empty-`, `tag-all-` and `kind-`.
- **`project.md` is never edited after a book is created.** The frontmatter helpers patch single values (`setFrontmatterValues`) and one-line lists (`setFrontmatterList`, used for tags), but not a list of entries like `kinds:`.
- **Renaming a page's file** is journalled (ADR 0005) and rewrites links in every Markdown file:
  - it covers inline links, reference-style definitions and `[[wikilinks]]`;
  - the journal knows only one operation, `rename-chapter-file`;
  - it can't move between folders, and there is no undo.
- **The project check** (Milestone 13) counts characters, places and notes by name, and reports any other folder as "outside the book's folders". The guide for AI assistants, and the test that keeps it true, say the same.
- **The interface says "chapter" in 27 messages**, of which about 10 are prominent. The rest are long sentences: conflicts, versions, export.

## What the author will see

### "Kinds of pages"

- **How to open it:** "Kinds of pages…" in the book menu, or **+ Kind of page** at the end of the World group in the sidebar.
- **The kinds, as a list**, each with its name, its plural, its page count and its folder (quiet, in small type).
- **Adding a kind:** **+ Add a kind** asks for its name ("Faction") and plural ("Factions"). It offers a folder made from the plural (`factions/`), which the author can change before it's created.
- **Each row can be** renamed (name and plural), moved up or down by dragging or from its `⋯`, or removed.
- **Removing a kind deletes nothing.** The confirmation says so: "Its 4 pages stay in the book and appear under 'Not sorted yet'."
- **"What chapters are called":** Chapter / Chapters by default, or anything the author types ("Session" / "Sessions").

### World, with the project's kinds

- **The sidebar's World group** lists the project's kinds in their order, with counts. Each opens a gallery, as Characters do today.
- **Pages work across all kinds** because they work on links, not on kinds: links, "Linked from", relationships, tags, the shelf and "Link to…".
- **"Not sorted yet"** appears at the end of World only when it has pages. It holds the pages of a removed kind, and pages in a folder the project doesn't list:
  - they can be opened, linked and tagged like any page;
  - each folder has **Make this a kind…**.

### Matching folder names

- **Renaming a kind changes only what the app shows** (ADR 0011, decision 6).
- **When names and folders differ,** "Kinds of pages" shows one quiet line: "Some folder names no longer match what you call them in Plot Device. This only matters if you open the book's folder in other apps." with **Match folder names…**.
- **The preview** lists each folder's old and new name, how many links will change, and anything that blocks a rename: a folder with that name exists, a name Windows can't use, or a change of letter case only. Each blocked rename shows its reason.
- **The backup step** sits before the button: "Make a backup first. Plot Device is about to rename folders and update links across your book."
  - **Make a backup now** copies the book's folder to a place the author picks.
  - Or the author ticks "I have a backup".
  - The rename button stays disabled until one of them is done.
- **After renaming,** **Undo folder renames** is offered at once and stays in the book menu until the book is closed.

### What chapters are called

With "Session" / "Sessions", the interface says:
- "New session", "Session 3", and "Sessions" in the sidebar and the link picker;
- "No sessions yet" in the empty state;
- "Part One · Session 3" in the header row.

Longer messages keep a general word (open question 2).

## Decisions (proposed)

1. **A kind is identified by its folder** (ADR 0011, decision 2). Internally a kind is its folder name. The default kinds are `characters`, `places` and `notes`, and their interface names stay in the message catalogs. Test IDs and per-user state use the folder.
2. **`project.md` holds the list.**
   - `kinds` is written as a block list of entries (`- folder: …` with `one:` and `many:` beneath).
   - `manuscriptUnit` is written as a two-key entry.
   - A new targeted helper replaces exactly one top-level key's lines and keeps every other key, comment and the body byte-identical. Writing the default value back removes the key, so a project that never changes its kinds never gets one.
3. **Request schemas check paths, not kinds.** A page path is any `.md` path under a folder that isn't `manuscript/` or `outlines/`, with no traversal; the host checks it against the project's kinds and the unsorted folders.
4. **Folder renames** are a new journalled operation, `rename-folder`.
   - Its steps are one directory rename, a write per changed file, and the `project.md` patch.
   - Links are rewritten by the existing `rewriteLinksTo`, extended from one file to every file under a folder.
   - **Undo** keeps each changed file's previous text for the session, and applies the reverse rename and the old texts through the journal. That restores names and links byte-identical, and refuses if a file changed since.
5. **Backups:** "Make a backup now" copies the folder with the existing safe-write rules, into a new folder named "‹Book› backup ‹date›", never over anything. Milestone 22's scheduled backups will reuse it.
6. **Shelf colours:** the three default kinds keep their colours. Other kinds take the plot colours in turn (amber, plum, terracotta), always beside their name, so colour is never the only cue.
7. **The project check and the guide for AI assistants** read the kinds from `project.md`. Counts become per kind, and a folder of pages the project doesn't list is reported as unsorted pages, not a mistake (ADR 0011, decision 9).
8. **No schema version change and no migration** (owner, 2026-11-04).

## Files

- **Domain:**
  - `references/references.ts`: the kinds as data (`PageKind {folder, one?, many?}`), the defaults, and `kindOfFile(kinds, file)`;
  - new `project/kinds.ts`: validating and editing the list (add, rename, move, remove, a safe folder name from a plural);
  - `project/project-details.ts`: `kinds`, `manuscriptUnit`.
- **Markdown:** `frontmatter.ts` gains `setFrontmatterBlock`, which replaces one top-level key's lines or removes the key. `links.ts` gains rewriting for a whole folder.
- **Application:**
  - ports: `reference-repository.ts`, `journal-store.ts` (the `rename-folder` operation);
  - new `project/kinds.ts`: the use cases for change kinds, match folder names (plan, apply, undo) and back up the book.
- **Storage:**
  - `read-project.ts`: read `kinds` and `manuscriptUnit`, with warnings for unreadable entries;
  - `reference-repository.ts`: list pages by the project's kinds, and list unsorted folders;
  - `repository.ts`: the folder rename and its undo;
  - `check-project.ts`: per-kind counts and unsorted folders.
- **Contracts:** `references.ts` (path schemas; kinds in the project view), new `kinds.ts` (requests and views), `api.ts`.
- **Desktop:** the kinds IPC; the file watcher by the project's kinds; the backup folder dialog.
- **Presentation:** `references.ts`: link targets and suggestions by the project's kinds; a kind's display name.
- **Interface:**
  - new `components/KindsDialog.vue` and `components/MatchFolders.vue`;
  - `StoryView.vue`: World by kinds, "Not sorted yet", "+ Kind of page";
  - `WorldGallery.vue`, `ReferenceShelf.vue`, `LinkPicker.vue`, `LinkSuggestions.vue`, `ReferencePage.vue`, `stores/story.ts`;
  - the manuscript unit in `ChapterNavigator.vue`, `WritingView.vue` and `LinkPicker.vue`;
  - the book menu in `TopBar.vue`; `styles/base.css`.
- **Words:** `en.json`, `he.json`: the kinds screen, the folder matching, the tray, and the unit's words. Hebrew written in Hebrew.
- **Guide and samples:**
  - `apps/site/public/for-assistants.md` and its test: kinds from `project.md`;
  - the user guide in English and Hebrew: a new "Kinds of pages" page, plus `files/pages.mdx` and `files/folder.mdx`;
  - the screenshot script.
- **Docs:** ADR 0011 implementation note; `DOMAIN_AND_FILE_FORMAT.md` if anything moves; `UX_SPEC.md`.

## Tests

Stated before coding. The folder rename is test-first.

- **Domain:**
  - a project without `kinds` has the three default kinds;
  - adding, renaming, moving and removing keep the list valid;
  - a safe folder from a plural, including Hebrew ("פלגים"), Windows reserved names and collisions;
  - `kindOfFile` with custom kinds and unsorted folders.
- **Markdown:** `setFrontmatterBlock` writes and replaces `kinds:` and `manuscriptUnit:` and removes them, keeping key order, comments, other keys, CRLF and the body byte-identical. Hebrew names, and names that need quoting (`one: "NPC: Ally"`).
- **Storage:**
  - every existing fixture loads unchanged;
  - custom kinds are read, and listed pages follow them;
  - a listed folder that doesn't exist;
  - an unlisted folder goes to the tray;
  - an unreadable `kinds` key gives a warning and the defaults, and is never rewritten.
- **The folder rename (test-first, highest risk):**
  - the preview lists exactly the links that will change;
  - links are updated in chapters, outlines, pages and `CONTENTS.md`, including reference-style links and `[[wikilinks]]`, with fragments kept;
  - a collision, a Windows reserved name or a case-only rename is refused with a reason;
  - an interruption halfway is finished, or reported, from the journal;
  - undo restores names and links byte-identical, and refuses when a file changed since;
  - Hebrew folder names.
- **Backup:** a copy is byte-identical, lands in a new folder, and never overwrites.
- **The project check and the guide:** per-kind counts; an unsorted folder; the guide's example book with custom kinds checks clean.
- **Presentation:** link targets and the gallery for custom kinds; the shelf's order and colours.
- **End to end, in English and Hebrew:**
  - add "Factions", create a faction, link it from an outline card, rename the kind, match folder names with a backup, and see the link still working in the app and in the file; undo, and see everything back;
  - remove a kind and find its pages under "Not sorted yet"; make the folder a kind again;
  - set the unit to "Session" and see "New session", "Session 3" and "Sessions";
  - a book with no `kinds` looks exactly as before.
- **Updated, not new:** tests that click `data-gallery="character"` and similar move to folder names (`characters`).

## Work order

1. Domain and markdown: kinds as data and `setFrontmatterBlock` (test-first).
2. Storage: reading kinds, listing by kinds, the tray, the project check.
3. Contracts, IPC, presentation, and the interface reading kinds (World, gallery, shelf, link picker).
4. The kinds screen: add, rename, move, remove; the unit's name.
5. The folder rename: plan, journal, apply, undo; the backup; the matching screen (test-first).
6. The guide for AI assistants, samples, user guide, screenshots.

## Open questions

1. **Where the kinds screen lives.** **Recommendation:** a dialog opened from "Kinds of pages…" in the book menu and from "+ Kind of page" in the sidebar. There's no "Book settings" screen today, and one dialog is simpler than a new screen.
2. **How far "chapter" is renamed.** **Recommendation:** the prominent words: the sidebar label, "New ‹unit›", "‹Unit› 3", the header row, the empty state and the link picker's group. Longer messages (conflicts, versions, export) say "this page" or keep "chapter" for now, and the gap is listed in the results.
3. **Hebrew grammar for author-typed names.** "New" agrees in gender in Hebrew: "מפגש חדש", "סצנה חדשה". **Recommendation:** for custom kinds and units, buttons read "+ ‹name›" (in Hebrew "+ פלג", "+ מפגש"), with no adjective. The default kinds keep their translated "דמות חדשה".
4. **Undo of folder renames after the app closes.** **Recommendation:** until the book is closed, as the roadmap says. After that, the backup and the versions of each changed file remain.
5. **Removing a kind that has pages.** **Recommendation:** allowed, with a confirmation that says how many pages move to "Not sorted yet". Nothing is deleted.

## Results

### What the author can do

- Open **Kinds of pages…** from the book menu, or **+ Kind of page** under World, and see each kind with its folder and page count.
- Add a kind with its name and plural ("Faction", "Factions"). Its folder follows the plural and can be changed before it is made. Rename, move up, move down or remove a kind from its `⋯`.
- Find a removed kind's pages, or any folder of pages the book doesn't list, under **Not sorted yet**, and make it a kind again with **Make this a kind…**.
- Use pages of any kind everywhere pages are used: galleries, tags, relationships, links, "Link to…", the references shelf.
- Call chapters something else ("Session", "Sessions"): the sidebar, "New Session", "Session 3", the header row, the empty state and the link picker use it.
- After renaming a kind, match its folder with **Match folder names…**: see each folder's new name, its pages and the links that will change; make a backup of the whole book first, or say there is one; rename; and undo from the notice, or from the book menu until the book is closed.
- Hand the guide for AI assistants a world with factions or ships: it now explains kinds, and its example is checked against the app.

### Changed from the plan while building

- **A new page of the author's own kind** is "New Faction" in English, not "+ Faction": the add card already draws its "+", and the screenshots showed "+ + Faction". Hebrew keeps "הוספת פלג" (open question 3).
- **Rows aren't dragged**; Move up and Move down in each row's `⋯` do it.
- **The undo is gentler than the plan's "byte-identical or nothing":** a page that only moved goes back with what was typed in it since. A file whose links were rewritten must be unchanged, and a page added to a renamed folder since blocks the undo, so nothing is left behind.
- **Kinds with no pages aren't offered for matching**, since they have no folder to move.
- **The words for a unit are used as typed**, so "Session" gives "New Session" in English, not "New session".

### Found and fixed by the tests

- The matching screen sent the host a reactive list, which can't cross between the page and the host, so no preview showed. It now sends a plain copy.
- A page open in the editor moved with its folder only after the session learned to follow it; without that, typing in it after the rename was refused.
- In Hebrew, the rename arrow pointed left to right; it now follows the interface's direction.

### Tests

- `pnpm lint`, `pnpm typecheck`, `pnpm build`: clean.
- `pnpm test`: 76 files, 1174 tests passed, including `storage/test/folder-rename.test.ts` (the preview, every blocked reason, the rename, a crash halfway finished from the journal, undo byte for byte, undo refused after outside changes or new pages, undo after typing in a moved page), `fs-node/src/copy-book.test.ts`, and the IPC test for backup, rename and undo with an open page. `pnpm arch`: 162 passed. `pnpm perf`: 7 passed.
- `pnpm e2e` (whole suite): 107 passed, including the new `kinds.e2e.ts`: add Factions, create and link a page, rename the kind, match folders with a backup, undo, remove the kind and find it under "Not sorted yet", in English and Hebrew; a book that calls its chapters sessions.
- Screenshots retaken (`pnpm site:screenshots`, 4 passed; new: `kinds-dialog`, `world-own-kind`, `match-folders`) and checked by eye; `pnpm site:test` 10 passed.

### Known limitations

- Longer messages (conflicts, versions, export) still say "chapter" (open question 2).
- Undo of folder renames ends when the book closes (open question 4); the backup remains.
- The new Hebrew wording is listed for review in `docs/reviews/hebrew-wording-milestone-16.md`.
