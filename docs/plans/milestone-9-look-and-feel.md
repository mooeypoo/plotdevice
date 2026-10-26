# Milestone 9: A calmer, more beautiful Plot Device

Status: **Built and committed** (2026-10-26), on branch `milestone-9/look-and-feel`; feedback rounds continue. Results are at the end of this document. Approved by the owner on 2026-10-26, after choosing from three clickable mock-ups (the "Lamplight" direction, with changes; see Decisions).

## Goal

Plot Device looks corporate and square, and shows about fifteen bordered buttons at once. This milestone gives it a calm, warm, writer-first look, built from the logo's ink, cream and gold, and moves every control that isn't needed all the time into a few clear menus.

**Out of scope:** dimming the controls while typing (decision 9), a choice of writing font, renaming "project" to "book" in the interface, and Windows/macOS-specific window chrome.

## What the author will see

- **One top bar.** On the left, the logo and the book's title; the title opens the **book menu**. In the middle, **Story | Write**. On the right, "Saved", **Aa** (in Write: text size, page width, focus mode) and **☰** (the app menu: open a project, Settings, About).
- **No File / Edit / View / Window bar** on Linux and Windows. On macOS, which always shows a menu bar, it holds only what macOS needs (decision 6).
- **Write:** the page floats on a darker desk under a soft warm glow, with no indented paragraphs. The toolbar is gone; selecting text shows a small formatting bubble. Two quiet icons at the page's edges show and hide the chapters and the references.
- **Chapter list and Story sidebar:** sit on the desk with no border. Part names are italic; the open chapter has a gold thread beside it. "New chapter", "New part", "New character" and the rest are quiet `+` links, not buttons.
- **Story:** the outline's title is renamed by clicking it; Undo, Rename and Versions move to a `⋯` menu beside Board / List / Cards. Cards are clean: a surface, a soft shadow, gold-underlined links.
- **Welcome:** the logo, large, its gold line drawing itself once (still for people who ask for reduced motion), then New project, Open project and the recent projects.

## Decisions

1. **Palette.** Teal is gone. The colours come from the logo. Every pair is checked by the automated contrast test (4.5:1 for text, 3:1 for marks, icons and focus rings); four light colours were deepened so they pass on the darker light desk.

   | Token | Light | Dark | Used for |
   |---|---|---|---|
   | `app` | `#E8E4DC` | `#101114` | The desk: window background |
   | `card` | `#FFFFFF` | `#222227` | Menus, dialogs, cards |
   | `page` | `#F8F6F1` | `#1A1A1E` | The writing page |
   | `well` (new) | `#E0DBD0` | `#2A2620` | Selected rows, segmented controls |
   | `text` | `#1D1E23` | `#E9E2D3` | Text |
   | `textSecondary` | `#5C5B5E` | `#9C9483` | Labels, quiet text |
   | `accent` | `#2C3E63` ink blue | `#E0B66E` gold | Links, selected text, primary buttons |
   | `onAccent` | `#FFFFFF` | `#101114` | Text on `accent` |
   | `mark` (new) | `#8C6A2C` | `#B88E45` | The gold thread, `+` signs, bullets, scene breaks |
   | `warning` | `#844E1E` | `#E0AB76` | Warnings, always with words |
   | `focus` | `#2E62B8` | `#9CBFF8` | Keyboard focus rings |
   | `plotAmber` | `#9A6A26` | `#E3B77E` | Plot and card colour |
   | `plotPlum` | `#8C628C` | `#C4A0D2` | Plot and card colour |
   | `plotTerracotta` | `#A55D44` | `#E4A186` | Plot and card colour |

