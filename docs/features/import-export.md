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
