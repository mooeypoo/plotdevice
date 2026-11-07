# Milestone 22: Export

Status: **Built** (2026-11-07), as draft PR #52. Approved by the owner the same day; see [Owner's answers](#owners-answers-2026-11-07) and [Results](#results). Direction from `docs/features/import-export.md` ("What's decided", owner, 2026-11-07) and the Export window mockup (https://claude.ai/artifact/WDPasrrPNB4RgsKoas9sxU). This number replaces the roadmap's old Milestone 22 ("Word in and out, and backups"): backups were built in Milestone 20, and import becomes its own milestone after this one.

## Goal

Let a writer send their book out in the files other people expect:

- **Word**, for editors and publishers, who edit it and mark changes;
- **PDF**, for anyone to read on any device;
- **E-book (EPUB)**, for e-book readers and e-book stores.

All of these come from one short Export window, in Hebrew and English, without technical choices.

**Out of scope** (owner, 2026-11-07):

- **Print-ready PDF** (trim sizes, mirrored margins, typesetting for print). It's left to services made for it.
- **Import from Word.** It's the next milestone, and reuses this one's "Word ↔ our formatting" table.
- **`.doc`, RTF, ODT, MOBI and Amazon's KPF.**
- **Uploading anywhere.** Export writes a file on the computer and sends nothing.

## What I found in the code

- **Export today (Milestone 6):**
  - It's **Export book…** in the book menu (`TopBar.vue`). It saves one Markdown file, named after the book, beside the book's folder (`project-ipc.ts`, `compileBook`).
  - `compileManuscript` (`packages/storage/src/compile.ts`) builds it from `compiledBook` in the domain. That gives parts and chapters in reading order, with headings following the book's numbering style.
  - Chapters that can't be read are reported, never silently left out.
- **The book's details:**
  - Title, author and language are in `project.md`. A new book always gets a title, but it can still be "Untitled project", and the author can be empty.
  - **There's no way yet to change the title or author after the book is created.** The Export window will be the first. The app already writes other `project.md` keys with targeted frontmatter patches, so this follows the same pattern.
- **Chapter numbering** is `continuous`, `per-part` or `none` (`project.md`). The headings in the export follow it.
- **Markdown reading:** `packages/markdown` already turns chapter text into a tree with `mdast`. Pandoc's direction notation (`::: {dir=ltr}`, `[…]{dir=ltr}`) is only understood by the editor today (`editor-codemirror`), not by the Markdown package.
- **There's no word count anywhere** in the app.
- **Fonts:** the app bundles Literata, Noto Serif Hebrew, Instrument Sans and Assistant (`@fontsource-variable`, SIL Open Font License).
- **Zips:** `fflate` is already used for backups. An EPUB is a zip file, so it can use the same library.
- **App data records** (`createAppDataFile`) already keep per-book things such as the backup folder, keyed by the book's folder. The remembered export choices fit there.

## What the author will see

### The Export window

**Export…** in the book menu opens one window, as in the mockup.

**Format:** Word · PDF · E-book · Markdown, with one line under the choice saying who it's for.

**Title page** (Word and PDF):

- **Include a title page** is on at first.
- **Title** and **Author** are filled in from the book.
- **Show the word count** is on at first: "about 84,000 words".

**Title and author** (every format):

- If the title is empty, or still "Untitled project", the field is highlighted, with: "This book doesn't have a title yet. The title you type here is saved to the book's Details."
- Typing a title or author saves it to the book (`project.md`) when the author presses Export…. A small "Saved to the book's Details" note confirms it.
- There's no separate "export title": it's the book's one title.

**Chapters:**

- **The whole book (24 chapters)** is the default.
- **Choose chapters…** opens a list of chapters with ticks, and three shortcuts: **First three** (for a sample), **All**, **None**. Parts are shown as group labels.
- The word count always counts the whole book.

**Chapter headings** (every format): **"Chapter 1" and its name**, or **Only its name**. When the book's numbering is "none", this choice is hidden and headings are the name only.

**Look** (Word and PDF):

- **Double-spaced, for editors**, on at first.
- **Paper size:** A4 or US Letter. It starts from the computer's region (Letter in the US and Canada, A4 elsewhere) and can be changed.

**Cover** (E-book): **Choose a picture…**, optional.

**At the bottom:**

- "Saves as The Salt Orchard.docx";
- **Cancel** and **Export…**, which asks where to save. The suggested folder is beside the book's folder, never inside it.

**Choices are remembered for each book.** The next time, the window opens the way it was left. Chosen chapters are remembered by file, so renaming a chapter doesn't lose its tick.

