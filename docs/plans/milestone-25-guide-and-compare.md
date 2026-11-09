# Milestone 25: The guide for writers, the technical docs, and how Plot Device compares

Status: **Built** (2026-11-09). Approved by the owner the same day (decisions below).

## Goal

- **A guide for writers who aren't technical,** and separate technical docs for translators and developers, so nobody is confused.
- **A comparison page** that shows, fairly and in plain words, what sets Plot Device apart.

## Decisions (owner, 2026-11-09)

1. **Two sections: "Guide" and "Technical docs".**
   - Every menu on the site leads to the Guide.
   - The technical docs are reached only from quiet links: the site footer, and a link on the few guide pages where a reader may want the details. They can be promoted later if needed.
   - Each section has its own sidebar. There's no switcher between them; the technical side has "Back to the guide".
2. **The guide speaks to writers who aren't technical.**
   - No format or tool words: Markdown, frontmatter, YAML, Pandoc, git, file names.
   - Where a reader might want the details, one plain sentence and a link to the technical docs.
3. **The comparison page.** Apps: Google Docs, Microsoft Word, Scrivener, Dabble, Novelcrafter, Campfire and Obsidian; more may be added later.
   - **Language:** general language support and right-to-left writing, not only Hebrew.
   - **How it's written:** short plain words, with yes and no as a check and a cross (owner, after the first build; rows are worded so a check is good for the writer: "Works without an account", "No AI built in"); a "checked on" date; a source for every competitor answer; and "Not documented" where a company's pages say nothing, never a guessed "No".
   - **Honest both ways:** Plot Device's own gaps shown in its column. (A section on when another app may suit a writer better was built, then removed by the owner.)
   - **No prices.**
4. **AI and privacy.**
   - The table has "AI built in" and "Where your writing is kept".
   - Training AI on writers' text is not a row. The text makes the broader point instead: Plot Device never sends your book to another service.
   - Also in the text: your files aren't tied to Plot Device, and your backups are yours.
   - Scrivener and Dabble also have no AI, so the page claims the combination, not "the only app without AI".

## What was built

**The two sections**
- **Technical pages moved** to `docs/technical/` (in English and Hebrew):
  - the book's files: folder, chapters, outlines, pages;
  - translating Plot Device;
  - a new page, "For AI assistants".
- **The guide's sidebar** now ends with a "Help" group: questions, settings, shortcuts, words, reporting a problem, credits.
- **The sidebars** come from the `starlight-sidebar-topics` plugin (0.9.0). `src/components/Sidebar.astro` leaves out its switcher.

**The plain-language pass,** in both languages, on Formatting, Hebrew and English, Linking, Outlines, Characters, Tags, the Timeline, Questions, Settings, Install, Moving a book in, other apps, and Kinds:
- The "In the file" code samples and the Pandoc notation moved to the technical docs. Direction is a new section of "Chapters and the contents".
- "Questions and answers" now says Plot Device exports Word, PDF and EPUB itself. It used to say to convert with Pandoc.

**The comparison page:** `/compare/` and `/he/compare/`.
- **The table** is in `src/compare.ts`. Its wording is in the site's catalog, in both languages.
- **The sources** are on the page, and in [docs/research/comparison-2026-11.md](../research/comparison-2026-11.md).
- **Links to it:** from the front page's privacy section and from the site footer.

**The page as a pitch** (owner, after the first build; from a design critique and research on "why us" pages such as Plausible, Ghost, Obsidian and iA Writer):

1. **The promise:** "Your book. Your computer. Your language."
2. **Four promise cards,** each with a line icon: your book stays with you, no AI reads it, files that outlast any app, backups that are yours.
3. **Two screenshot rows,** as on the front page: every language in both directions, and made for novels. Then Download.
4. **"Side by side":** the table, showing Google Docs, Word, Scrivener and Dabble at first. "Show all 7 apps" adds Novelcrafter, Campfire and Obsidian; without JavaScript, all of them show.
5. **"Work on the book you already have":** importing from Word. (Named so it doesn't sound like sync.)
6. **A closing band** with Download.
7. **Sources,** folded away.

The owner later removed the "When another app may suit you better" cards.

**A tooling fix:** the translation report now writes `sourceHash` in quotes. A hash like `665561e05599` was being read as a number.

## Tests

- **The comparison page** joins the accessibility, direction and phone-width checks, in both languages and both themes.
- **The table on a phone** scrolls sideways with its row names fixed.
- **Each sidebar lists only its own pages,** with no switcher, and the technical side's "Back to the guide" link works.
- **The technical docs are reached** from the footer, never from the header.
- **No format or tool words on guide pages.** The app's own button names don't count.

**Results:** `pnpm site:test` 57 passed. Lint and typecheck pass.

## Known limits

- **The Hebrew wording** of the new and reworded pages is a first draft, to review in Paper Lion.
- **Some cells say "Not documented"** (Dabble's and Campfire's right-to-left writing). They could become tested answers if someone tries those apps.
- **Facts change.** Recheck the table, and its date, from time to time.
