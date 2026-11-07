# Milestone 23: Import from Word

Status: **Proposed** (2026-11-07), waiting for the owner's approval. Direction from `docs/features/import-export.md` (owner's decisions on import, the Mammoth spike, and the preview), and the mockup at https://claude.ai/artifact/JXTWUgYXoq6igbURxgcFoy.

## Goal

Let a writer bring a manuscript they already have in Word into Plot Device:

- **as a new book**, from the start screen; or
- **as chapters added to the open book**, from the book menu.

They see first how it splits into chapters, and change it if they need to. The Word file is never changed, and nothing of theirs is ever overwritten.

**Out of scope** (owner, 2026-11-07):

- **Bringing an editor's changes back** into existing chapters (round trips).
- **Formats other than `.docx`.** Google Docs and LibreOffice users save as `.docx`; Scrivener may come later.
- **Characters, places and notes:** chapters only. World material still comes in by hand or with an assistant (Milestone 13).
- **A free-text prefix** for "Chapter" lines; splitting by hand covers other words.
- **Placing added chapters** anywhere but a new part at the end.

## What I found in the code

- **Making a book** (`repository.create`): the author chooses a location, and Plot Device makes a new folder there, named after the title, refusing one that already exists. Every file is then written as new, never over another. Import uses the same steps, so the book's folder is always new and empty.
- **Adding chapters:**
  - `chapterFileFor` gives a new chapter a file name that doesn't collide with any other.
  - `newChapterFile` writes its frontmatter (title, id).
  - `editContents` adds parts and chapters to `CONTENTS.md` by splicing, with the revision checked.
- **HTML to Markdown:** `packages/markdown/src/paste.ts` already turns pasted HTML into clean Markdown, the same job Mammoth's output needs.
- **The formatting table** from Milestone 22 (`readChapterForExport`) describes what Plot Device keeps: paragraphs, headings, italic, bold, quotes, lists, links, line breaks and scene breaks. Import produces Markdown in exactly that shape, with direction marks only where needed (ADR 0004).
- **Fonts, zips and safe writes** already exist: `fflate`, `writeAtomically`, and the ProjectFolders port.

## What the author will see

### New book from a Word file

1. **The start screen** (and **New project…**) has a new choice beside the templates: **From a Word file…**. It opens the file picker for `.docx` files.
2. **Check the chapters** (see the preview, below).
3. **Book details:**
   - **Title** and **Author**, filled in from the Word file and marked "From the Word file". They come from the file's own details, or else from its title page.
   - **The book's language**, guessed from the text (Hebrew when most letters are Hebrew).
   - **Where to keep it:** the usual new-project location, with **Change…**. Plot Device makes a new folder there named after the title, as for any new book, so it's always empty and nothing is overwritten.
   - Then **Make the book with 12 chapters**.
4. **The new book opens,** its chapters in the file's order, with parts. A notice repeats what didn't come in.

The new book is like a "Blank book" from the templates: chapters, the default kinds of pages, and no outlines.

### Add chapters from a Word file

1. **Book menu → Add chapters from a Word file…**, then the file picker.
2. **Check the chapters**, ending with **Add 4 chapters at the end**.
3. **The chapters are added at the end of the book:**
   - **If the Word file has no parts,** they go into one new part named after the Word file's title (or its file name), which can be renamed in the preview.
   - **If the Word file has parts,** they come as those parts.
4. **The book's details aren't changed.** If the Word file's title or author differs from the book's, a notice says so, with **Use the file's title and author** and **Keep this book's**. Nothing changes unless the author chooses.

### The preview (both ways)

