# Plot Device — UX & Visual Design Specification
Version: 0.4 draft (2026-11-04). Roadmap decisions D1–D9 applied.

The audience is non-technical writers, some of them wary of technology (`PRD.md` §1). Every screen is checked in Hebrew and in English, and both must work equally well; Hebrew mockups come first.

## Navigation
- Persistent Story | Write switch (Story is working term, not a pre-writing phase).
- Reopen to last workspace and context. A workspace remembers its last outline/view; Write remembers chapter, scroll and selection (subject to persistence safety).
- No necessary dashboard after initial project creation. Avoid developer vocabulary in regular UI.
- Do not automatically infer manuscript semantics from arbitrary outline titles.
- The start screen offers "New project" and "Open project…", recent projects, and one quiet line for authors arriving with material: "Already have notes or a draft? Moving them in →", which opens the guide page in the interface's language (Milestone 13). It hides while the new-project form is open.
- New project (Milestone 19) first asks what the author is making: templates as cards (Novel, Short story, D&D campaign, Blank), each with a one-line description and a small summary of what's inside ("5 kinds of pages · 2 outlines · sessions"). Blank is always there. Then title, location and the story's language, which picks the template's language. The project opens ready to work: Write on the first chapter, or Story on the session plan for a campaign. Import from Word (Milestone 22) joins these as one more way to start.
- Update notices (Milestone 15): when a newer version is out, a quiet "Update available" button in the top bar, before the ☰ menu, opens a small panel: "Plot Device 0.4.0 is out.", "What's new", "Download" and "Not now". Nothing interrupts writing, and nothing is downloaded or installed by the app. About has "Check for updates"; Settings has "Check for updates automatically" (on at first; once a day; nothing about the author is sent).
- The ☰ menu's last group: "Help and documentation", "Report a problem…" (the GitHub form, with the version and system filled in), "Suggest an idea…", and "About". About ends with the licence, "your writing is yours", and a "buy me a coffee" line.

## Write layout
- Central writing surface; hideable manuscript navigator and hideable reference shelf.
- Three layout presets: Standard, With References, Focus. All render one editor instance; layout changes never remount the editor or erase undo history.
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
- **Plain text, one step away.** Each page's `⋯` menu has **Edit as plain text**: the same file in the same editor, every mark visible, links as written, under a quiet banner, "Plain text. Changes here are saved exactly as typed.", with **Back to normal view**. Settings → Advanced has **Show plain text when I open a page** (off by default). Switching never loses undo history or the selection.
- "Text" (the rendered outline view) and "plain text" are working names, kept in the message catalogs only, to revisit if testers confuse them.

## Story layout
- Story has two groups (Milestone 11): **Plot**, the outlines and the book's chapters, and **World**, the project's kinds of pages (Characters, Places and Notes by default; ADR 0011), each with its count. The groups are named in the sidebar.
- An author can create multiple named outlines; each opens as a Board, a List (the Outline view) or Text, and from Milestone 20 as a Timeline, with last selection preserved. Text is never remembered as the outline's view (Milestone 14). The view switch sits beside the outline's title, because it belongs to the outline. In Text, the hint is in plain words: "Enter adds a card, Tab makes it a detail, Ctrl+Alt+2 makes a section." (A third Cards view was removed in Milestone 11: it showed the board without its columns.)
- Outline mapping: `#` optional document title; `##` headings -> sections/columns; first-level `-` bullets -> cards; nested bullets -> details. Depth may be collapsed and is not fixed at exactly two levels.
- Board drag to reorder a card and descendants; moving between columns only changes the outline document.
- Inline rename section/card/detail; clear affordance for Add section, Add card, Add detail; undo for structural edits. In the List, the add controls are visible ("+ Add card" per section, "+ Add section", a "+" per row for a detail); while typing a new line, Enter starts the next, Tab makes it a detail of the line above and Shift+Tab brings it back out.
- Derived Manuscript Outline is a distinct read-only projection of manuscript order, with explicit navigation/rename/reorder actions invoking manuscript commands.
- Pages of every kind use a short title, description and expandable details, not developer-like forms. No kind has fields or views of its own.
- World: each kind opens as a gallery of cards, A to Z (title, other names, description, first relationships), with a dashed card to add one.
- A page shows, beside its text, its relationships (ADR 0009) and everything that links to it ("Linked from": outline cards, pages, chapters). From there the author can show the page's cards on the board, or start an arc outline linked to the page. Nothing is inferred from names.
- **"What your world has"** (Book settings, Milestone 18): the kinds as a list. **+ Add a kind** asks for its name and plural; rows can be renamed, dragged to reorder, or removed. Removing a kind never deletes a page: its pages move to a quiet **"Not sorted yet"** tray in World, where they can be opened, linked and given a kind again. Folders the project doesn't list appear in the same tray, with **Make this a kind…**.
- **Match folder names…**: when a kind's name no longer matches its folder, "What your world has" shows one quiet line, never a pop-up: "Some folder names no longer match what you call them in Plot Device. This only matters if you open the book's folder in other apps." The helper previews each folder's old and new name, how many links will be updated, and anything that blocks a rename. Before the rename button, a clear backup step: **Make a backup now**, or the checkbox "I have a backup". **Undo folder renames** is offered right after, and in the book menu until the book is closed.
- **Timeline** (Milestone 20, ADR 0012): a line of moments (the outline's sections) with their cards stacked under each. Drag between moments, with the Move menu as the keyboard equivalent. Cards linked to a chapter show its name as a small label. **Lanes by…** (Milestone 21) splits it per page of any kind, all of them or those with chosen tags; a card goes in a lane only by an explicit link.
- **First outline:** an outline never opened before shows a short, dismissible guide: "Sections are the big steps of your story. Cards are the moments in each step. Add details under a card." The outline's shape is explained, not configurable.

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
- **Time runs from the reading-start side** (D8): earlier moments on the right in a Hebrew interface, on the left in an English one. A working rule, to validate with Hebrew testers before Milestone 20 ships.
- Test navigation arrow keys, Home/End, selection, caret, mixed English/Hebrew numbers and quotes; voice/screen reader labels in both locales.

## UX validation tasks with authors
- 'Write without planning'; 'Find a character detail without losing cursor'; 'Move an idea on the board'; 'Reorganize chapters'; 'Open Markdown in another app'; 'Write mixed-direction dialogue'; 'Write an outline without typing a Markdown symbol'; 'Start a campaign from a template'; 'Fix something by hand in plain text'. Run each in Hebrew and in English.
- Success measures: task completion, errors, hesitation, and self-reported clarity; do not prescribe target seconds without study data.
