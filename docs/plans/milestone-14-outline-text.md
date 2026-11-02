# Milestone 14: An outline as text

Status: **Built for trial** (2026-10-27) on branch `milestone-14/outline-text`. The owner asked for it as a PR to try out in real use and revert if it doesn't work out. Everything it adds is in new files or small, separate changes, so reverting the PR removes it cleanly. Results are at the end of this document.

## Goal

When writing an outline for the first time, or making quick changes, the author wants to type: entry after entry, details under them, without clicking each item. The List works one row at a time: each row is its own field, so changing several means clicking each one, and nothing can be pasted or selected across rows.

An outline is already plain Markdown that the author owns (ADR 0003). A third view, **Text**, shows that Markdown in the writing editor, to type freely. The Board and List read it again when they show.

**Out of scope:**

- Rebuilding the List as one continuous writing surface, like an outliner app. That is a much bigger build, and the editor already does what's needed.
- Strict checking that the text is only headings and bullets. Anything else is kept and shown "kept as written", as it always was (ADR 0003, point 4). It is pointed out, never refused.
- Showing the outline's frontmatter. The Text view shows the outline's body, as a page or chapter does. The frontmatter is kept exactly as it is.

## What the author will see

- **Board · List · Text** beside the outline's title. **Ctrl+Shift+E** (⌘⇧E) switches to Text and back to the board or list the author came from.
- A line under the view's name says how the text works: "## " starts a section, "- " a card, Tab makes a line a detail, and @ links a page.
- **Enter** on a card starts the next card at the same level; Enter on an empty bullet ends the list. **Tab** and **Shift+Tab** move a line in or out a level, carrying its details with it, and use the file's own indentation (two spaces, four, or tabs). Off a list line, Tab leaves the editor as usual.
- **@** (or **[[**) and part of a name offers characters, places, notes and chapters, as in a card; Enter puts in an ordinary relative link.
- **It opens where the author was.** Text opens with the cursor on the card or detail last focused on the board or list. Going back focuses the card the cursor is on, or that detail's card on the board.
- **"Kept as written", counted.** Under the text: "2 passages will show “kept as written” on the board". **Show** selects the next one.
- **Saving** is the same as for a chapter: about a second after typing stops, and at once on switching views. A change from another app is never overwritten; the usual conflict choice appears.
- **Undo** in Text is the editor's, by the keystroke. Coming back to the board or list starts a fresh undo history there, because the board's undo can't go back past text typed by hand.

## Decisions

1. **Text is a third view of the same file**, visible to everyone, not tucked away (owner, 2026-10-27). It is quiet: one more button in the switch.
2. **Text is never remembered as the outline's view.** The app reopens on the board or list. This also means reverting this milestone can't leave an unknown view in anyone's saved settings.
3. **Saving reuses the chapter autosave**, so the conflict protection is the one already tested (ADR 0005). Writing the author's typed text whole is not re-serializing (ADR 0003, point 1): the app writes what the author typed, and nothing else.
4. **The host finishes saving before an outline is read again**, so the board never shows text older than what was just typed.

## Tests

- **Markdown (`outline-places.test.ts`):** the card or detail at a position and back, in English and Hebrew, with CRLF and with cards before the first section; what the board keeps as written, in order, without `###` group labels.
- **Editor (`outline-text.test.ts`):** Tab and Shift+Tab with details carried along, with two spaces, four spaces and tabs; several selected lines; Tab left alone off a list line; Enter continuing a list in Hebrew with CRLF kept; the `@` name read from the current line only, never an email address.
- **Outline session:** reopening an outline changed since its last edit offers no undo; reopening an unchanged one keeps it.
- **End to end (`outline-text.e2e.ts`):** typing cards and details and switching straight back to the board, before the autosave pause; opening on the focused card and returning to the card the cursor is on; `@` links; the kept-as-written count, and the file left exactly as typed.

## Results

- `pnpm lint`, `pnpm typecheck`: clean.
- `pnpm test`: 64 files, 961 tests passed. `pnpm arch`: 114 passed.
- `pnpm e2e` (whole suite): 77 passed, after updating one older test that counted two views.

## Known limits

- The count of "kept as written" passages updates as each save is sent, not on every key.
- Links show as Markdown in Text, as in any text editor. On the board and in the list they show as names.
