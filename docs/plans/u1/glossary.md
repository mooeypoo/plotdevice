# U1b: Glossary — one name per concept

**Status:** approved by the writer (2026-10-23). The en/he message catalogs follow it (implementation phase U3a), and it moves into the translator guide.

**How to read it.** The **name** is what the interface says, in English and Hebrew. *Not* lists
the names in use today that will go. Code may keep its internal names (`binder`, `scene-card`,
`area`) as long as the screen never shows them.

## The two modes

| Name (en / he) | What it is | Not |
|---|---|---|
| **Write** / **כתיבה** | Working on the prose: the page, with panels beside it. | "Writing mode" beside a "Write" tab and a "Write" layout (F1) |
| **Plot** / **עלילה** | Seeing the whole story: the board, Overview, Timeline, Interactions. | "Plotting" |

The mode switch is the **only** control named Write. Nothing else in the top bar repeats it.

## Places on screen

| Name (en / he) | What it is | Not |
|---|---|---|
| **Page** / **עמוד** | The writable editor in the middle, with the chapter you are writing. | "document", "editor" (in the interface) |
| **Panel** / **חלונית** | One tool beside the page: Manuscript, Codex, Details, Outline, Reference, Cards, Chapter card, Needs attention. | "view", "section", "tab" |
| **Side** / **צד** | Where panels live: the side before the page, the side after it, and below. Mirrors in Hebrew. | "dock", "area", "shelf", "start/end" |
| **Layout** / **פריסה** | A saved arrangement of panels for one mode. Advanced; reached from the ⋯ menu. | presets named like modes ("Write", "Plot") |
| **Split** / **פיצול** | A second, read-only page beside yours. | "open beside" as a noun |
| **Focus** / **ריכוז** | The page alone, nothing else. | "Focus Mode" capitalised like a third mode |

**Layouts are renamed by what they arrange:**
- **Standard** / **רגילה** (was Write);
- **Side by side** / **זה לצד זה** (was Revise);
- **Board** / **לוח** (was Plot).

## Things in the book

| Name (en / he) | What it is | Not |
|---|---|---|
| **Manuscript** / **כתב יד** | Parts and chapters in reading order, and the panel that lists them. | "Binder" (button, menu), "קלסר כתב היד" |
| **Part**, **Chapter** / **חלק**, **פרק** | As in the file format. | |
| **Codex** / **קודקס** | Characters, places and notes, and the panel that lists them. | |
| **Entry** / **רשומה** | Any one file the app lists: a chapter, a character, a note. | "document", "item" |
| **Outline** / **מתווה** | Your planning file (`type: outline`). | the board's heading, which names the outline instead |
| **Board** / **לוח העלילה** | The outline shown as columns of beats. | "Plot board" in one place and "Board" in another |
| **Beat** / **נקודת עלילה** | One bullet of the outline: one item on the board. | "card" on the board (cards are pinned entries) |
| **Inbox** / **רעיונות** | The outline's column for captured beats (a book word, ADR 0019). | |
| **Thread** / **קו עלילה** | A plotline from `novel.md`. | |

## Panels

| Name (en / he) | What it is | Not |
|---|---|---|
| **Manuscript** / **כתב יד** | See above. | "Binder" |
| **Codex** / **קודקס** | See above. | |
| **Details** / **פרטים** | The chapter's or entry's keys: status, point of view, synopsis and the rest. A plain word for writers who don't think in "properties" (writer, 2026-10-23). | "Inspector" (button, menu), "Properties" |
| **Outline** / **מתווה** | The outline beside the page, highlighting your chapter. | |
| **Reference** / **עיון** | An entry read beside the page. | |
| **Cards** / **כרטיסים** | Entries you pinned, stacked. | "Show Cards" vs "Pinned" vs "Cards" |
| **Chapter card** / **כרטיס הפרק** | The chapter at a glance: synopsis, status, its outline beats. | "Chapter" (tab), "scene card" |
| **In this chapter** / **בפרק הזה** | Who and where the chapter mentions, above the page. | "cast" (in the interface) |
| **Needs attention** / **דורש טיפול** | Problems the app found in files. | "warnings" (in the interface) |

## Actions

| Name (en / he) | What it does | Not |
|---|---|---|
| **Open** / **פתיחה** | Show an entry on the page. | |
| **Peek** / **הצצה** | A small card for a link, without leaving the page. | |
| **Pin** / **הצמדה** | Keep a card in Cards. | |
| **Edit details** / **עריכת פרטים** | Open Details for an entry, from its peek, its card in Cards, the Chapter card or its Manuscript row. | |
| **Open beside** / **פתיחה בצד** | Show an entry in a split. | an icon with no label |
| **Write here** / **כתיבה כאן** | Make a split's chapter the one you write. | |
| **Back to your chapter** / **חזרה לפרק** | Return to the chapter you are writing. | "Return to writing" |
| **Capture** / **תפיסה** | Add a beat to the Inbox from anywhere. | |
| **Go to…** / **מעבר אל…** | The palette: find anything, run any command (Ctrl+K). | "Command palette"; he "לוח פקודות" (clashes with לוח, the board) |

## Settings words

| Name (en / he) | What it is |
|---|---|
| **Interface language** / **שפת הממשק** | The app's language. Set once, in Settings, not in every project's top bar. |
| **Book language** / **שפת הספר** | The book's `language`, which decides the words written into files. |
| **Appearance** / **מראה** | The page's size, width, direction, and the fading option. |
| **Experimental** / **ניסיוני** | Features being tried out, off by default. |
