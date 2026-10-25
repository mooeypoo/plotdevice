# Milestone 3: Writing (Gate 3)

Status: **Approved** (owner, 2026-10-25), with the recommended autosave timing, "Keep both" as the default conflict choice, and the listed dependencies.

## Goal

The first version an author could actually use: open or create a project, see the book's chapters, and write in them. It builds on Milestone 2's core and the editor chosen in ADR 0004, and covers PRD scenarios A, F, G and H end to end, in the real app.

**What an author can do at the end:**
1. **Start:** a welcome screen with **New project**, **Open project** and recent projects. Reopening the app returns to the last project and chapter (PRD G2).
2. **See the book:** a navigator lists parts and chapters, numbered per the project setting. "Not in the book yet" and "Missing" appear in plain words. The navigator can be hidden.
3. **Arrange the book:** add, rename, move (buttons, the keyboard, a "Move to…" menu) and remove chapters; add and rename parts; rename a chapter's file; relink a missing chapter; update outdated link text. These are Milestone 2's operations, now with screens.
4. **Write:** the CodeMirror editor with live preview (ADR 0004):
   - **Formatting:** headings, bold, italic, quotes, links, lists, scene breaks and line breaks, each from a menu and a keyboard shortcut.
   - **Enter and Shift+Enter:** Enter starts a new paragraph; Shift+Enter inserts a line break.
   - **Direction:** paragraph and phrase direction through Pandoc markers, written only when needed. Arrow keys move correctly in mixed Hebrew and English.
   - **Spellcheck:** English and Hebrew together.
5. **Never lose work:**
   - **Autosave:** about a second after typing stops, and when switching chapter, leaving the window or closing the app.
   - **Saving, honestly:** one write at a time per file, newer content never overwritten by older. The status shows **Saved** only once the text is on disk (ADR 0005, and the acceptance criteria carried from the Phase 0 plan, §12.3).
   - **Edits made elsewhere:** the app notices changes from other apps. An unedited chapter reloads quietly; a chapter with unsaved edits gets the conflict prompt (point 6).
6. **Conflicts, explained plainly:** if a chapter changed elsewhere while the author has unsaved edits, the app doesn't save over it. It offers:
   - **"Keep both"** (recommended): the author's text is saved as a new file next to the chapter, `frost-my-version.md` (in the interface language; parentheses are kept out of file names because they break Markdown links), and the chapter shows the other app's version. The copy appears under "Not in the book yet", so nothing is lost and everything stays visible in the folder.
   - **"Use my version":** after a clear warning, the author's text replaces the file.
7. **Comfort:**
   - Focus mode hides everything but the page.
   - Theme and interface language switch without disturbing the editor (scenario H).
   - The writing font size and page width are personal settings.
8. **Pasting from Word, Google Docs and web pages** keeps bold, italic, links, headings, lists and quotes, written as clean Markdown. Everything else (styles, scripts, images, tables) is dropped. The conversion runs outside the page, so the strict CSP stays as it is (ADR 0004).

**Out of scope:** outlines, Board and Cards (Gate 4); characters, places and the reference shelf (Gate 5); packaging and installers (Gate 6).

## What gets built

| Package | New |
|---|---|
| `application` | Use cases with real orchestration: the open project session (current project and chapter, last position), the autosave queue per chapter (serialized, coalesced, honest status), conflict handling ("keep both" or "use mine"), recent projects |
| `contracts` | Calls and events for projects, contents changes, chapters, saving, conflicts, external changes and settings; zod schemas for each |
| `markdown` | HTML-to-Markdown for pasting (pure, outside the DOM) |
| `fs-node` | File watching (events treated as hints only, ADR 0005); native dialogs live in desktop |
| `presentation` | View models: the navigator tree, chapter numbers and statuses, the save-status text |
| `editor-codemirror` (new) | The chapter editor, rebuilt from Spike B: live preview, formatting, Enter behaviour, direction markers, the CSP nonce, no remounting |
| `ui-vue` | Welcome, new-project form, navigator, writing view, conflict dialog, focus mode, settings additions, Hebrew and English text |
| `apps/desktop` | Folder pickers, the watcher, spellcheck languages, flushing pending saves before quitting (extended to chapters) |

