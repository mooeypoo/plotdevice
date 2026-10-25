# U1c–e: Redesign plan — simple by default, everything one step away

**Status:** approved by the writer (2026-10-23), with D6 added. Inputs: [audit.md](audit.md)
(findings F1–F15) and [glossary.md](glossary.md). See the clickable
[mock-ups](mockups.html).

**The principle (writer, 2026-10-22).** The interface should be beautifully simple, with advanced
features easy to reach but never cluttering the page. Prioritise features *with* simplicity.

**Three tiers:**
- **Always visible:** only what you need every minute.
- **One step away:** a single labelled button, the ⋯ menu, or Go to… (Ctrl+K).
- **Advanced:** inside menus, never on the page.

Every keyboard path and every RTL guarantee (ADR 0016) is kept.

## Decisions that need the writer

**D1. The two modes divide the work.**
- **Write** is the page and its panels; nothing else.
- **Plot** is where you look at the whole story: **Board · Overview · Timeline · Interactions**.
- This removes the view tabs from Write (F1, F4). The "Text" tab goes: the board's header gets
  **Edit as text**, which opens the outline on the page in Write mode.
- *Recommended.* The alternative keeps the view tabs in both modes, renamed, which leaves the top
  bar crowded.

**D2. Settings leave the project's top bar.**
- Interface language, the translation note, layouts and Close project move into one **⋯** menu
  (Settings, Layout ▸, Close project).
- Interface language stays on the welcome screen too.
- *Recommended.*

**D3. Board items are beats.** "+ Add beat" and "Beat actions", so "card" means only a pinned
entry. *Recommended.*

**D4. What Standard (the default Write layout) opens with.**
- Manuscript on the near side.
- **Outline** first on the far side, then Details, Reference and Cards.
- Details becomes compact (see the panels section below).
- *Recommended,* because writers read the outline more than they edit keys while drafting.

**D5. Parts and columns are both one click away** (writer, 2026-10-23).
- The Manuscript side keeps **+ New part** beside **+ New chapter**, as today. Parts are crucial
  to a book's structure and must never be hidden.
- The board gains **+ Add column** after the last column, before the Inbox. It adds one `##`
  heading to the outline, named in place, with no trip to Edit as text.
- Columns are the outline's headings, not parts. If no part has the new column's name, the board
  offers to create that part too.
- Columns can be collapsed, and Go to… jumps to a column, so a book with ten parts stays
  readable.

**D6. "Details", not "Properties"** (writer, 2026-10-23).
- The panel with an entry's keys is called **Details** (he **פרטים**). "Properties" is a
  software word; writers know "details".
- **Edit details** opens it for an entry from wherever the entry shows as a card: its peek, its
  card in Cards, the Chapter card, and its Manuscript row's menu.
- Board beats aren't entries, so they don't get it yet; that waits for the Plot Board rethink.

## Information architecture

### Top bar (one row, fewer controls)

```
Write mode:  [◆ The Salt Orchard]  Part One › The Ferry            (Write | Plot)  [⌕ Go to…  Ctrl K]  [◧] [◨] [⛶] [⋯]
Plot mode:   [◆ The Salt Orchard]  (Board · Overview · Timeline · Interactions)  (Write | Plot)  [⌕ Go to…]  [◧] [◨] [⋯]
```

- **The project name** stands alone. The wordmark lives on the welcome screen only.
- **The breadcrumb** never truncates the start: the part ellipsises first, then the chapter.
- **The mode switch** is a two-segment pill, the only "Write" on screen (F1).
- **Go to… is visible,** a quiet search field with its shortcut, so the palette is discoverable.
- **Side toggles** are icons, with visible labels on wide windows (≥1280 px) and tooltips with
  shortcuts. **Focus** shows only in Write.
- **One ⋯ holds the rarely-needed:** Settings (interface language, appearance, experimental),
  Layout ▸ (Standard, Side by side, Board, saved; save/rename/reset), and Close project.

**Count:** 15 controls today → 8 in Write, 9 in Plot.

### Below the top bar

- **Document tabs show only when two or more documents are open** (F6).
  - Each tab's actions (Pin, Close, Close others) are in a hover ⋯.
  - **Back to your chapter** appears as one pill, only while the page shows something else.
- **"In this chapter"** becomes a quiet line under the chapter heading (`Ilka · Marrow`), not a
  bar. It's still a panel you can move or hide from ⋯.
- **Needs attention** is a count on the status bar (`⚠ 2`) that opens the panel. The shelf no
  longer takes space when it's empty (F12).

### Sides and panels

- **Panel headers** have tabs and **one** ⋯. That ⋯ merges the side and panel menus and
  Expand/Restore. Double-clicking the inner edge also expands it (F5).
- **Tab overflow:** after three tabs, the rest go into a "More ▾" tab, and labels never collide.
- **The Manuscript list:**
  - row icons appear on hover or focus, with labels in a tooltip;
  - "Open beside" moves into each row's menu;
  - the footer count goes, because the status bar has it (F8, F12).
- **Details, compact** (F7):
  - **Status · Point of view · Threads · Synopsis** are always shown;
  - **Placement** (part, order, title) and **Story time** (date, time) are collapsible groups,
    closed by default;
  - empty optional fields are a quiet "+ Add point of view", not an empty box;
  - Move up/down stays in Placement.
- **The peek** has three actions: **Pin · Open beside · Open** (F8).

### The center

- **Write:** the page, with up to two splits. Focus hides everything but the page, as today.
- **Plot:**
  - The board's header is the **outline's name** (a chooser if several) and **Edit as text**.
    The keyboard hint moves into a "?" popover.
  - **Columns fit:** the board scrolls horizontally with soft edge fades and starts at the first
    column in both directions, so the Inbox is never silently clipped (F9).
  - **+ Add column** sits after the last column, before the Inbox (D5). It needs a new outline
    planner, "add a heading", built like `addBeat` (a version-checked line splice).
