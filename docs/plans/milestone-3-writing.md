# Milestone 3: Writing (Gate 3)

Status: **Complete** (2026-10-25), on branch `milestone-3/writing`. Approved by the owner with the recommended autosave timing, "Keep both" as the default conflict choice, and the listed dependencies. Results are at the end of this document.

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

## Results

| Check | Result |
|---|---|
| `pnpm lint` | OK |
| `pnpm typecheck` | OK |
| `pnpm test` | **398 tests pass** (255 before this milestone) |
| `pnpm arch` | **21 checks pass**, including the new `editor-is-just-an-editor` rule and its fixture |
| `pnpm build` | OK |
| `pnpm e2e` | **22 end-to-end tests pass** in the real app (10 before), with no CSP violations |

**What the tests prove:**
- **Autosave** (application, test-first): 100 rapid saves give one write at a time, never older text after newer, with each write expecting the revision the previous one produced. "Saved" appears only for a confirmed write, never while newer text waits. A conflict stops saving and keeps the newest text; a failure is reported and retried on the next change. Mutation checks confirm the "saved too early" and conflict tests fail when their guards are removed.
- **Never overwriting a reload:** every text the editor loads has a generation number. A save typed into an older generation, before the editor showed a reload, becomes a conflict instead of a silent overwrite. A mutation check confirms the test catches its removal.
- **Conflicts** (scenario G): "Keep both" leaves the other app's version in the chapter and writes the author's text to `frost-my-version.md`. The copy keeps the chapter's other frontmatter keys and comments, with a new title and a new id, and appears under "Not in the book yet". "Use my version" replaces the file only after the choice. Both work in the real app.
- **The editor** (state-level, no screen):
  - Every chapter fixture opens and saves byte-identically, as do CRLF, mixed line endings, trailing spaces and a missing final newline.
  - Typing changes only its own paragraph.
  - Enter starts a paragraph and continues lists; Shift+Enter writes a backslash break.
  - Formatting writes plain Markdown, and applying it again removes it.
  - Direction markers are written only when needed, protected from Backspace, and removed with an emptied paragraph, in Hebrew and in CRLF files.
- **Pasting:** Word, Google Docs (including its style-only bold and italic), web pages and Hebrew Word HTML become clean, escaped Markdown. Scripts, styles and images are dropped; unsafe links keep only their text. Markdown copied from a code editor pastes as written.
- **Scenarios in the real app:**
  - **A:** create, write, quit and reopen, returning to the same chapter (PRD G2).
  - **F:** a Hebrew book with a marked English phrase, in a Hebrew interface, survives reopening with the marker hidden.
  - **G:** both conflict choices, plus a quiet reload of an unedited chapter.
  - **H:** theme, language and focus mode keep the same editor instance, the cursor and undo history.
- **Also covered:**
  - Keyboard reordering.
  - Keyboard-only formatting.
  - Every control named in both languages.
  - The project folder gains no app files.
  - Quitting or closing the window right after typing still saves, with saves slowed as on Windows. The quit test fails without its fix.
- **The navigator's move placements** match the domain's on the sample novel. Every chapter moves one step and back.

**Where the work differs from the plan:**
- **"Keep both" names the copy `frost-my-version.md`, not `frost (my version).md`.** Parentheses are kept out of file names because they break Markdown links. The label follows the interface language.
- **No CSP nonce.** The editor lives in a shadow root, where CodeMirror's styles are constructed stylesheets, which the CSP doesn't restrict. The strict policy is unchanged (ADR 0004 note).
- **Paste conversion runs in the page,** with pure libraries and no DOM, rather than in the main process. Either way the CSP needs no exception; in the page it stays synchronous.
- **Two bugs found and fixed while building:**
  - CodeMirror would have turned every Windows line ending into `\n` on first save. Caught by the new CRLF tests.
  - Quitting the app (as opposed to closing the window) could finish before the page sent its last second of typing. Caught by a new end-to-end test.

**Not done, needs the owner:**
- **A screen-reader pass with Orca.** It needs a desktop session with audio; the automated checks cover names, labels and keyboard paths only.
- **Windows.** CI runs every test on Windows, but nobody has written in the app there by hand.
- **Spellcheck dictionaries:** on Linux (and on Windows without OS dictionaries), Electron downloads Hunspell dictionaries from Google's servers the first time a language is chosen. Decide whether that's acceptable or whether to bundle dictionaries.
- **chokidar 6 is a rewrite released this month.** File events are only hints, so a bug there can't lose text, but it is worth watching.

**Later (noted, not in this milestone):**
- **Home and End in mixed-direction lines** follow CodeMirror's visual behaviour. In a left-to-right line that starts with a Hebrew word, Home stops after that word. This is standard for bidirectional editors, but worth checking with authors.
- Pasted HTML's `dir` attributes could become direction markers; for now they are ignored.
- A "Find…" for a moved project currently opens the folder dialog without updating the recent entry it replaces.
- Prettier reports long lines across the repository (55 files before this milestone); CI doesn't enforce it. Decide whether to reformat once.
