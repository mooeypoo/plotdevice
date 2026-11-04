# Milestone 17: The main screen, tightened

Status: **Built** (2026-11-04) on branch `milestone-17/main-screen`, with the recommended answers to the open questions; awaiting owner review. Results at the end. Direction from `roadmap-16-approachable-studio-and-timelines.md` (Phase A). Designed with the owner in a session on 2026-11-04; mockups: https://claude.ai/artifact/Avk17Kgjj5Di3gwozkFHtc (Hebrew in light, English in dark, narrow windows, new and long books).

## Goal

Story and Write look like one app. Today they differ in group labels, headers, collapsing and the top bar, so switching between them feels like changing programs. After this milestone the screen has one layout language:
- the same top bar;
- the same sidebar;
- a header row for whatever is open;
- the tools for writing on the page itself.

New and long books look finished too.

**Out of scope:**

- **The template picker** (Milestone 19). The mockups show it, so the layout is settled, but it's built with the templates.
- **Timelines** (Milestone 20). No Timeline button until timelines are designed (owner, 2026-11-04).
- **New colours or fonts** (`DESIGN_SYSTEM.md` stays the authority), and kinds of pages (Milestone 18). The World group is built to hold any number of kinds, but still lists the three of today.

## What the author will see

### The top bar, the same everywhere

- The logo and the book's title (the book menu), Story | Write, the save status, **Aa** and ☰, in the same places in both workspaces.
- **The logo stays the pen nib** (owner, 2026-11-04). In light mode its gold line is a shade darker (open question 3).
- **The save status always shows**, since Story saves pages and outlines too.
- **Aa** (text size, page width, Focus) applies to every page: chapters, World pages and outline Text (open question 6).

### One sidebar

- **The same component, width and look in Write and Story.** Only its contents change with the workspace: the book's chapters in Write, and Plot and World in Story.
- **One style for group labels:** a serif, italic in English and upright in Hebrew. It's used for parts, "On the side", and Plot/World.
- **The open item** has the well colour and the gold thread, as now.
- **World** is a plain list of kinds with their counts, and the group can fold.

### One header row

At the top of the main area, in both workspaces:
- the sidebar toggle;
- the open item's name ("Part One · Chapter 2" in Write; "Main story" or "Characters / Bea Halmi" in Story);
- the view switch for outlines (Board · List · Text);
- its `⋯`;
- at the far end, **References** (book icon and word) in Write.

The page keeps its big chapter title.

### Format, on the page

- **The ¶ menu is retired.** Its commands move to a labelled **Format** button (a small B and the word), at the top corner of the page itself, on the reading-end side.
- **It appears wherever there's a page to write on:** chapters, World pages and outline Text. The board, the list and the gallery have none.
- **It stays at the top of the visible page while scrolling**, on the page's edge, never over the text.
- **Why on the page:** research (Decisions, point 8) found ¶ means "show hidden marks" in Word, and that ambiguous icons need words. On the page, Format reads as "for this text", not for the whole app.
- **Format and the selection bubble split the work.** The bubble is for a selection. Format is for the paragraph the cursor is in: headings, lists, quote, direction, plain text.

### Collapse and Focus

- **One collapse:** the same toggle, in the same spot, collapses the sidebar in Write and in Story, with one shortcut in both (open question 4).
- **Focus is not a separate layout.** It's the sidebar and the shelf collapsed, with the top bar quiet. Format fades to a faint label and comes back on hover or focus.

### The board

- A card's or column's `⋯` shows on hover or keyboard focus, not all the time. Right-click and Shift+F10 open the same menu, as on tags.

### New books

Each empty area gives one plain explanation and one next step:
- **A new book's first chapter:** the page reads "Start writing here." in grey, with the cursor there.
- **No outline yet:** a small sketch of a board, "An outline is the plan of your story… You never need one to write.", and **New outline**.
- **No characters yet** (any kind): what a page holds, and **New character**.

### Long books

- **60 chapters:** parts fold to one line with their chapter count. The part being written stays open, and the list scrolls with a soft fade at the bottom (open question 1).
- **40 characters:** the gallery switches to compact cards (name and one line), so a screen shows sixteen at once. Tags still narrow the list (open question 2).

### Narrow windows

- **Checked at 1440×900, 1280×720 and 960×600** (about 200% zoom).
- **Under about 1100 px wide,** References drops to its icon, keeping its name for screen readers and a tooltip. Format keeps its word. The page narrows and its margins shrink instead of overflowing.

