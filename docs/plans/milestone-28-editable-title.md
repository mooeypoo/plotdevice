# Milestone 28: Rename a chapter on the page

Status: **Approved** by the owner on 2026-11-11, as a follow-up PR on Milestone 27 (`milestone-27/poems`, PR #58).

## Goal

The title above the page is where an author looks for the chapter's name, so that is where they can change it. Today renaming takes three clicks: the sidebar's ⋯ menu, Rename…, and a dialog. Now the author clicks the title and types.

Every chapter gets this, not just poems. The sidebar's Rename… stays.

## What the author will see

- The title looks the same as before. On hover it gets a faint underline, which says "you can type here".
- One click puts the cursor in the title.
- **Enter** saves and moves the cursor into the text. **Esc** puts the old name back and moves into the text. Clicking anywhere else saves.
- It saves once, when the author is done, not on every letter.
- **Undo is separate:** Ctrl+Z in the title undoes typing in the title, and Ctrl+Z in the text never undoes a rename.
- **A poem's title can be emptied.** It is then "Untitled poem" again, shown faintly in the book's language, and the sidebar names it by its first line (ADR 0013).
- **Any other chapter needs a name.** Emptying its title puts the old name back.
- Pasted line breaks become spaces, because a title is one line.
- If saving fails, the old name comes back and the usual notice says nothing changed.

## What doesn't change

- Renaming changes the chapter's `title:` line and its line in the book's contents, exactly as Rename… does. The file name never changes.
- **Pages** (characters, places and so on) already have their name in Details, so they are left as they are.

## Changes

| Area | Change |
|---|---|
| `packages/ui-vue` | new `ChapterTitle.vue`, used in `WritingView.vue`; its styles in `base.css` |
| `packages/i18n` | `chapter-title-field` (the title's name for screen readers), in English and Hebrew, with a note in `qqq.json` |
| `docs/UX_SPEC.md` | the title can be edited in place |
| site guide | "Chapters and parts" and "Writing poems" say the title can be edited on the page, in English and Hebrew |

## Tests

- **End to end:** rename by clicking the title and pressing Enter (both files change; the cursor is in the text); Esc puts the old name back; clicking away saves; an emptied chapter title comes back; an emptied poem title makes the poem untitled; pasted line breaks become spaces; in English and Hebrew.
- **Accessibility:** the title has a name, and the existing axe checks pass.