2. **Type.** Literata for prose and titles; Instrument Sans for the interface. Hebrew falls back, letter by letter, to Noto Serif Hebrew and Assistant, which are drawn to sit beside them. All four are under the SIL Open Font License 1.1, which allows bundling them in a GPL app. They come from the `@fontsource-variable` packages and are bundled into the app (the Content-Security-Policy allows only the app's own fonts), so they appear in About's licence list automatically. One family per role, everywhere.
3. **The writing page** is Lamplight's: a centred chapter heading, paragraphs separated by space rather than indented, gold scene breaks.
4. **The sidebars** are Paper & Ink's: on the desk, no border; italic part and section names; the selected row on `well` with a gold thread.
5. **Wording.** "Compile book…" becomes **"Export book…"** ("ייצוא הספר…"). Hebrew says **סיפור** rather than **רומן** ("מקום שקט לכתוב בו את הסיפור שלך.").
6. **Menus are the app's own.** Linux and Windows show no menu bar. They keep a small hidden menu, used only for its shortcuts: zoom (Ctrl+= and Ctrl+−, which Electron's default menu provided, and which people who need larger text rely on) and full screen; development builds add reload and developer tools. On macOS, which always shows a menu bar, it also holds the app menu (About, Hide, Quit), Edit (Undo, Redo, Cut, Copy, Paste, Select All: without these, the standard clipboard shortcuts don't work in Electron) and Window. Settings opens with Ctrl+, (⌘, on macOS) from the app itself. The menu template is a pure function with a unit test.
7. **Settings** become a small dialog (language and theme), opened from ☰. Text size and page width move to **Aa**, beside the page they change.
8. **Formatting.** Selecting text shows a bubble: Bold, Italic, Link, Quote and `⋯` (heading, lists, scene break, paragraph and phrase direction). With nothing selected, the same full menu is under a `¶` icon at the page's edge, so every command is reachable by keyboard and without a selection. The editor's keyboard shortcuts are unchanged.
9. **Dimming the controls while typing** is left for later. If it comes back, it is a setting, off by default, that fades the top bar and chapter list only slightly and never the references.
10. **The window icon** on Linux comes from the brand PNGs (development builds showed Electron's icon).

## Files

- **Theme:** `packages/ui-vue/src/theme/tokens.ts` (palettes, `well`, `mark`), `contrast.ts` (checks for the new tokens), `styles/base.css` (rewritten), `styles/fonts.css` (new).
- **New components:** `TopBar.vue`, `BrandMark.vue`, `AppearancePanel.vue`, `SettingsDialog.vue`, `FormatBubble.vue`, `PopoverPanel.vue`.
- **Changed components:** `App.vue`, `MenuButton.vue` (a custom trigger), `WritingView.vue`, `ChapterNavigator.vue`, `StoryView.vue`, `WelcomeView.vue`, `ReferenceShelf.vue`, `OutlineBoard.vue`, `OutlineCard.vue`; `SettingsMenu.vue` and `WorkspaceSwitch.vue` are replaced.
- **Editor:** `packages/editor-codemirror/src/chapter-editor.ts`: the prose font, and reports where the selection is so the bubble can sit above it.
- **Host:** `apps/desktop/src/main/index.ts` and a new `app-menu.ts`: the menus and the window icon.
- **Words:** `packages/i18n/src/messages/en.json`, `he.json`.
- **Docs:** `DESIGN_SYSTEM.md` (palette, type, shapes), `UX_SPEC.md` (the colour line still names "Literary Teal"), this plan.

## Tests

- **Contrast:** the existing test checks every pair in both palettes; it gains `well` (text on it) and `mark` (3:1 on every surface).
- **Menus (unit):** Linux and Windows get no menu; macOS gets only the three menus, with the Edit roles.
- **End to end:** the existing tests are updated for the new controls (Settings through ☰, text size through Aa, formatting through `¶`, Export and Versions through the book menu, Undo through `⋯`). New tests:
  - Linux has no native menu bar.
  - The book menu, Aa and ☰ open, work by keyboard (arrows, Escape returns focus) and close on a click outside.
  - Selecting text shows the bubble, and Bold from it bolds the selection.
  - Changing the text size in Aa keeps the editor, cursor and undo history (no remount).
  - Hebrew: the top bar and sidebars mirror, and the selected chapter's thread is on the right.
- **Screens:** screenshots of Welcome, Write and Story in both themes and both languages, checked by eye.

## Work order

1. Palette, fonts and contrast test.
2. Top bar, menus, Settings dialog, Aa panel; native menus and icon.
3. Write: the page, edge icons, formatting bubble.
4. Sidebars and Story.
5. Welcome.
6. Words, docs, the full check, screenshots and results.

## Results

| Check | Result |
|---|---|
| `pnpm lint` | OK |
| `pnpm typecheck` | OK |
| `pnpm test` | **807 tests pass** (804 before) |
| `pnpm arch` | **98 checks pass** |
| `pnpm perf` | **4 limits pass** |
| `pnpm build` | OK; About lists 157 open-source packages, now including the four fonts |
| `pnpm e2e` | **50 end-to-end tests pass** (46 before) |

**What the tests prove:**
- **Contrast:** every text colour passes 4.5:1, and every mark, focus ring and plot colour passes 3:1, on all four surfaces in both themes.
- **Menus:** Linux shows no menu bar, and its hidden menu has only View (zoom, full screen). macOS gets only the app, Edit, View and Window menus. The book and app menus open from the keyboard on their first item, follow the arrow keys, close on Escape with focus back on their button, and close on a click outside.
- **Formatting:** selecting text shows the bubble; its Bold bolds the selection in the saved file; with nothing selected, the bubble is gone. Every format and direction command is also under ¶.
- **No remount:** a larger text size from Aa, then focus mode, then a theme and language change all keep the same editor, cursor and undo history.
- **Right to left:** in Hebrew the top bar mirrors, and the open chapter's gold thread is on the right.
- **The existing tests** were updated only for where controls moved: Settings is under ☰, Export and chapter versions under the book menu, Undo under the outline's ⋯, text size under Aa, and direction under ¶.

**Where the work differs from the plan:**
- **The native menu isn't removed outright** (decision 6): removing it would also remove the zoom shortcuts. Linux and Windows keep a hidden menu for its shortcuts only.
- **The app menu has no "Settings" in macOS's native menu;** Ctrl+, (⌘,) opens Settings from the app itself, so no new message between the window and the app was needed.
- **Hebrew titles stay upright:** the italic serif titles would otherwise be a slanted copy of Hebrew letters.
- **Screenshots** are taken through Electron (`capturePage`): Playwright's screenshot stalled with a menu open, though the page kept responding.

**Not done, needs the owner:**
- **The font licences:** the four fonts are under the SIL Open Font License 1.1; the design system asks for the owner's licence review before bundling fonts.
- **Committing and pushing** this branch.
- **Trying it** with `pnpm demo` and `pnpm demo he`.

**Left for later:** dimming the controls while typing (decision 9), a choice of writing font, and calling a project a "book" throughout.


## First round of feedback (2026-10-26)

| Asked | Done |
|---|---|
| Icons in the formatting menu | Every format and direction command has an icon (bold, lists, scene break, paragraph and selection direction). |
| About: the author, the documentation, the logo | About shows the logo, "Made by Moriel Schottlender" linking to https://moriel.tech, and "Help and documentation" linking to https://mooeypoo.github.io/plotdevice/ (also in the app menu). Only these two sites open, in the person's browser; every other link stays refused (`external-links.ts`, unit-tested). |
| Board: dragging seemed not to work | It worked, but a card dropped on another card went *before* it, so dropping on the card below changed nothing. Now each card's top half means "before it" and its bottom half "after it", a gold line shows the gap while dragging, and the dragged card fades. |
| Drag and drop in the chapter list | The same, with the same line. Below a part's last chapter is inside the part; above the next entry is outside it. A chapter dragged from "On the side" goes into the book where it's dropped. |
| References search: something to start from | Focusing the empty search lists up to eight pages, characters first, then places and notes, leaving out what's already on the shelf. |
| A dedicated pin button | Each reference card has a pin toggle (gold when pinned); pinning left the `⋯` menu. |
| Menus cut off at the window's edge | Every menu and panel measures itself on opening and opens the other way, or upwards, when it would run past the window's edge. |
| "Remove from book" sounds final | Now "Move for later" ("שמירה להמשך"), and the section it goes to is "On the side" ("בצד"), owner's choice. |
| Reference details showed raw Markdown | Details now show as formatted text: headings, paragraphs, lists, quotes and code (`detailBlocks`, unit-tested), with links underlined; never as HTML. |

**Tests:** 824 unit tests (17 new: where a dropped chapter or card lands, and which links may open); 56 end-to-end tests (6 new: reference details shown formatted, a card and a chapter dragged with the line showing, the search's starting list, a menu kept inside the window, About's links and the formatting icons). Turning off the menu's flip makes its test fail. One older test now drops on a card's top half, as the new rule asks.