## Decisions I recommend (**Decide** where marked)

1. **Autosave timing** (**Decide**): about 1 second after typing stops, plus on switching chapter, leaving the window and closing. There's no Save button; a quiet status shows "Saved", "Saving…" or a clear problem. (**Recommended**)
2. **Conflict choices** (**Decide**): "Keep both" (default) and "Use my version" (with a warning), as described above. A side-by-side comparison comes later. (**Recommended**)
3. **Layout:** the navigator on the starting side (left in English, right in Hebrew), the page in the middle, and a status line at the bottom. Kept simple, per the simplicity-first principle. Focus mode hides everything but the page.
4. **Recent projects:** the last 8, kept in personal settings (app data). A project that has moved is shown as missing, with "Find…" and "Remove from list".
5. **Remembered position:** the last chapter and cursor position per project, in app data. Nothing goes in the project folder.
6. **Interface wording:** words authors know, the same word for a concept everywhere, and gender-neutral Hebrew. Messages go through the catalogs and are reviewed in both languages.

## Dependencies (**Decide**; all MIT, compatible with GPL-3.0)

| Package | Why |
|---|---|
| `@codemirror/state`, `view`, `commands`, `language`, `lang-markdown`, `@lezer/highlight` | The editor (ADR 0004) |
| `chokidar` 6 | Watching the project folder (already in the approved stack) |
| `pinia` 4 | Shared interface state: the open project and save status (already in the approved stack) |
| `hast-util-from-html`, `hast-util-to-mdast`, `mdast-util-to-markdown` | Paste conversion outside the DOM (the recommendation in ADR 0004) |

## Tests

These follow `AGENTS.md`. The autosave queue and conflict handling are written test-first.

- **Application:**
  - **Autosave:** 100 rapid edits give one write at a time, typing order kept, and the last version wins. "Saved" appears only for confirmed revisions; failures are reported.
  - **Conflicts:** "keep both" leaves both texts on disk; "use mine" replaces the file only after the choice.
  - **Session:** restored on reopening.
- **Markdown:** paste conversion from Word, Google Docs, the web, plain text and Hebrew HTML. Supported formatting is kept; scripts, styles, images and tables are dropped; the output is safe Markdown.
- **Editor:**
  - **Fidelity:** opening and saving without edits gives identical bytes; typing changes only that paragraph.
  - **Keys and formatting:** Enter and Shift+Enter produce the right Markdown; each formatting command produces its expected Markdown.
  - **Direction:** markers stay hidden and protected.
  - Covered with Spike B's checks, rebuilt as tests.
- **Desktop, end to end** (Playwright, the real app):
  - Scenario A: create a project, write in Chapter 1, quit, reopen, and the text is there.
  - Scenario F: Hebrew prose with English phrases, the interface switched to Hebrew; saved, reopened and correct.
  - Scenario G: the chapter is changed outside the app while edits are unsaved; the prompt appears, and "keep both" keeps both.
  - Scenario H: switching theme, language and focus mode keeps the same editor, the cursor and undo history.
  - **Reordering** chapters with the keyboard.
  - **Closing** right after typing still saves (the Milestone 1 lesson).
  - **CSP:** no violations.
- **Accessibility:** keyboard-only paths for every action; labelled controls in both languages; focus visible; a basic screen-reader pass with Orca, reported.

## Work order (one commit or small PR each; results reported at the end)

1. Contracts, use cases (session, autosave, conflicts, recent projects) and IPC, test-first.
2. The `editor-codemirror` package, from Spike B rebuilt as production code, with tests.
3. The interface: welcome, navigator, writing view, conflict dialog, focus mode, settings.
4. File watching, paste conversion, spellcheck, flushing saves on quit.
5. End-to-end scenarios, the accessibility pass, docs and results.
