# Feature brief: importing and exporting

Status: **export planned** as Milestone 22 (`docs/plans/milestone-22-export.md`, 2026-11-07), waiting for approval; import comes after (owner, 2026-11-05, 2026-11-07). This is the starting point for a dedicated conversation: what's decided, what exists, and what to research before a plan. It replaces the roadmap's Milestone 22 for import and export (backups were built in Milestone 20).

## Why it matters

The audience is non-technical writers who mostly work in Word today (`PRD.md` §1–2, roadmap decision D1). Hebrew comes first, but English must work equally well. For them:

- **Bringing a book in** is the first barrier: a manuscript already lives in a `.docx`.
- **Sending a book out** is how they work with editors, publishers and readers. They need a file those people can open: Word, PDF, maybe an e-book.

## What's decided

**Order and scope (owner, 2026-11-07):**
- **Export first, import second.** They share one table of "Word formatting ↔ our formatting", designed once; export is built first because it only reads the book.
- **Export formats:** Word (`.docx`) and a manuscript PDF for sending the book to editors, publishers and readers; EPUB for e-books. Markdown (Milestone 6) stays. Other small extras (plain text) only if they cost little.
- **Print-ready PDF is out of scope** (trim sizes, mirrored margins, typesetting for print). Dedicated services do it better; the manuscript PDF is for reading, not printing a book.
- **Skipped:** `.doc`, RTF, MOBI/KPF, ODT (unless writers ask).

**Import (owner, 2026-11-07):**
- **Two operations:**
  - **New book from a Word file** always makes a new book. The author chooses an empty folder and fills in the book's details; the title and author are pre-filled from the Word file when it has them.
  - **Add chapters from a Word file…** (book menu) adds the chapters at the end of the open book and never changes its details. If the Word file names a title or author that differs, a note at the end offers to use it.
- **Splitting:** Plot Device guesses (headings, then "Chapter N" lines, then page breaks), shows the guess in the preview, and the author can change how it splits.
- **The preview (owner, 2026-11-07, after the mockup):**
  - The three split choices stay. Any paragraph can start a new chapter ("＋ New chapter here").
  - No free-text prefix for "Chapter" lines for now; splitting by hand covers other words.
  - **Added chapters go into a new part at the end** of the book, so they're easy to find and move. Nothing more elaborate for now.
  - **The title page isn't imported.** It's used to fill in the book's title and author.
- **Chapter names:** "Chapter 3: The Crossing" becomes "The Crossing", since Plot Device numbers chapters itself. A bigger heading above chapters becomes a part.
- **What can't come in:**
  - tracked changes: the text as it reads with them accepted;
  - comments, pictures and tables: left out.

  The preview says what's left out before anything is created.