- **"Split into chapters by":**
  - **Headings** (Word's heading styles; bigger headings become parts);
  - **"Chapter" lines** (lines like "Chapter 3", "Chapter Three", "פרק 3", "פרק שלישי", "פרק ג׳");
  - **Page breaks.**

  Plot Device picks the first that finds more than one chapter, and the author can switch.
- **A list of chapters,** grouped by part, each with its word count. Click a name to rename it, untick a chapter to leave it out, or use **Join with the chapter above**.
- **The selected chapter's text**, as it will come in. Any paragraph offers **＋ New chapter here** on hover or keyboard focus.
- **Chapter names:** "Chapter 3: The Crossing" becomes "The Crossing", since Plot Device numbers chapters itself. A heading that's only "Chapter 3" keeps its text, ready to rename.
- **The title page:** what comes before the first chapter isn't imported. It fills in the title and author.
- **What won't come in, said plainly:**
  - "2 comments, 1 picture and 1 table won't come in."
  - "Tracked changes are taken as accepted."
  - "1 footnote is kept at the end of its chapter."
- **Cancel** at any point changes nothing.

### In the chapters

- Paragraphs, italic, bold, headings inside chapters, quotes, lists and links come in as Plot Device keeps them.
- `* * *`, `***` and a lone `#` become scene breaks.
- **Footnotes** keep their mark, as `[^1]` in the text, and the notes are listed at the end of the chapter (`[^1]: …`), numbered from 1 in each chapter. The editor shows them as plain text for now.
- **Direction:** a paragraph with no letters in the book's direction (an English paragraph in a Hebrew book) gets a direction mark. A phrase in the other direction inside a paragraph needs none, as in the editor.

## Decisions (proposed)

1. **A new package, `@plotdevice/import`** (infrastructure), beside `@plotdevice/export`.
   - It turns `.docx` bytes into an imported manuscript: paragraphs with what Word says about them (heading level, Title style, page break before, scene break, footnotes), the counts of what's left out, and the file's title and author.
   - It uses **Mammoth** (BSD-2-Clause) for the text, with a style map for titles, quotes and page breaks, and **fflate** for our own counts and `docProps/core.xml`.
   - No file access. It runs in the main process only.
2. **Splitting is domain logic** (`packages/domain/src/import/`). Pure functions take the paragraphs, the split choice, the author's own starts and joins, renames and left-out chapters, and give parts and chapters. The "Chapter" line patterns (English and Hebrew, digits, number words, Hebrew letters as numbers) and the name rules live there too.
3. **The preview round-trips to the main process:** each change (split choice, a join, a new start) asks the host for the chapters again. This keeps the page free of domain code, as the architecture rules require. A manuscript's paragraphs stay in the main process for the whole import; the page names the file only by the import the host started.
4. **Markdown is made by the markdown package,** from blocks, reusing the pasted-HTML conversion. Footnotes and scene breaks are added there.
5. **Storage:**
   - `createBookFromImport` reuses `create`'s steps: a new folder and every file written as new.
   - `addImportedChapters` writes the new chapter files first (as new files, never over another), then adds the part and chapters to `CONTENTS.md` with the revision checked. If that last step fails, the chapter files are still there, shown as "not in the book" so the author can add them. Nothing is lost.
6. **Untrusted input:**
   - Files over 50 MB are refused with a plain message.
   - Mammoth's HTML is parsed into blocks, never shown as markup.
   - A broken or password-protected file says so plainly: "This Word file can't be read."
7. **Messages** come with translator notes in `qqq.json`. Hebrew is reviewed by the owner.

## Files

- `packages/domain/src/import/`: `split.ts` (the three ways of splitting, starts and joins, parts), `chapter-lines.ts` (patterns and names, English and Hebrew), `front-matter.ts` (title and author from a title page), with tests.
- `packages/import` (new): `read-docx.ts` (Mammoth and the style map, then paragraphs), `docx-parts.ts` (counts and core properties, with fflate), with tests on fixture files.
- `packages/markdown`: `imported-chapter.ts` (blocks to Markdown: footnotes, scene breaks, direction marks), with tests.
- `packages/storage`: `createBookFromImport`, `addImportedChapters`, with tests on real folders.
- `packages/contracts`: `import.ts`: start, change the split, finish. Channels and API.
- `apps/desktop`: `import-ipc.ts` (the file picker, the import kept in the main process, finishing), wiring, and the 50 MB limit.
- `packages/ui-vue`: `ImportDialog.vue` (preview and details), the start screen's new choice, the book menu item, and the notice about a differing title.
- `packages/i18n`: English, Hebrew and translator notes.
- `tests/fixtures/word/`: `.docx` files written by a script in `tooling/` (Hebrew with headings and parts, English with "Chapter" lines and page breaks, sections, our own export), plus real files from Word, Google Docs and LibreOffice once the owner provides them.
- `apps/site`: a guide page, "Bringing in a Word file", in English and Hebrew, with a screenshot, and a link from "Moving an existing book in".

## Tests

Tests come before code where the logic is risky: splitting, names and Markdown.

- **Splitting:**
  - each way, on English and Hebrew;
  - parts from bigger headings;
  - "Chapter" lines in their forms: "Chapter 3", "CHAPTER THREE", "Chapter 3: The Crossing", "פרק 3", "פרק שלישי", "פרק ג׳" (not "Chapters of my life");
  - the title page left out and read for the title and author;
  - starts and joins, renames and left-out chapters.
- **Reading `.docx`:**
  - each fixture gives the expected paragraphs;
  - tracked changes are accepted;
  - comments, pictures and tables are counted;
  - footnotes are kept;
  - core properties are read;
  - a broken file, a password-protected file and a file over the limit are refused plainly.
- **Markdown:**
  - every kind of formatting;
  - footnotes per chapter;
  - scene breaks;
  - direction marks only where needed;
  - nothing in the text becomes markup.

  Round trip: our Word export of each sample book, imported again, gives the same chapters and text.
- **Storage, on real folders:**
  - a new book is complete, opens cleanly, and the project check finds nothing;
  - adding chapters puts a part at the end, touches no other file, and the book's details don't change;
  - a failed `CONTENTS.md` step leaves the chapters "not in the book", nothing lost;
  - the Word file is byte-for-byte unchanged.
- **IPC:** the page can't name a file the host didn't pick, or finish an import it didn't start.
- **End to end:**
  - a new book from the Hebrew fixture;
  - switching the split;
  - renaming, joining and starting a chapter by hand;
  - adding chapters to the open book, and the notice about a differing title, both choices;
  - cancelling at each step changes nothing.

## Work order

1. Fixture files and the script that writes them; the domain's splitting, "Chapter" lines and title page, test-first.
2. `@plotdevice/import`: reading `.docx` with Mammoth and our own pass.
3. Markdown for imported chapters, and the round trip with Milestone 22's export.
4. Storage: a new book from an import, and chapters added to a book.
5. IPC and the preview, then the two ways in (start screen, book menu), and the notice.
6. The guide pages, the screenshot, and the Hebrew wording for review.

Each step is a commit on `milestone-23/import`. There's one draft PR, on top of Milestone 22's.

## Questions for the owner

1. **The new book's folder:** the plan uses the usual new-project steps: choose a location, and Plot Device makes a new folder there named after the title, so it's always empty. Is that what you meant by "into an empty folder"? Or should the author be able to pick an existing empty folder?
2. **Real test files:** a short test document saved from Word (and Google Docs or LibreOffice if you use them), with a few Hebrew paragraphs, two chapters, a footnote, a comment and a tracked change. Not your novel.