## Decisions (owner, 2026-11-04, design session)

1. One sidebar for both workspaces; one group-label style.
2. One collapse everywhere; Focus is collapsed sidebar and shelf with a quiet top bar.
3. The same top bar always.
4. One header row for the open item.
5. Card and column `⋯` on hover or focus.
6. World: a plain list of kinds with counts.
7. **Keep the pen-nib logo;** try a darker gold line in light mode.
8. **Aa stays** (the page's look, as in Apple Books and Kindle). **¶ is retired;** Format is a labelled button on the page. The research behind it:
   - ¶ means "show hidden marks" in Word, and is poorly recognised;
   - **Aa** means "page appearance" in reading apps;
   - Nielsen Norman Group: ambiguous icons need visible labels.
9. **References** gets its word, quieter than Format, and drops to its icon in narrow windows.
10. No Timeline button until timelines are designed.

## Files

- **Interface (`packages/ui-vue/src`):**
  - new `components/SideBar.vue`: the shared shell (width, label style, scroll fade, collapse).
  - `components/ChapterNavigator.vue`: inside `SideBar`; part labels in the shared style; parts that fold.
  - `components/StoryView.vue`: its sidebar inside `SideBar`; the header row; the empty outline state.
  - new `components/ItemHeader.vue`: the sidebar toggle, the name, the view switch, `⋯`, and a slot for tools.
  - new `components/FormatButton.vue`: Format at the page's corner, with its menu built from `format-items.ts`.
  - `components/WritingView.vue`: the old edge row becomes `ItemHeader`; ¶ becomes `FormatButton`; References gets its label.
  - `components/ReferencePage.vue`, `components/OutlineText.vue`: `ItemHeader` and `FormatButton`.
  - `components/OutlineBoard.vue`, `components/OutlineCard.vue`: `⋯` on hover or focus; right-click and Shift+F10.
  - `components/WorldGallery.vue`: the empty state; compact cards for long lists.
  - `components/TopBar.vue`, `components/BrandMark.vue`: the same bar in both workspaces; the logo's gold in light mode.
  - `components/AppearancePanel.vue`: text size and page width for every page.
  - `stores/view.ts`: one sidebar-collapsed state for both workspaces; Focus as collapsed plus the shelf hidden.
  - `styles/base.css`.
- **Words:** `packages/i18n/src/messages/en.json`, `he.json`:
  - Format, References, the empty states, "Start writing here.", and the folded part's count;
  - retire the ¶ menu's name.
- **Docs:**
  - `UX_SPEC.md`: the layout, Format and Focus.
  - `DESIGN_SYSTEM.md`: shape and chrome (the top bar, the header row, tools on the page).
  - The user guide in English and Hebrew: the page, formatting (¶ becomes Format), and shortcuts.
  - The screenshot script, where it uses `format-menu`.

## Tests

- **End to end, in English and Hebrew:**
  - Switching workspaces leaves the sidebar the same width and in the same place.
  - The collapse toggle and shortcut work in both workspaces.
  - Focus collapses the sidebar and the shelf, and leaving it restores both.
  - Format opens its menu by mouse and by keyboard. Each item does what the ¶ menu did, including "Edit as plain text".
  - Format is on chapters, World pages and outline Text, and absent from the board, the list and the gallery.
  - References shows its word at 1280 px and only its icon at 960 px, with its accessible name in both.
  - Card `⋯`: hidden until hover, shown on keyboard focus; right-click and Shift+F10 open the menu.
  - A new book shows each empty state, and each button does what it says.
  - A 60-chapter book: parts fold and unfold; the part with the open chapter stays open; the open chapter is in view.
- **Not remounting:** collapsing, Focus and the narrow layout keep the same editor, cursor and undo history (ARCHITECTURE).
- **Accessibility:**
  - Every new control is named in both languages.
  - The logo's darker gold passes the contrast test as a mark (3:1).
- **Screens:** retake all screenshots; check by eye against the mockups in both themes and languages.

## Work order

1. `SideBar` and `ItemHeader`, and the top bar, in both workspaces.
2. Collapse and Focus.
3. Format on the page, replacing ¶; References with its word; the narrow-window rules.
4. `⋯` on hover on the board.
5. Empty states.
6. Long books: folding parts, compact gallery cards.
7. The logo, docs, guide and screenshots.

## Open questions

1. **Folding parts in a long book.** **Recommendation:** any part can fold by clicking its name. The part with the open chapter opens by itself, and what's folded is remembered per book in app data.
2. **Compact gallery cards.** **Recommendation:** automatically, when a kind has more than 12 pages. Below that, the full cards as now.
3. **The logo's gold in light mode.** **Recommendation:** mix it from the existing tokens (`mark` with a little `text`), so there's no new colour, and add it to the contrast test.
4. **The collapse shortcut.** Ctrl+B is bold, so it can't be that. **Recommendation:** Ctrl+\ (⌘\), as in Notion. Ctrl+Shift+F stays Focus.
5. **The start screen.** **Recommendation:** in this milestone only the logo and spacing match the mockup. Its new-project flow changes with the templates (Milestone 19).
6. **Aa outside Write.** **Recommendation:** Aa sets text size and page width for every page (World pages and outline Text too), so it's always meaningful. On the board and gallery it stays, for the pages they open.

## Results

### What the author can do

- See the same top bar in Write and Story: the book, Story | Write, the save status, **Aa** and ☰. In Story the status is that of the page or outline text open.
- Use one sidebar in both workspaces, with one label style. Parts, Plot and World fold; a folded part shows its chapter count; the open chapter's part stays open; folds are remembered per book.
- Collapse the sidebar the same way in both workspaces: the toggle at the start of the header row, or **Ctrl+\\** (⌘\\).
- Read the open item in one header row: "Part One · Chapter 2" with the chapter's `⋯` (the same actions as its row), "Main story" with Board · List · Text and `⋯`, "Characters › Bea Halmi" with the page's `⋯`.
- Format from a labelled **Format** button at the top corner of every page to write on: chapters, World pages and outline Text. **References** has its word, and only its icon under about 1100 px.
- Use Focus as the sidebar and shelf put away, with the top bar and header row quiet until reached.
- On the board, see a card's or column's `⋯` only on hover or keyboard focus; right-click and Shift+F10 open the same menu.
- Start a new book with one next step everywhere: "No chapters yet" and **New chapter**; "Start writing here." on an empty page; "No outline yet" and **New outline**; "No characters yet" (or places, or notes) and **New character**.
- Browse a kind with more than 12 pages as compact cards (name and one line).
- See the logo's gold line a shade darker on the light desk.

### Changed from the plan while building

- **Write with no chapters** got its own empty state; the mockup assumed a template's first chapter, but a new project starts with none.
- **"Edit as plain text" moved from a page's `⋯` into Format**, so each command has one place. The outline's `⋯` keeps it for the board, which has no Format.
- **Folded parts are remembered in the app's own browser storage**, keyed by the book's folder, which Electron keeps in the app's data folder. Nothing is written to the book.
- **Pages and outline Text start their first line below Format**, since their margins are narrower than a chapter's. On a chapter, Format sits in the page's corner; once scrolled, it can sit over the end of a long first visible line.
- The scroll fade at the bottom of a long sidebar, drawn in the mockup, isn't built: the list scrolls as before.

### Found and fixed by the tests

- A test's typing helper clicked the middle of a wrapped paragraph, landing on its first row; it now clicks the last row.
- An empty gallery no longer had the dashed "New character" card the tests used; the empty state's button has the same name and test ID.

### Tests

- `pnpm lint`, `pnpm typecheck`: clean.
- `pnpm test`: 71 files, 1106 tests passed. `pnpm arch`: 157 passed. `pnpm perf`: 7 passed. `pnpm build`: clean.
- `pnpm e2e` (whole suite): 104 passed, including the new `main-screen.e2e.ts` (9 tests): the same sidebar and bars in both workspaces in English and Hebrew; collapse by button and Ctrl+\\; Focus; Format on every page to write on and nowhere else, by keyboard; References at 1280 and 960 px; card menus by hover, right-click and Shift+F10; a new book's empty states; a 60-chapter book's folding parts, remembered after a restart.
- Screenshots retaken (`pnpm site:screenshots`, 4 passed) and checked by eye; docs site built, `pnpm site:test` 10 passed.

### Known limitations

- The long sidebar's scroll fade (above).
- Format can cover the end of a chapter's first visible line while scrolled.
- The new Hebrew wording is listed for review in `docs/reviews/hebrew-wording-milestone-16.md`.