- **Footnotes** keep their mark in the text, with the notes listed at the end of the chapter (Markdown footnotes: `[^1]` and `[^1]: …`).
- **Round trips** (bringing an editor's changes back into existing chapters) are out of scope.
- **Formats:** `.docx` only. Google Docs and LibreOffice users save as `.docx`; Scrivener may come later.
- **Library:** the owner leans towards Mammoth (no rewriting what exists); a spike checks it's good enough, especially for page breaks and right-to-left paragraphs.

**Spike: Mammoth (2026-11-07).** Mammoth 1.13 (BSD-2-Clause) is good enough, with three small additions of our own. It was tested on Word-style Hebrew and English files and on Plot Device's own Word export; the full notes are in `docs/spikes/word-import.md`, kept locally like the other spikes.
- **Comes through well:**
  - Hebrew and mixed text, italic and bold;
  - heading styles (including localized style ids) and the Title style;
  - page breaks (with a style map), even mid-paragraph;
  - tracked changes, read as accepted;
  - footnotes with their references;
  - lists and quotes.
- **Ours to add:**
  - **Counts for the preview:** Mammoth drops comments silently and keeps tables and pictures. A small pass over the zip (fflate) counts comments, tables and pictures for the preview, and reads the title and author from `docProps/core.xml`.
  - **Direction:** right-to-left paragraph marks aren't read. Direction is inferred from the text: a paragraph with no letters in the book's direction gets a direction mark.
  - **Scene breaks:** `* * *` and `#` lines are recognised as scene breaks.
- **Not a split point:** "next page" section breaks are ignored. "Chapter N" lines usually mark those chapters too, and otherwise the author splits in the preview.
- **Footnotes in the editor:** they show as plain text marks there today (`[^1]`), readable and kept exactly.
- **Still needed:** real files saved by Word, Google Docs and LibreOffice for the milestone's tests; the spike's files were written to match Word's format.

**The Export window (owner, 2026-11-07):**
- One **Export…** window with the choices, shown only where they apply: format (Word, PDF, E-book, Markdown); title page (title, author, show word count); the whole book or chosen chapters; double-spaced for editors (Word and PDF); an optional cover picture (E-book).
- **Include a title page** is a switch, on by default.
- A missing title (empty, or still the fallback "Untitled project") is pointed out in the window, not a block. **Typing a title or author there saves it to the book's details** (`project.md`), so there's one title, not an export title.
- The word count is rounded ("about 84,000 words").
- Choices are remembered per book. Problems, such as a chapter that can't be read, are named before saving.
- Page headers (author / title / page number) are always on for Word and PDF; no switch.
- **Chapter headings** are a choice: "Chapter 1" and its name, or only its name.
- **Choose chapters…** has three shortcuts: First three (for a sample), All, None.
- **Scene breaks** (`* * *`) stay `* * *` in every format. **Headings inside a chapter** stay headings, one level below the chapter's title; no warning.
- **Fonts:** Word uses common manuscript fonts (Times New Roman; David Libre for Hebrew). The PDF uses the app's own fonts (Literata, Noto Serif Hebrew), bundled into the file.
- Text is aligned to the book language's side (right for Hebrew, left for English), never centred, except headings and scene breaks.

- **Reading `.docx` is in scope, for chapters only** (D9). Characters, places and notes are still moved in by hand or with an assistant (Milestone 13's guide for AI assistants).
- **The import shows a preview first:**
  - how the document splits into chapters (by headings or page breaks);
  - with renaming and merging in the preview;
  - and only then are files created.
- **Import never touches the original:** the `.docx` itself is never changed, and nothing is written over an existing file.
- **Where it starts:** from the start screen, as one more way to start beside the templates, and from the book menu.
- **Export to Word** was "later, designed together first" (owner, 2026-11-04). It belongs to this feature now.
- **The book stays plain Markdown.** Import produces ordinary chapter files and `CONTENTS.md` entries. Export never changes the book.
- **Offline only.** Nothing is uploaded or converted by an online service ("sends nothing anywhere").

## What exists today

- **Export book…** (Milestone 6) makes one Markdown file, with Pandoc metadata and parts and chapters in reading order: `packages/storage/src/compile.ts`, `apps/site/src/content/docs/sharing/export.mdx`. The guide suggests Pandoc for Word, EPUB and PDF, which isn't realistic for this audience.
- **"Moving an existing book in"** (Milestone 13) is a guide page plus a guide for AI assistants (`apps/site/public/for-assistants.md`), with the project check that validates the result.
- **Pasting HTML** from a word processor already becomes clean Markdown (`packages/markdown/src/paste.ts`). That's useful prior art for reading Word's formatting.
- **There is no `.docx`, PDF or EPUB code,** and no library for them.

## To research before a plan

1. **Formats, in order of value for this audience.** Import: `.docx` first; then maybe `.odt`, Google Docs (as an exported `.docx`), Scrivener projects, plain text. Export: `.docx`, PDF, EPUB, print. Which are worth it, and in which milestone?
2. **Libraries:**
   - offline, in the main process;
   - licence compatible with GPL-3.0-or-later;
   - handles Hebrew and mixed-direction text (bidi, RTL paragraphs, nikkud kept intact);
   - size.
   Candidates to evaluate: mammoth or docx-preview for reading, docx for writing, a PDF route (Electron's own `printToPDF` from a styled HTML version is likely simplest).
3. **What's lost on import,** and how the preview says so plainly: comments, tracked changes, footnotes, images, tables, styles. ADR 0010 and the rendered editor decide what formatting survives.
4. **Splitting into chapters:** by heading level, page breaks, a chosen marker; and what parts become.
5. **What export looks like:** chapter headings, numbering (the book's word for chapters, Milestone 18), title page, author, page size, fonts for Hebrew, RTL page direction.
6. **Where the controls live,** and how many choices a technophobe can face: a short "Export as…" with sensible defaults?
7. **Round trips:** an editor's changes come back in Word. Is that in scope (tracked changes back into chapters), or explicitly not?

## Constraints

- **Architecture:** parsing and writing formats belong in infrastructure (`fs-node` or a new package). The domain stays pure. The layer rules are `.dependency-cruiser.cjs`.
- **New UI messages** come with translator notes in `qqq.json`. English is the source text. Hebrew is reviewed by the owner.
- **Fidelity is the highest-risk area** (AGENTS.md): byte-exact fixtures, Hebrew and English, and tests before code.
- **ADR 0005:** nothing is overwritten, and multi-file creation goes through safe writes.

## How to start the conversation

Read `AGENTS.md`, `docs/PRD.md`, this brief and the roadmap's "Change of order". Then:
1. research questions 1 and 2, and present findings;
2. mockups or a design session with the owner;
3. only then, a milestone plan for approval.
