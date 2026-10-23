# U1a: Simplicity audit

**Status:** draft for the writer's review (2026-10-23). Part of roadmap U1. The glossary,
information architecture and visual system are in [glossary.md](glossary.md) and
[redesign.md](redesign.md).

## How this was done

- **Screens:** the [preview harness](../../development.md#design-previews) ran the real
  interface on invented sample data. It captured 17 scenarios in English and Hebrew, which are in
  [`screens/`](screens/) as `<scenario>.<en|he>.png`, at 1440×900, dark theme (the only theme
  today).
- **Controls nobody sees on screen** were read from the code: native menus, palette commands,
  keyboard shortcuts, and font and shape declarations.
- **Sessions walked:** writing a chapter, revising beside another, and plotting on the board, in
  both languages.

## The short version

The page itself is good: prose type, the dark room, and focus mode are calm and readable
([focus.en](screens/focus.en.png)). Clutter lives **around** the page:

- **A crowded top bar** with 15 controls, several naming the same idea "write".
- **Three bars of chrome** above the page: the top bar, document-tab actions, and the cast strip.
- **Two docks** whose headers each carry two unlabelled ⋯ menus and an "Expand".
- **A Properties form** that takes a third of the window while you write.
- **Names that disagree:** one panel is called two things, and one word means three things.
- **Visual drift:** 21 font sizes, 8 corner radii, and 20 unstyled native controls.

## Inventory by surface

How often each is needed: **A** always, **S** sometimes, **R** rarely. The last column says where
else the same thing can be done.

### Top bar ([writing.en](screens/writing.en.png))

| Control | Label (en / he) | Need | Also reachable from |
|---|---|---|---|
| Wordmark and project title | Plot·Device, *The Salt Orchard* | A (orientation) | window title |
| Breadcrumb | Part › Chapter › Title | A | binder selection, document tab |
| Mode switch | Writing \| Plotting / כתיבה \| עלילה | S | palette |
| View tabs | Write, Overview, Timeline, Interactions / כתיבה, מבט־על, ציר הזמן, מפגשים (Board, Text in Plotting) | S | View menu, palette |
| Layout select | Write ▾, Revise ▾ (native select) | R | palette ("Use the … layout") |
| Layout ⋯ menu | save, rename, delete, reset, show closed views | R | none |
| Binder toggle (icon) | (tooltip: Binder) | S | View menu, Ctrl+\\, palette |
| Inspector toggle (icon) | (tooltip: Inspector) | S | View menu, Ctrl+Shift+I, palette |
| Focus (icon) | (tooltip) | S | View menu, Ctrl+Shift+F, palette |
| Interface language | Interface language: English ▾ | R (once) | welcome screen |
| Incomplete-translation note (he) | התרגום בפיתוח ◂ | R | none |
| Close project | Close project / סגירת הפרויקט | R | none |

### Document tabs ([writing.en](screens/writing.en.png))

| Control | Need | Also reachable from |
|---|---|---|
| Tab chip with a "WRITING" prefix on the Writing target | A | none |
| Return to writing (text) | S | Ctrl/Cmd+Shift+Enter, palette |
| Pin (text) | R | none |
| Close other unpinned (text) | R | none |

All three text actions are visible even when only one tab is open.

### Docks and panels ([writing.en](screens/writing.en.png), [dock-menu.en](screens/dock-menu.en.png), [cards.en](screens/cards.en.png))

| Control | Need | Notes |
|---|---|---|
| Dock tabs: Manuscript, Codex / Properties, Outline, Reference (+ Cards, Chapter) | S | Uppercase tracked labels. The end dock's tabs run into its controls (see F5). |
| Two ⋯ buttons per dock header | R | Unlabelled and side by side: one for the area, one for the section. The menu offers "Add Needs attention", "Add Cards", "Add Chapter", "Show stacked". |
| Expand | R | A text button in every dock header. |
| Binder rows: number, title, word count, an open-beside icon on every row, + on parts | A / S | The open-beside icon has no label. "part not found" is shown in the row. |
| Binder footer: "Manuscript 10 words" | R | Duplicates the status bar. |
| Properties form: Part, Order, Move up/down, Title, Status, Point of view, Characters, Location, Threads, Story date, Story time, Synopsis | S | Always fully expanded; empty fields show "Add…" and "YYYY-MM-DD". |
| Reference empty state ("Keep the story close") | R | Shown in Plotting, where Reference is the first end tab. |

### Above and below the page

| Control | Need | Notes |
|---|---|---|
| Cast strip "IN THIS CHAPTER" with chips and a × | S | A third bar above the page. The × sits far from the chips. |
| Bottom shelf "NEEDS ATTENTION" (Revise) | S | Visible even when empty ([revise.en](screens/revise.en.png)). |
| Status bar: words in chapter, in part, in manuscript; Aa Appearance; Saved | A (save state) / S | Three counts. "Manuscript" is repeated from the binder footer. |

### Center views

| View | Notes |
|---|---|
| Overview, Timeline, Interactions ([overview.en](screens/overview.en.png)) | Each repeats its name as a large heading under the top bar's breadcrumb, which already shows it. Filters are native selects. |
| Board ([board.en](screens/board.en.png)) | Its header reads "Outline" with a keyboard hint. The **Inbox column is cut off** at the edge, and in Hebrew the first column is cut instead ([board.he](screens/board.he.png)). Each card's ⋯ and "+ Add card" appear on hover. |
| Split ([revise.en](screens/revise.en.png)) | READ-ONLY, Lock, Write here, ×: clear, and well placed. |

### Overlays

| Overlay | Notes |
|---|---|
| Palette ([palette.en](screens/palette.en.png)) | With nothing typed it lists 22 items: 9 "Show …" views, 2 layouts and commands. Names leak internals ("Show In this chapter", "Show Chapter", "Show Needs attention"). |
| Peek ([peek.en](screens/peek.en.png)) | Pin, open-beside icon, Open beside, Edit: four actions for a quick look. |
| Capture ([capture.en](screens/capture.en.png)) | Calm, and a model for small dialogs. |
| Writing appearance ([appearance.en](screens/appearance.en.png)) | Checkbox labels sit far from their boxes and wrap. The "Experimental" fieldset is a box inside a box. |

### Welcome and new project ([welcome.en](screens/welcome.en.png), [initialize.en](screens/initialize.en.png))

- The welcome screen is calm.
- On the initialize screen:
  - the interface-language picker floats above the heading;
  - the heading falls back to Times, a different face from the rest of the app;
  - the book-language select is an unstyled native control.

### Native menus, palette and shortcuts (not visible on screen)

- **View menu:** Toggle Binder (Ctrl+\\), Toggle Inspector (Ctrl+Shift+I), Toggle Outline
  (Ctrl+Shift+O), Focus (Ctrl+Shift+F), Command Palette (Ctrl+K); then Write, Overview,
  Timeline, Interactions.
- **App shortcuts:** Escape leaves focus; Ctrl+S saves; Ctrl+Tab and Ctrl+Shift+Tab cycle tabs;
  Ctrl+Shift+Enter returns to writing; Ctrl+W closes the tab.
- **Context shortcuts:**
  - Alt+Enter peeks a link;
  - Tab accepts a link suggestion;
  - F2 renames a card;
  - Alt+arrows move cards and columns;
  - arrows move between cards.
- **What's missing:** shortcuts appear only in two tooltips and the menu. Nothing in the
  interface teaches the rest.

## Findings

**F1. "Write" means three things.**
- The mode switch says *Writing*, the first view tab says *Write*, and the layout select says
  *Write*.
- The Writing target's document tab says *WRITING*, and there is a *Return to writing* command.
- In Hebrew the mode and the tab are the same word, *כתיבה*, side by side
  ([writing.he](screens/writing.he.png)).
- In Plotting the same tab becomes *Text* while it still opens the editor.

**F2. One thing, two names.**
- *Binder* (button tooltip, menu) vs *Manuscript* (tab).
- *Inspector* (button, menu) vs *Properties* (tab).
- *Needs attention* (shelf) vs *warnings* (code and messages).
- *Chapter* (tab) vs *scene card* (code) vs *chapter card* (docs).
- *In this chapter* (strip) vs *cast* (code and docs).
- *Outline* is a panel, a file type, and the board's heading.

**F3. Concepts are never explained.**
- *Mode*, *layout*, *view*, *panel*, *dock*, *area* and *section* all reach the screen. For
  example, the ⋯ menu says "Add Needs attention" and "Show stacked".
- Nothing says what a layout is, or how it differs from a mode.

**F4. The top bar does too much.**
- 15 controls in one row.
- The breadcrumb is squeezed until it is cut at the start ("ne: The Orchard").
- A once-only setting (interface language) and the incomplete-translation note take permanent
  space.
- Three icon buttons have no visible labels.

**F5. Dock headers are noisy and overflow.**
- Two unlabelled ⋯ buttons sit side by side, followed by "Expand".
- With four or five tabs, the end dock's tab labels run into its controls: "REFERENCE‑",
  "CARDSExpand", "CHAPTERExpand" ([cards.en](screens/cards.en.png), [revise.en](screens/revise.en.png)).

**F6. Three bars of chrome before the first sentence.**
- The top bar, the document-tab actions, and the cast strip.
- The tab actions are visible even with a single tab.

**F7. Properties dominates the writing view.**
- A 12-field form, always expanded, in the end dock's first tab.
- Most fields are empty while drafting.
- Move up/down and Order duplicate the binder's drag and drop.

**F8. Unlabelled and repeated row icons.**
- An open-beside icon sits on every binder row, with no label.
- The peek has both an icon and "Open beside".
- "part not found" shows the internal reason, not a human one.

**F9. The board overflows.**
- Three columns don't fit beside two docks. The Inbox is clipped in English and the first column
  in Hebrew, with no visible scroll cue.
- Its heading reads "Outline", not the outline's name.

**F10. No visual system.**
- 152 font-size declarations in 21 sizes (9–36 px, mixed with rem and em).
- Corner radii of 2, 4, 5, 6, 7, 8, 10 and 999 px.
- 14 native selects, 4 checkboxes and 2 ranges, unstyled or styled differently from each other.
  The top bar's layout select is a bright native control in a dark bar.

**F11. Inconsistent typefaces.**
- The initialize screen's heading falls back to Times.
- The view headings use the prose face; panel titles use uppercase tracked UI type.

**F12. Repeated information.**
- Word counts appear in the binder rows, the binder footer, the status bar (three counts) and
  the board cards.
- View names appear twice: breadcrumb and heading.

**F13. The palette shows internals.**
- 22 unranked items with an empty query.
- "Show In this chapter" and "Show Chapter" read as code.
- Layouts are listed beside views without saying what a layout is.

**F14. Small forms are misaligned.** The appearance popover's checkboxes and labels sit far
apart, and the labels wrap ([appearance.en](screens/appearance.en.png)).

**F15. Hebrew-specific issues.**
- Identical labels for the mode and the tab (F1).
- The note sits under the language picker in every project.
- Otherwise mirroring is right: docks, the binder, the board's column order, the status bar.

### What works and should be kept

- The prose page: Literata, the measure, the dark warm palette, link styling.
- Focus mode: chrome gone, one quiet "Leave focus (Esc)".
- The split's header: READ-ONLY, Lock, Write here.
- The capture box: one field, one line of help.
- Cards on the board: a thread stripe *with* a name, and chapter facts in one quiet line.
- Keyboard reach: almost everything has a key, or a menu path.

## Walkthroughs

**Writing a chapter** ([writing.en](screens/writing.en.png))
- Before typing: open the project, pick a chapter in the binder, and the page appears between two
  docks under three bars.
- Showing the outline beside the draft can be done four ways: the top-bar icon, the View menu,
  Ctrl+Shift+O, or the end dock's Outline tab. Only the tab says "Outline".
- Reaching a quiet page means knowing focus mode exists. Its icon is unlabelled.

**Revising beside another chapter** ([revise.en](screens/revise.en.png))
- Switch the layout select to "Revise". Nothing on screen explains what changes.
- A split opens, a fifth end tab appears and overflows, and an empty "Needs attention" shelf takes
  the bottom of the page.

**Plotting** ([board.en](screens/board.en.png), [board.he](screens/board.he.png))
- Switch to Plotting: the view tabs change meaning (Board, Text), the end dock changes order
  (Reference first), and the board's last column is cut off.
- A card's actions hide behind a hover ⋯ (fine), and "+ Add card" is discoverable only by hover
  or Tab.

**In Hebrew** ([writing.he](screens/writing.he.png), [board.he](screens/board.he.png))
- The layout mirrors correctly.
- "כתיבה" appears three times in the top bar, and the translation note is always there.
