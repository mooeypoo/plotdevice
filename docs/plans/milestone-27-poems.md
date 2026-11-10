# Milestone 27: Poems, a poetry template and niqqud

Status: **Built** (2026-11-10). Approved by the owner on 2026-11-10 with the recommended answers to the open questions (Ctrl+Shift+N for niqqud, no shortcut for Poem, Hebrew wording written for review). Built on [ADR 0013](../adr/0013-poems.md), accepted on 2026-11-10 with the recommended answers. Stacked on Milestone 26 (`milestone-26/download-page`, PR #57), because the site pages it changes are there.

## Goal

A poet can start a **Poetry collection** („ספר שירה”), write poems where Enter is a new line and Enter twice is a new stanza, add niqqud without hunting for keyboard tricks, and export a book that looks like a poetry book. Any chapter in any book can be a poem.

The guide explains the Poem switch. The front page and the comparison page show that Plot Device handles many kinds of writing.

**Out of scope:**

- A poem block inside a prose chapter (ADR 0013, Rejected).
- Short poems sharing a page in export.
- Automatic niqqud.
- A poetry row in the comparison table.
- Line and poem counts (word count stays as it is).
- Detecting poems when importing from Word: imported chapters are prose, and the author switches them.

## What I found in the code

- **Line breaks already work end to end.** Shift+Enter writes `\` plus a newline (`lineBreak`, `packages/editor-codemirror/src/keys.ts`). The editor hides the `\` (`hidden.ts`). Word import writes them (`imported-chapter.ts`). HTML export turns them into `<br/>` (`packages/export/src/html.ts`). So a poem needs no new Markdown.
- **The prose layout lives in three places:** EPUB (`epub.ts`, `p { text-indent: 1.5em }`), print/PDF (`print-html.ts`, `text-indent: 0.5in`) and Word (`docx.ts`, first-line indent and its paragraph styles). Each needs a poem variant.
- **The Format menu** already has a "mode" group with the Plain text switch (`plainTextItem`, `packages/ui-vue/src/components/format-items.ts`). The Poem switch joins that group.
- **Chapter names are renamable, part names aren't.** `manuscriptUnit` flows through domain, contracts, storage, application and `use-kinds.ts`. The part labels ("New part", "Rename part…", "Part name") are fixed i18n messages. `partUnit` follows the `manuscriptUnit` path.
- **Templates are data** in `packages/templates` (`WORDS`, `starters/en`, `starters/he`). Adding one means words, a starter outline in each language, and the picker's card.
- **Niqqud is already safe:** search ignores it (`references.ts`), word count and file-name collisions handle it, and CodeMirror's Backspace removes only the last mark.
- **The site:** the template list is in `docs/start/first-book.mdx` (and its Hebrew copy). The file-format pages are `docs/technical/files/chapters.mdx` and `folder.mdx`. The front page is `components/pages/Home.astro` with its words in the site's i18n catalog. The comparison page is `components/pages/Compare.astro` with data in `compare.ts`.

## What the author will see

### The Poem switch

- **Format menu → Poem** („שיר”), a checked item beside Plain text. It applies to the open chapter.
- A quiet "Poem" / „שיר” label next to the chapter title while it's on.
- **Enter** is a new line. **Enter twice** (or Shift+Enter) is a new stanza. **Backspace** at the start of a stanza joins it to the one above.
- **On screen:** no first-line indent; a long line wraps with an indent so you can see where it really ends.
- **Pasting** several lines keeps each line, and blank lines become stanza breaks.
- Switching it on or off changes only how the chapter behaves and looks; the words are never changed (ADR 0013, point 4).

### The Poetry collection template

- A fifth card in the picker: **Poetry collection** / **ספר שירה**, with "Notes · Order of the collection · poems".
- It makes: Notes; poems instead of chapters; sections („אסופה / אסופות”) instead of parts; one empty poem ready to write; the starter outline "Order of the collection" („סדר הספר”) with three sections; suggested tags Draft and Ready („טיוטה”, „מוכן”).
- It opens in Write on the empty poem.
- **Book menu → New chapters are poems** („פרקים חדשים הם שירים”), a checked item next to "Kinds of pages…". It's on for a poetry collection and off for the other templates; any book can turn it on.

### Untitled poems

- A poem's title can be left empty. The sidebar, the contents and the export's table of contents show its first line in italics. The export prints no heading above it.

### The niqqud picker

- **Format menu → Niqqud…** („ניקוד…”) and a shortcut, in any chapter or page. It's offered whenever the letter before the cursor is Hebrew.
- A small panel next to the cursor shows the letter as it is now and the marks you can add: vowels, dagesh, and the shin and sin dots. Each mark is a button with its Hebrew name („קָמָץ”, „פַּתָּח”, …) as its label for screen readers.
- Clicking a mark adds it; clicking a mark that's already there removes it. The letter updates as you click (`ב → בָ → בָּ`). Arrow keys move to the next or previous letter without closing the panel, so a whole word can be voweled in one go. Esc closes it.

### Export

- A poem chapter: no indent, no justification or hyphenation, lines kept, a gap between stanzas, long lines continuing with an indent, a new page per poem.
- Markdown export is unchanged.

## Changes

| Area | Change |
|---|---|
| `packages/domain` | `ChapterForm`; read `form` from chapter frontmatter; `Project.partUnit`, `Project.chapterForm`; an untitled poem's display name from its first line |
| `packages/markdown` | targeted patches for `form` (chapter) and `partUnit`, `chapterForm` (`project.md`); new chapter files take `form: poem` when the book's `chapterForm` says so |
| `packages/contracts`, `application`, `storage` | carry `form`, `partUnit`, `chapterForm`; commands to set a chapter's form and the book's default |
| `packages/editor-codemirror` | poem form in a compartment (no remount); `poemLine`, stanza Backspace, poem paste; poem layout class; the niqqud picker's insert and remove commands |
| `packages/ui-vue` | Poem item in the Format menu and the chapter label; "New chapters are poems" in the book menu; part labels from `partUnit`; the niqqud panel; the fifth template card |
| `packages/templates` | `poetry` template; `starters/en/collection.md`, `starters/he/collection.md` |
| `packages/export` | poem layout in EPUB, print/PDF and Word; untitled poems in the contents |
| `packages/i18n` | new messages in English and Hebrew, each with a translator's note in `qqq.json` |
| `tests/fixtures` | an invented poem in English and one in Hebrew with full niqqud, CRLF and direction-mark variants |
| `docs/` | `DOMAIN_AND_FILE_FORMAT.md` 0.7, `UX_SPEC.md`, ADR notes on 0004, 0006 and 0011 |

## The site (English and Hebrew)

- **Guide:**
  - **Your first book:** Poetry collection in the template list.
  - **A new page, "Writing poems":** the Poem switch, Enter and Enter twice, what changes when you switch it on and what stays when you switch it off, untitled poems, how poems export, and the niqqud picker.
  - **Chapters and parts:** parts can have another name, such as sections in a poetry collection.
  - **Formatting:** a pointer to "Writing poems".
  - **Hebrew and English:** a short section on niqqud.
  - Guide pages contain no file names or Markdown (Milestone 25).
- **Technical docs:**
  - **The chapter file:** `form: poem`.
  - **The book folder:** `partUnit` and `chapterForm`.
  - **The guide for AI assistants** (`for-assistants.md`, `llms.txt`).
- **Front page:** a new band, "One app, many kinds of writing" („אפליקציה אחת, הרבה סוגי כתיבה”). It shows four small screenshots, one per template (novel, short story, poetry collection, campaign), each with one line. The Hebrew page shows the Hebrew poem with niqqud.
- **Comparison page:** a new section in the text, not a table row, on handling different kinds of writing in one app. It talks only about Plot Device, so it needs no sources. The table is unchanged.
- **Screenshots:** new shots added to `screens.shots.ts`: the template picker with five cards, a poem in each language, and the niqqud panel. All are taken from invented samples.

## Tests

- **Round-trip:** opening and saving a poem without changes is byte-identical, in English and in Hebrew with niqqud, including CRLF and direction marks. Switching the form on and off changes exactly one frontmatter line. An unknown `form` value is kept as written.
- **Typing:** Enter, Enter twice, Shift+Enter, Backspace at a stanza start and paste each produce the expected text. They're tested in both directions and with the file's own line ending.
- **Switching:** the editor isn't remounted (the existing remount guard).
- **Templates:** a Poetry collection in each language passes the project check with no warnings, has the right `project.md` keys and one poem file with `form: poem`. New chapters in that book are poems; in a novel they aren't.
- **Parts:** with `partUnit`, the interface says "New section" / „אסופה חדשה”; without it, nothing changes.
- **Niqqud picker:** adds and removes each mark; works when the marks were typed in a different order; never reorders existing marks; works at the start of a line and with right-to-left selections; Backspace after a picked mark removes only that mark; keyboard-only use and screen-reader labels (axe).
- **Export:** snapshots for a poem in EPUB, print HTML and Word in both languages. They check for no indent, line breaks, a gap between stanzas, a hanging indent and an untitled poem in the contents.
- **Site:** the existing site tests (links, axe, both languages) pass with the new pages and bands.
- **Spell check:** a manual check, on Linux and Windows, of whether words with niqqud get underlined. The result is recorded in the milestone report.

## Open questions

1. **The niqqud shortcut.** **Recommended:** Ctrl+Shift+N (⌘⇧N on a Mac), by key position so it works with a Hebrew keyboard, like the Plain text shortcut. The app has no other use for it.
2. **The Poem switch shortcut.** **Recommended:** none. It's a per-chapter setting you change rarely, and the menu is enough.
3. **Hebrew wording.** The new Hebrew messages, the starter outline and the sample poem go on the Hebrew review list, as with earlier milestones. **Recommended:** I write them; you review them before merging.

## Results

**What works:** a Poetry collection in English and Hebrew; the Poem switch in the Format menu; "Start new chapters as poems" in the book menu; Enter, Enter twice, Shift+Enter, Backspace and paste in poems; untitled poems named by their first line as it's typed; poems in PDF, EPUB and Word; naming parts; the niqqud picker in chapters and pages. The guide ("Writing poems", and the other pages listed above), the technical docs, the guide for AI assistants, the front page band and the comparison section are in both languages, with new screenshots.

**Differences from the plan** (see ADR 0013, implementation note):
- In Word, each poem line is its own paragraph (a hanging indent can't work with line breaks inside one paragraph).
- Above the page, an untitled poem says "Untitled poem"; its first line is already right below it. The sidebar shows the first line.
- The "Poem" / "Prose" label beside the chapter's number shows only when a chapter's form differs from the book's new chapters.
- Fixed on the way: Backspace (and Delete) next to a line break no longer leaves a stray `\` visible, in prose too.
- Also changed: the template cards fit five in a row; menus can have checked items.

**Tests** (2026-11-10):
- `pnpm lint`, `pnpm typecheck`: clean.
- `pnpm test`: 107 files, 1612 passed, 4 skipped. New: `editor-codemirror/src/poem.test.ts` (typing, stanzas, Backspace, paste, niqqud), `storage/test/poems.test.ts` (form on and off byte for byte, unknown forms kept, untitled poems, the book's default, the project check, export reading), `export/src/poems.test.ts` (EPUB, PDF, Word), template and kinds tests.
- `pnpm arch`: 189 passed. `pnpm perf`: 8 passed.
- `pnpm e2e`: 140 passed, after updating two tests for the new book-menu item and bridge methods. New: `e2e/poems.e2e.ts` (a Hebrew collection with lines, stanzas, an untitled poem and niqqud; the Poem switch in an English book).
- Site: `pnpm site:build`, `pnpm site:test` (68 passed, 1 skipped in CI only), `pnpm site:translations` (all up to date), `pnpm site:screenshots` (8 passed).

**Known gaps:**
- Hebrew wording to review (`docs/reviews/hebrew-wording-milestone-16.md`, "Added in Milestone 27"), including the guide's „בית / בתים” for stanzas.
- Spell check on words with niqqud wasn't checked by hand on Windows and Linux yet.
- The Format menu is taller than a 900-pixel window and scrolls; Poem and Plain text are at its end.
- Niqqud… has no icon in the Format menu.
