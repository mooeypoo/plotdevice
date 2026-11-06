# Plot Device — UX & Visual Design Specification
Version: 0.4 draft (2026-11-04). Roadmap decisions D1–D9 applied.

The audience is non-technical writers, some of them wary of technology (`PRD.md` §1). Every screen is checked in Hebrew and in English, and both must work equally well; Hebrew mockups come first.

## Navigation
- Persistent Story | Write switch (Story is working term, not a pre-writing phase).
- Reopen to last workspace and context. A workspace remembers its last outline/view; Write remembers chapter, scroll and selection (subject to persistence safety).
- No necessary dashboard after initial project creation. Avoid developer vocabulary in regular UI.
- Do not automatically infer manuscript semantics from arbitrary outline titles.
- The start screen offers "New project" and "Open project…", recent projects, and one quiet line for authors arriving with material: "Already have notes or a draft? Moving them in →", which opens the guide page in the interface's language (Milestone 13). It hides while the new-project form is open.
- New project (Milestone 19) asks "What are you making?". First the book's language, which starts on the app's and picks the template's language. Then templates as cards (Novel, Short story, D&D campaign, Blank; Novel chosen to begin with), each with a peek at its kinds and outlines, in the book's language, so it shows what the book will get; a one-line description and a summary ("5 kinds of pages · 2 outlines · sessions"), in the app's. Blank is always there. Below: title, name on the cover, and "Where to keep it", which starts beside the last book and has "Choose…". The project opens ready to work: Write on the first chapter if there is one, otherwise Story on the first outline (a campaign on its session plan). "New project…" in the ☰ menu shows the same screen over an open book, with the top bar hidden (its buttons belong to the book); "← Back", or Cancel beside Create, returns to it. Import from Word (Milestone 22) joins these as one more way to start.
- "New outline" offers a starter under "Start from": Empty, Three acts, Story beats, Character arc, Campaign arc, Session plan, in the book's language. Choosing one names the outline after it until the author types a name.
- The outline guide: the first outline the author opens shows a short card above it ("Sections are the big steps of your story…") with a small drawing of the Board and "Got it". Once dismissed it never returns on that computer.
- Update notices (Milestone 15): when a newer version is out, a quiet "Update available" button in the top bar, before the ☰ menu, opens a small panel: "Plot Device 0.4.0 is out.", "What's new", "Download" and "Not now". Nothing interrupts writing, and nothing is downloaded or installed by the app. About has "Check for updates"; Settings has "Check for updates automatically" (on at first; once a day; nothing about the author is sent).
- The ☰ menu's last group: "Help and documentation", "Report a problem…" (the GitHub form, with the version and system filled in), "Suggest an idea…", and "About". About ends with the licence, "your writing is yours", and a "buy me a coffee" line.

## The main screen (Milestone 17)
Write and Story share one layout language: the same top bar, the same sidebar, one header row for whatever is open, and the tools for writing on the page itself. Mockups: `docs/plans/milestone-17-main-screen.md`.
- **Top bar, the same everywhere:** the logo and the book's title (the book menu), Story | Write, the save status, **Aa** and ☰. Story's save status is that of the page or outline text open; the board and gallery save as they change.
- **One sidebar:** the same width, look and collapse in both workspaces; one group-label style (a quiet serif) for parts, "On the side", Plot and World. Parts, Plot and World fold; a part folds to its name and chapter count, the open chapter's part stays open, and folded parts are remembered per book.
- **One header row:** the sidebar toggle, the open item's name ("Part One · Chapter 2"; "Main story"; "Characters / Bea Halmi"), its views (outlines: Board · List · Text), its `⋯`, and at the far end its tools (References in Write).
- **Format on the page:** a labelled **Format** button at the top corner of every page to write on (chapters, World pages, outline Text), staying at the top of the visible page; the ¶ menu is retired. The selection bubble handles a selection; Format the paragraph the cursor is in.
- **References** has its word, quieter than Format; under about 1100 px it shows only its icon (named for screen readers, with a tooltip).
- **Collapse and Focus:** the toggle and **Ctrl+\\** (⌘\\) hide the sidebar in both workspaces. Focus puts the sidebar and the shelf away and quiets the top bar and header row until the pointer or keyboard reaches them. Nothing remounts the editor or erases undo history.
- **Board menus:** a card's or column's `⋯` shows on hover or keyboard focus; right-click and Shift+F10 open the same menu.
- **Empty and long:** no chapters, no outline and an empty kind of page each show one explanation and one next step; an empty page says "Start writing here."; a kind with more than 12 pages shows compact cards.

