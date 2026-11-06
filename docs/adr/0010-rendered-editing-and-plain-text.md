# ADR 0010: Rendered editing and plain text

Status: **Accepted** (owner, 2026-11-04, roadmap decision D2) · Amends ADR 0004, point 2 · Built in Milestone 16

## In short

Authors coming from Word expect a heading to look like a heading and a link to look like a name. Today the chapter editor shows Markdown marks on the line with the cursor (`## `, `**`, `[Bea](../characters/bea.md)`), and the outline's Text view shows links as raw Markdown. To a non-technical writer, both look broken.

From Milestone 16, every editing surface (chapters, outline Text and every World page) shows **rendered** text: what the text means, never its marks. The raw Markdown is one step away, as **plain text**, for anyone who wants it.

| The author types or opens | Rendered (normal) | Plain text |
|---|---|---|
| `## The orchard` | a heading | `## The orchard` |
| `She was **never** there` | She was **never** there | `She was **never** there` |
| `[Bea](../characters/bea.md)` | "Bea", in the link colour | `[Bea](../characters/bea.md)` |
| a table | shown as written, "kept as written" | shown as written |

## Decision

1. **Rendered by default, everywhere.** Headings, bold, italics and links never show their marks, including on the cursor's line.
2. **A link is its words, edited like any words,** as in Word and Google Docs (owner, 2026-11-04): Backspace erases one letter at a time, and the link goes only when its last letter does; typing inside changes the words, not where the link points; typing next to a link is outside it. This is the same in chapters, pages, outline Text and card fields, replacing the cards' chips (Milestone 11). An unlabelled `[[wikilink]]` from another app stays whole, because its words are the file it points to. **Where a link goes** is changed from a small popup beside it (Open, Change link…, Remove link), which picks a page or web address again and keeps the words.
3. **Formatting comes from the format bubble and the keyboard,** not from marks: Ctrl+Alt+1, 2, 3 set a heading level and Ctrl+Alt+0 returns to body text (⌘⌥ on a Mac), as in Word and Google Docs; Ctrl+0 stays Reset zoom. Typing Markdown still works: `## ` at the start of a line becomes a heading and `- ` a bullet, and the marks disappear once understood.
4. **Plain text is a mode of the same editor.** Each page's `⋯` menu has **Edit as plain text**, under a quiet banner with **Back to normal view**. Settings → Advanced has **Show plain text when I open a page** (off by default). Plain text is not hidden behind a developer switch; it is simply not first.
5. **Rendering never changes the file.** It only draws over the text. What the author types is written as typed (ADR 0003, point 1), and opening and saving without a change stays byte-identical.
6. **Unsupported Markdown is still pointed out, never changed.** Tables, code and unusual Markdown show as written, with the "kept as written" style and count (ADR 0004, point 2).
7. **No new editor library.** This extends the CodeMirror editor chosen in ADR 0004.

## Rejected

| Option | Why not |
|---|---|
| A WYSIWYG editor library (Tiptap, ProseMirror) | Rejected in ADR 0004: it would rewrite authors' Markdown on save |
| A separate raw-text editor or window | Two editors to keep in step; switching would lose undo and the selection |
| Keep showing marks on the cursor's line | The current behaviour; reads as broken to a writer from Word |
| Links as chips, removed whole (the roadmap's first idea) | A link in prose can be several words; erasing them all with one Backspace surprises writers used to Word |
| Plain text only behind a developer setting | Technical authors and anyone fixing a file by hand need it without hunting |

## Engineering notes

- **One instance, two modes.** Rendered and plain text are the same `EditorView`, with the rendering extensions in a `Compartment` that is reconfigured. Switching never remounts the editor, so undo history and selection survive (ARCHITECTURE, "no editor remount").
- **Where:** `packages/editor-codemirror` (`live-preview.ts` for chapters and pages, `item-text.ts` and `item-editor.ts` for card fields, `outline-text.ts` for outline Text). The Milestone 16 plan lists the changes.
- **Cursor motion over hidden ranges** is the highest risk: arrows, Home/End, Shift+arrows and double-click, in English, Hebrew and mixed-direction lines. These are tested before the code is written, in the built app, where bidi behaves as it will for authors.
- **The cursor rule:** hidden marks have no width; where marks sit between two letters the cursor rests on the logically earlier side, so new text takes the formatting before it. At either end of a link it rests outside the link.
- **Fidelity:** every Markdown fixture opens and saves byte-identical in rendered mode.
- **Accessibility:** hidden marks must not be read out, and headings must be announced as headings (the outstanding Orca/NVDA check from ADR 0004).
- **Names:** "Text" (the rendered outline view) and "plain text" are working names, in the message catalogs only, to revisit if testers find them confusing.

## Consequences

- Milestone 14's Text view stays, now rendered. Plain text is the raw view it used to be.
- Authors who know Markdown lose nothing: typing it still works, and plain text shows it all.
- Every new editing surface must offer both modes.

## Implementation note (Milestone 16)

- **Built as decided**, with one change of mechanism: what is hidden is worked out per line, on demand, by one pure function (`editor-codemirror/src/hidden.ts`), rather than kept for the whole document in a state field. The drawing asks for the visible lines, and the cursor and edit rules for the lines they touch. It is still testable without a screen, and a keystroke in a 150,000-character chapter takes about 5 ms (budget: one 16 ms frame; `packages/editor-codemirror/test/typing.perf.ts`).
- **The cursor rule** (`restingPlace`) and the edit rules (`caret.ts`) are shared by chapters, pages, outline Text and card fields. The Markdown package's own Backspace for lists is overridden where something is hidden, because it removed a bullet's mark and left its indentation.
- **Outline Text** also gained: Enter at the end of a section starts its first card, and a heading level on a bullet line makes it a heading (as in Word), so an outline can be written without typing `## ` or `- `.
- **A quicker switch (owner, 2026-11-06):** Ctrl+Shift+M (⌘⇧M) toggles plain text in the focused editor, matched by key position (`KeyM`) so it works in a Hebrew layout; and an opt-in **Plain text** toggle beside Format (Settings → Advanced, off by default). Point 4 stands: plain text is still not first.
- **Still to verify by hand:** Orca and NVDA with rendered editing. Hidden marks are not in the page, and heading lines carry `role="heading"` with their level, but how a screen reader reads that inside the editor hasn't been heard yet.