**Problems are named before saving.** For example: "Chapter 7, The Well, can't be read, so it will be left out." The author can still export.

**After saving:** a notice says "Exported The Salt Orchard.docx", with **Show in folder**.

### What's in each file

**For all formats:**

- **Order:** parts and chapters follow the book's order, exactly as the book menu shows it. Part names become part pages (Word, PDF) or part headings (E-book, Markdown).
- **Formatting kept:** paragraphs, headings inside chapters (one level below the chapter's title), bold, italic, quotes, bullet and numbered lists, line breaks, and links (as text, plus the address in Word and PDF).
- **Scene breaks** (`* * *`) stay `* * *`, centred.
- **Direction:**
  - Hebrew books are right to left throughout, and English books left to right.
  - A paragraph or phrase the author marked with the other direction keeps it.
  - Text is aligned to the start of its direction, never centred, except headings and scene breaks.
- **Left out:** frontmatter, notes in chapter files, and everything under Story and World. Only chapters are exported.
- **Never changed:** the book's own files, except the title and author when the author types them.

**Word (`.docx`):**

- Standard manuscript look:
  - 12pt, double-spaced (or 1.5 when the switch is off);
  - 2.5 cm (1 inch) margins, first lines indented;
  - each chapter on a new page, its heading a third of the way down.
- A header on every page except the title page: "Varga / THE SALT ORCHARD / 12". In Hebrew it's "ורגה / פרדס המלח / 12", with no capitals.
- Uses Word's own styles (Title, Heading 1, Heading 2, Normal), so an editor can restyle the whole file at once. Hebrew paragraphs are marked right to left the way Word expects.
- **Font:** Times New Roman for English. For Hebrew, David Libre is packed into the file, with David (which comes with Windows and Office) as the fallback where the packed font isn't shown, as in Google Docs or LibreOffice.

**PDF:**

- The same pages as Word, with the app's own fonts (Literata, Noto Serif Hebrew) packed into the file, so it looks the same on every computer.
- On the paper size chosen in the window.

**E-book (EPUB 3):**

- Each chapter is its own section, with a table of contents built from the chapter headings and part names.
- The cover picture, if chosen.
- Title, author and language in the e-book's details. Hebrew books turn their pages right to left.
- No fonts are bundled: e-book readers use their own fonts and let the reader choose. The styling is light, so the reader's settings win.

**Markdown:** today's export, plus the new choices of chapters and chapter headings.

## Decisions (proposed)

1. **One new package, `@plotdevice/export`**, in the infrastructure layer. It turns a book into Word and EPUB bytes. It writes no files itself. The desktop app saves them through the existing safe write for files outside the book.
2. **One shared "exported book" model.** It's built once from the chapters and given to every format: parts, chapters, and blocks of paragraphs, headings, lists, quotes and scene breaks, each with its direction. This is the "Word ↔ our formatting" table that import will reuse in reverse.
   - It lives in `packages/markdown`, which already reads the Markdown tree. It also learns to read Pandoc's direction notation there, matching what the editor writes.
3. **Word via the `docx` library** (MIT licence, no native code). It supports right-to-left paragraphs and runs, page headers with page numbers, page breaks and styles.
4. **PDF via Electron's own `printToPDF`:**
   - The exported book is rendered as a styled HTML page in a hidden window, with the bundled fonts, and printed to PDF.
   - Chromium already shapes Hebrew and mixed-direction text correctly, which PDF libraries don't.
   - It lives in `apps/desktop` (main process), since it needs Electron. The HTML it prints comes from `@plotdevice/export` and can be tested without Electron.
   - The hidden window loads only that page: no network, no scripts, and the strict Content-Security-Policy.
5. **EPUB written by us,** with `fflate`. It's a zip file of XHTML pages, a table of contents and a package file. That's small, and avoids a heavy library.
6. **Word count in the domain:** a pure function over chapter text, ignoring formatting marks and direction notation. It counts runs of letters or digits, so Hebrew prefixes and maqaf-joined words count as most word processors count them.
   - **Rounding:** to the nearest 1,000 at 10,000 words and above; to the nearest 100 below that; the exact count under 1,000.
7. **Title and author** are saved with a targeted patch of `project.md`'s frontmatter, like the other keys the app writes. Key order, comments and unknown keys are kept. Typed text is trimmed. The book's folder name never changes.
8. **Remembered choices** go in a new app data record, `export`, keyed by the book's folder:
   - format, title page, word count, chapter headings, double-spacing, paper size;
   - chosen chapters by file;
   - the cover picture's path on the computer. It's never copied into the book; that may change later.

   If the cover picture has moved or been deleted, the window shows it as missing ("The cover picture can't be found") with **Choose a picture…** and **Remove**. Export works without it.
11. **Paper size from the region:** the operating system's locale (`app.getLocale()`/the system region) gives the default: Letter for the US and Canada, A4 for everywhere else. Once the author changes it for a book, that choice is remembered for that book.
9. **Export… replaces "Export book…"** in the book menu, under the same place. The keyboard shortcut, if any, carries over.
10. **New interface messages** come with translator notes in `qqq.json`. Hebrew is reviewed by the owner. The working-name rule applies: the book's word for chapters (Milestone 18) is used in headings ("פרק 1", "Session 3").

## Files

- `packages/domain`: `word-count.ts` (counting and rounding); export choices as a type with defaults.
- `packages/markdown`: `exported-book.ts` (chapter text to blocks, with direction); `direction-notation.ts` (reading Pandoc's `dir`), shared with the editor's rules where possible.
- `packages/export` (new):
  - `docx.ts`
  - `epub.ts`
  - `print-html.ts` (the HTML the PDF is printed from)
  - `styles/` (manuscript and e-book CSS)
- `packages/storage`: `compile.ts` grows an `exportBook(folders, snapshot, choices)` that reads the chapters and builds the exported book. The Markdown output keeps its current shape.
- `packages/fs-node`: the `export` app data record; the targeted `project.md` patch for title and author, if it isn't already general.
- `apps/desktop`:
  - IPC channels for opening the window's data, saving the details, and exporting;
  - `print-to-pdf.ts` (the hidden window);
  - the save dialog with the right file type.
- `packages/ui-vue`: `ExportDialog.vue`; TopBar's menu item.
- `packages/i18n`: English, Hebrew and `qqq.json` messages.
- `apps/site`: the guide's "Export" page rewritten (English and Hebrew), with screenshots. The Pandoc advice is removed.
- `samples/`: nothing changes. Both sample books are the test books.

## Tests

Tests come before code, as the agents' rules ask for this highest-risk area.

- **Word count:** English, Hebrew with prefixes and maqaf, mixed text, formatting marks, direction notation and scene breaks are not words; rounding at its edges.
- **The exported book:** for each kind of formatting, in Hebrew and English, the blocks and their direction. Chapters that can't be read are reported. The chosen chapters come out in the book's order. Parts are kept only when one of their chapters is chosen.
- **Word:** each sample book is exported, unzipped, and its `document.xml` checked:
  - right-to-left paragraph marks on Hebrew;
  - styles used;
  - page breaks before chapters;
  - header text;
  - no title page when it's off;
  - the word count line only when it's on.

  Fixture comparisons, plus a check that the file opens in LibreOffice in CI (converting it to PDF without errors), since Word itself can't run there.
- **EPUB:**
  - the structure, the package file (language, `page-progression-direction="rtl"` for Hebrew) and the table of contents;
  - valid XHTML in every chapter;
  - **EPUBCheck** (the standard validator) runs in CI on both sample books.
- **PDF (end to end, packaged app):**
  - export both sample books;
  - check the page count is sensible, the fonts are embedded, and the text can be extracted in the right order, Hebrew included;
  - a screenshot of the first chapter page in Hebrew and English for review.
- **Export window (component and end to end):**
  - options appear only for their format;
  - the missing-title warning;
  - typing a title saves it to `project.md`, touching only that key;
  - First three, All and None;
  - choices are remembered after reopening;
  - the paper size starts as Letter for a US region and A4 otherwise;
  - a cover picture that was moved shows as missing, and export still works;
  - a chapter that can't be read is named;
  - Cancel changes nothing.
- **Safety:** the book folder's files are byte-for-byte unchanged after any export, except `project.md` when the title or author was typed.
- **Architecture:** dependency-cruiser rules for the new package (no UI or Electron in `@plotdevice/export`).

## Work order

1. Word count and the exported-book model, with direction notation (domain and markdown), with their tests.
2. EPUB: it's the simplest writer, and EPUBCheck gives a strict outside check early.
3. Word.
4. PDF: the print HTML, then the hidden window in the desktop app.
5. The Export window, remembered choices, and saving the title and author.
6. The guide pages, the screenshots and the Hebrew wording for review.

Each step is a commit on one branch. There's one draft PR for the milestone, as before.

## Owner's answers (2026-11-07)

1. **Hebrew font in Word:** David Libre packed into the file, with David as the fallback.
2. **Paper size:** a choice in the window (A4 or US Letter), with the default from the computer's region.
3. **Cover picture:** remember where it is on the computer; show it as missing if it moved. Copying it into the book may come later.
4. **"First three"** stays, for sending sample chapters.

## Results

### What the author can do

- **Export…** in the book menu opens the Export window: Word, PDF, E-book or Markdown, showing only the choices that apply.
- **Word:** a standard manuscript in Word's own styles, with a title page (name, rounded word count, title, byline), "Surname / TITLE / page" on every page after it, double or 1.5 spacing, A4 or Letter. Hebrew paragraphs are right to left, and Hebrew text uses David Libre, packed into the file, with David named as the fallback. The font is packed only when the book has Hebrew text.
- **PDF:** the same manuscript in the app's own fonts (Literata, Noto Serif Hebrew), printed by Electron. It has a document outline (bookmarks) and is tagged for accessibility. The title page isn't counted, so the book starts at page 1, as in Word.
- **E-book:** EPUB 3 with a title page, a table of contents (chapters inside their parts), an optional cover, and right-to-left page turning for Hebrew.
- **Markdown:** as before, with the new chapter and heading choices.
- **Choosing chapters:** with First three, All and None. Chapters keep their whole-book numbers.
- **Title and author** typed in the window are saved to `project.md` (two lines, nothing else changes).
- **Remembered:** the choices are kept for each book, in app data. A cover that has moved shows as missing, and export still works without it.
- **Safe:** files are written beside the book, never inside it. Book files are byte-for-byte unchanged, except `project.md` when the title or author was typed.

### Changed from the plan while building

- **Links** in Word and PDF stay clickable rather than written out with their address. Only web and email links become links; anything else (a link to a page in the book, `javascript:`, files) stays text.
- **Direction setting:** there's no per-author direction setting in the preferences yet, so unmarked paragraphs follow the book's language, as the editor shows them. The reading code supports the "first letters" mode for when the setting exists.
- **The old Export book… flow** (`compileBook`) is gone. Markdown goes through the window, and its headings use the book's word for chapters ("Chapter 4: Frost").
- **Paper regions:** Letter for the regions CLDR lists as using it (the US, Canada, Mexico, parts of Central and South America, the Philippines), A4 elsewhere.
- **Fonts for the PDF** come from the font packages the app already bundles, so no new font files were needed. David Libre (OFL 1.1) is a new file in `apps/desktop/resources/fonts`, listed in About.

### Found and fixed along the way

- **The layer rules skipped every `dist/` folder,** libraries' own included, so imports of libraries kept there (such as `docx`, or `vitest`) were never judged. Now only the project's own build output is skipped, with a regression test.
- **A Mac CI failure on main:** the file-watching test expected exact events, and macOS reports a file written just before watching began a moment late.
- **Vue's reactive objects can't be sent over IPC;** the window sends a plain copy (found by the end-to-end tests).
- **Chromium counted the title page** in the page numbers; `@page title { counter-increment: page 0 }` fixes it.

### Tests

- Domain: word count (English, Hebrew prefixes, maqaf, gershayim, niqqud, mixed text) and rounding; the book's outline with chosen chapters; the export choices and paper by region.
- Markdown: chapters read into blocks, every kind of formatting, direction marks (paragraphs, phrases, list items, unfinished and crossing marks), and that code, tables and HTML stay text.
- Export: HTML escaping and safe links; EPUB structure, order, contents and cover; Word paragraphs, runs split by script, styles, lists, headers, paper, spacing and the packed font; the print page's CSS, escaping and page rules.
- Storage, on real files: reading for export, directions, chosen chapters, missing chapters, nothing changed; saving the title and author.
- **EPUBCheck** checks both sample books' e-books, and **LibreOffice** opens both sample books' Word files, in CI on Linux. The Hebrew one is checked for the packed David Libre font.
- IPC: each format, cancelling, saving details, remembered choices, cover rules, refusing what the host didn't offer.
- End to end (packaged-style app): Word, PDF (real printing, page size checked), e-book with a title typed in, chosen chapters and remembered choices, options per format, cancelling.
- Commands: `pnpm lint`, `pnpm typecheck`, `pnpm test` (1,465 passed; EPUBCheck and LibreOffice run in CI), `pnpm arch` (179 passed), `pnpm build`, and the export end-to-end tests.

### Known limitations

- **Word itself** isn't in CI. LibreOffice stands in, and Google Docs' handling of the packed font (it falls back to its own Hebrew font) is untested.
- The **Hebrew wording** (window, notices and guide page) is a first draft for the owner's review.
- The guide's **screenshot of the window** is taken by the docs workflow; it can't be seen locally until `pnpm site:screenshots` runs.
- The Hebrew guide page `start/first-book.mdx` was already behind its English page before this milestone; it's left flagged.