- **Overview, Timeline, Interactions** keep their own heading. The breadcrumb shows nothing for
  them, so the name appears once (F12).

### Status bar

- Three things: **words in this chapter** (hover shows part and book), **⚠ Needs attention** when
  there's something, and **Saved**.
- **Aa Appearance** moves into the ⋯ menu's Settings. It stays one keystroke away in Go to….

### Go to… (the palette)

- With nothing typed:
  - **Recent** (open documents);
  - **Suggested** (Plot/Write, Focus, Capture if on, Show Outline);
  - grouped headers.
- **Names follow the glossary:** "Show Chapter card", not "Show Chapter" (F13).
- **Layouts** are listed under "Layout".

## Visual system (ADR 0021, proposed)

Built on today's palette, which the audit found works. The goal is fewer, deliberate values.

### Type

- **UI typeface:** IBM Plex Sans and Plex Sans Hebrew.
- **Prose typeface:** Literata, with Frank Ruhl Libre for Hebrew. Every heading on every screen
  uses one of the two; there is no Times fallback (F11).

| Role | Size / line height | Use |
|---|---|---|
| caption | 11 / 16, tracked uppercase | panel group labels |
| small | 12 / 18 | secondary text, counts, hints |
| body | 13 / 20 | UI default |
| title | 15 / 22, 600 | panel titles, card titles in UI |
| heading | 22 / 28, prose face | dialog and view headings |
| display | 32 / 40, prose face | welcome, Overview/Timeline headings |
| prose | 19 (writer's choice 14–28) | the page |

This replaces 21 sizes.

### Space, shape and surfaces

- **Spacing steps:** 2, 4, 8, 12, 16, 24, 32, 48. Nothing in between.
- **Three radii:**
  - **6** for fields, buttons and menu items;
  - **10** for cards, popovers and menus;
  - **pill** (999) for the mode switch, segmented tabs, chips and tags.
- **Surfaces, dark:** `bg #141518` → `panel #17181c` → `raised #1e1f24` → `hover #22232a`. Lines are
  `#222328` and `#2c2d33`.
- **Surfaces, light** (new, same roles):
  - grounds: `bg #f7f4ee` → `panel #f1ede5` → `raised #ffffff` → `hover #ebe5da`;
  - lines: `#e3dccf` and `#d3cab9`;
  - text `#2a2722`, prose `#24211c`, muted `#6c665c`;
  - accent `#9a6a1c` (passes 4.5:1 on light grounds).
- **One accent:** amber `#d8b26e` in dark, `#9a6a1c` in light, for the selected, the primary and
  the focus. Status and link colours keep their meanings and are rechecked for contrast in light.
- **Elevation:** menus and popovers get one shadow and a 1 px line. There are no other shadows.

### Controls (one shared component each)

- **Select:**
  - a button that shows the value with a chevron, opening a listbox popover;
  - typeahead, arrows, Home/End, and Escape;
  - mirrored in RTL, with `aria-activedescendant`.
  - It replaces all 14 native selects (F10).
- **Checkbox and Switch:** a switch for settings that apply at once (appearance, experimental),
  and a checkbox in forms. The label always sits next to the control (F14).
- **Range:** a styled track and thumb, with the value shown and arrow-key steps.
- **Button:** primary (filled amber), quiet (text), ghost (outline), and icon (with a required
  accessible name and tooltip).
- **Text field and text area:** one height scale (28 / 32 px), and one focus ring: a 2 px accent
  outline at a 2 px offset, never removed.
- **Menu:** labelled items with their shortcut on the trailing side, separators, and submenus
  for Layout ▸.

### Icons and motion

- **Icons:** one set, 18 px, with a 1.6 px stroke and round joins. Directional icons mirror in
  RTL. An icon whose meaning isn't obvious gets a visible label.
- **Motion:**
  - 120 ms ease-out for hover and fade;
  - 180 ms for panels opening and the mode switch;
  - none at all under `prefers-reduced-motion`.

### RTL rules

- Logical properties only.
- Panel sides mirror.
- The board scrolls from inline-start.
- Shortcuts read "Ctrl+K" in both languages, isolated.
- Chevrons and arrows mirror; clocks and media icons don't.

## Implementation phases

1. **U3a Vocabulary.**
   - Catalog renames per the glossary, in en, he and qqq.
   - "Plot" and "Write" modes; Standard, Side by side and Board layouts.
   - Beats on the board.
   - The glossary moves into the translator guide.
   - No layout changes.
2. **U2a Tokens and controls.**
   - ADR 0021 accepted; tokens in `global.css` (dark, light to follow).
   - Shared Select, Checkbox/Switch, Range, Button, TextField and Menu in `shared/`.
   - The 14 selects, 4 checkboxes and 2 ranges are replaced.
   - A guard test fails on any native `<select>` or checkbox outside `shared/`.
3. **U3b Information architecture.**
   - The top bar (D1, D2), document tabs, the "In this chapter" line.
   - Panel headers with one ⋯ and overflow.
   - Compact Details, "Edit details" (D6), the status bar, Go to…'s empty state, the board's fit and header.
   - The board's **+ Add column** (D5), with its outline planner and tests.
   - Every change is behind the same stores and navigation, with existing keyboard paths kept and
     tested.
4. **U2b Beauty and light.**
   - The type and space scales applied everywhere, and designed empty and loading states.
   - The light theme, following the system or chosen in Settings.
   - Motion.
   - **A screenshot review** of every harness scenario in en and he, in both themes, before and
     after.

Each phase ends with lint, typecheck, tests, the app build, `npm run preview:capture`, and a
look at every screen.