## Write layout
- Central writing surface; the sidebar (the manuscript navigator) and the reference shelf can be hidden.
- Search reference catalog by title; open overlay, peek or pin to shelf; move pinned cards by pointer or keyboard; linked contextual references may be suggested without AI.
- Tags (Milestone 12): pages carry the author's own tags, as calm pills under the name with "+ Tag" suggesting existing ones. A row of tags above the World gallery, the shelf and "Link to…" groups the list by the chosen tags (one group per tag, in the order chosen; the rest folded under "All" and the kind's plural name, such as "All characters" or "All factions", or "All pages" where kinds mix). The shelf remembers its chosen tags per part. Right-click or Shift+F10 on a tag: rename everywhere, remove from all pages. "Tidy tags" appears only when tags look duplicated or can't be read, with one notice when a project opens.
- The manuscript unit is named per project (`manuscriptUnit`, ADR 0011): "New session" and "Session 3" in a campaign. Only the interface changes; files and `CONTENTS.md` don't.
- Chapter is the editing and autosave unit. Navigation can prefetch one adjacent chapter but does not load all chapters.
- Scene breaks can be inserted as `* * *` in chapter Markdown; no distinct scenes to manage in MVP.
- Primary writing shortcuts discoverable from menu/help; keyboard-only complete.

## Rendered editing and plain text (ADR 0010, Milestone 16)
Every editing surface (chapters, outline Text, every World page) shows what the text means, never its Markdown marks.
- **Headings stay headings.** The `#` marks never show, even on the cursor's line. The level is set from the format bubble or the keyboard: Ctrl+Alt+1, 2, 3 for heading levels and Ctrl+Alt+0 for body text (⌘⌥ on a Mac), as in Word and Google Docs.
- **Bold and italics** show as formatting, never as asterisks, on the cursor's line too.
- **Links are names**, edited like any words, as in Word and Google Docs: Backspace erases one letter at a time and the link goes only with its last letter; typing next to a link is outside it. With the cursor in a link, a small popup offers Open, Change link… (the usual picker; the words stay) and Remove link (the words stay). The same in card fields. `@` and `[[` offer names.
- **Typing Markdown still works:** `## ` at the start of a line becomes a heading and `- ` a bullet, and the marks disappear once understood.
- **Backspace works the way it looks:** at the start of a heading it makes body text; at the start of a bullet it moves a detail out a step, or ends the list. A heading level on a bullet makes it a heading. In outline Text, Enter at the end of a section starts its first card.
- **"Kept as written"** passages (tables, code, unusual Markdown) show as written, with their quiet style and count. Pointed out, never changed.
- **Plain text, one step away.** **Format** on each page (Milestone 17; on the board, the outline's `⋯`) has **Edit as plain text**: the same file in the same editor, every mark visible, links as written, under a quiet banner, "Plain text. Changes here are saved exactly as typed.", with **Back to normal view**. Settings → Advanced has **Show plain text when I open a page** (off by default). Switching never loses undo history or the selection.
- "Text" (the rendered outline view) and "plain text" are working names, kept in the message catalogs only, to revisit if testers confuse them.

## Story layout
- Story has two groups (Milestone 11): **Plot**, the outlines and the book's chapters, and **World**, the project's kinds of pages (Characters, Places and Notes by default; ADR 0011), each with its count. The groups are named in the sidebar.
- An author can create multiple named outlines; each opens as a Board, a List (the Outline view) or Text, with last selection preserved. Text is never remembered as the outline's view (Milestone 14). The view switch sits beside the outline's title, because it belongs to the outline. In Text, the hint is in plain words: "Enter adds a card, Tab makes it a detail, Ctrl+Alt+2 makes a section." (A third Cards view was removed in Milestone 11: it showed the board without its columns.)
- Outline mapping: `#` optional document title; `##` headings -> sections/columns; first-level `-` bullets -> cards; nested bullets -> details. Depth may be collapsed and is not fixed at exactly two levels.
- Board drag to reorder a card and descendants; moving between columns only changes the outline document.
- Inline rename section/card/detail; clear affordance for Add section, Add card, Add detail; undo for structural edits. In the List, the add controls are visible ("+ Add card" per section, "+ Add section", a "+" per row for a detail); while typing a new line, Enter starts the next, Tab makes it a detail of the line above and Shift+Tab brings it back out.
- Derived Manuscript Outline is a distinct read-only projection of manuscript order, with explicit navigation/rename/reorder actions invoking manuscript commands.
- Pages of every kind use a short title, description and expandable details, not developer-like forms. No kind has fields or views of its own.
- World: each kind opens as a gallery of cards, A to Z (title, other names, description, first relationships), with a dashed card to add one.
- A page shows, beside its text, its relationships (ADR 0009) and everything that links to it ("Linked from": outline cards, pages, chapters). From there the author can show the page's cards on the board, or start an arc outline linked to the page. Nothing is inferred from names.
- **"Kinds of pages"** (Milestone 18): a dialog from the book menu, or **+ Kind of page** at the end of World. The kinds as a list, each with its plural, its folder in small type and its page count. **Add a kind** asks for its name and plural and offers a folder made from the plural; each row's `⋯` renames it, moves it up or down, or removes it. Removing a kind never deletes a page: its pages move to a quiet **"Not sorted yet"** group at the end of World, where they can be opened, linked and given a kind again. Folders the project doesn't list appear there too, with **Make this a kind…**. **What chapters are called** sets the book's word for a chapter ("Session"); only the interface's prominent words change. A new page of the author's own kind is "New Faction" in English and "הוספת פלג" in Hebrew, so no adjective has to agree in gender.
- **Match folder names…**: when a kind's name no longer matches its folder, "Kinds of pages" shows one quiet line, never a pop-up: "Some folder names no longer match what you call them in Plot Device. This only matters if you open the book's folder in other apps." The helper previews each folder's old and new name, its pages, how many links will be updated, and anything that blocks a rename. Before the rename button, a clear backup step: **Make a backup now** (a copy of the whole book where the author chooses), or the checkbox "I have a backup". **Undo** is offered in the notice right after, and **Undo folder renames** in the book menu until the book is closed.
- **Timeline** (Milestone 21, ADR 0012, `docs/plans/timeline-design.md`): one per book, opened as **Timeline** in the Plot group. One row per thread (an outline), earlier moments on the reading-start side, cards under each moment. The column names are the sections of the book's **main outline** (marked "Main", top row); a line above the grid always says so, with **Change…**. Clicking a column name renames that section and **+** between columns adds one; **Make this the main outline** in an outline's ⋯ swaps it, with a short message that nothing in the outlines changes. A section is lined up with another outline's moment by dragging it there or with **Line up with…**; the section keeps its own name, and the app writes one short line under its heading. Sections not lined up sit between their lined-up neighbours, a little lighter. Drag cards between moments of their own thread, with the Move menu as the keyboard equivalent. A card linked to a chapter shows a small chip with the chapter's name. A page or tag can highlight its cards (later). Only moments that keep every storyline's order light up while dragging, and only those are offered in **Line up with…**.
- **Setting an outline aside or deleting it** (Milestone 21): an outline's ⋯ offers **Set aside** (it moves to a quiet **Set aside** list at the end of Plot and off the timeline; **Bring back** returns it) and **Delete outline…**. Setting aside is encouraged: the delete question explains what deleting means (only this outline, with its own sections and cards; chapters, pages and other outlines stay), how many line-ups will show "can't line up", which outline becomes main if this one was, that it goes to the computer's Trash and a backup is kept, and offers **Set aside instead** as the recommended button. After a delete, the notice offers **Undo**, which puts the outline back byte for byte, with the main and set-aside outlines as they were, until another book opens. Nothing an outline links to is ever deleted with it.
- **First outline:** an outline never opened before shows a short, dismissible guide: "Sections are the big steps of your story. Cards are the moments in each step. Add details under a card." The outline's shape is explained, not configurable.

## Keeping the book safe (Milestone 20)

- **Backups are each book's own.** "Backups…" in the book menu holds the folder, a plain explanation, the last backup, **Back up now** and an opt-in clean-up. Sync folders found on the computer (Google Drive, Dropbox, OneDrive, iCloud Drive) are offered by name. The app never uploads anything itself, and never calls this a cloud backup.
- **The one-time offer** comes when the author leaves a book with some writing and at least two World pages: on closing the window, or on opening another book. It is never shown for the sample book. The window closes on the answer, or at once if closed again.
- **The book menu** shows "Backed up ‹date›" or "No backups yet" under the book's title. It has **Backups…**, **Back up now** and **Restore from a backup…** as their own group.
- **Restore** lists backups newest first and shows what differs. It offers **Open as a separate copy** (safest; the copy opens from the notice), or **Replace this book…** behind a plain confirmation that explains the "before restoring" backup.
- **Notices** say when a backup failed (folder missing, no space) and when a clean-up removed backups. Nothing happens silently.
- **The sample book:** **Try a sample book** on the start screen opens a copy kept in app data, marked "Sample". **Start the sample over…** asks first and says plainly that the sample is erased and other books are untouched.
- **Help links:** a small "?" beside the headings of Backups, Kinds of pages, Match folder names, Versions and Tidy tags, in the outline guide, and beside the plain-text setting. Each opens the guide page in the interface's language.

## Outline UX edge cases
- Empty outline: guided first card or blank start, without forcing templates.
- Heading with zero cards: empty column shown.
- Very long card: collapse preview, full text in detail editor.
- Deep nested bullets: represent with visual nesting in Outline, preview truncation in Board.
- Unsupported Markdown blocks: preserve and show a visible warning; never discard silently.
- Drag/drop in RTL: logical beginning/end based on UI direction; equivalent explicit Move menu for access needs.

## Color system
The colour tokens, their contrast requirements and the single source of truth are defined in `DESIGN_SYSTEM.md`, which is authoritative (owner decision, 2026-10-25). This document does not repeat the values.
- The palette comes from the logo (ink, cream and gold; Milestone 9). Alternative palettes may be user-selectable later.
- Plotline/card colors must include labels, icons or patterns as redundant signals.
- No color-only status, no low contrast decorative text for essential controls.
- Theme switch updates token variables without editor remount.
- Respect reduced-motion and OS theme preference, with explicit override.

## Typography
- Prioritize readable, language-appropriate fonts; separate UI and manuscript font preferences; do not assume Latin and Hebrew share identical metrics.
- Adjustable writing font size, line height, text width and paragraph spacing, persisted as preference, not embedded in manuscript Markdown.
- Test Hebrew bold weights, punctuation and directional keyboard behavior in final fonts.

## RTL specification
- Locale and editor direction independent; allow auto/LTR/RTL direction for each writing block where supported.
- Use `dir=auto` and `bdi` or equivalent isolation for user-origin labels; avoid leaking BiDi control characters into content.
- Use CSS logical properties; icons are not automatically mirrored without semantic review.
- **Time runs from the reading-start side** (D8): earlier moments on the right in a Hebrew interface, on the left in an English one. Confirmed by the owner on 2026-11-05; Hebrew testers check it after release.
- Test navigation arrow keys, Home/End, selection, caret, mixed English/Hebrew numbers and quotes; voice/screen reader labels in both locales.

## UX validation tasks with authors
- 'Write without planning'; 'Find a character detail without losing cursor'; 'Move an idea on the board'; 'Reorganize chapters'; 'Open Markdown in another app'; 'Write mixed-direction dialogue'; 'Write an outline without typing a Markdown symbol'; 'Start a campaign from a template'; 'Fix something by hand in plain text'. Run each in Hebrew and in English.
- Success measures: task completion, errors, hesitation, and self-reported clarity; do not prescribe target seconds without study data.
