# Milestone 13: Bringing in what you've already written

Status: **Planned** (2026-10-27) on branch `milestone-13/bring-in-material`. The owner approved the approach on 2026-10-27; the open decisions below need answers before building starts.

## Goal

Many authors arrive with material already written: a world bible, a draft, a timeline, a plot synopsis. Today Plot Device works well for a blank book and for a book already in its format, but nothing helps an author get from one to the other.

Writing the files is easy: they are ordinary Markdown. The hard part is the judgment calls: which section becomes a character page, where a timeline goes, how "Bea is Ilka's aunt" becomes a relationship. This milestone writes those calls down once, so an author can follow them alone, or hand them to an AI assistant. It also gives the assistant a way to check its work.

1. **A guide page**, "Bringing in what you've already written", in English and Hebrew, for authors.
2. **The same guide for AI assistants**: one plain Markdown file at a stable address, with the whole format, the rules, and a worked example.
3. **A checker** that reads a book folder the way the app does and lists anything the app couldn't use. An assistant runs it, fixes what it reports, and runs it again.
4. **A way in from the app**: a quiet link on the start screen.

**Out of scope:**

- An importer inside the app that splits a document by its headings. Real world bibles are too varied for fixed rules, and a half-right import is worse than a good guide.
- Reading `.docx`, Scrivener or other formats. Assistants already read those; the guide asks for Markdown out.
- Any AI inside Plot Device. Nothing is sent anywhere.

## What the author will see

### On the start screen

Under "New book" and "Open book", one line in the secondary text colour:

```
Already have notes or a draft?  Bringing them in →
```

It opens the guide page in the interface's language. Nothing else changes.

### The guide page

In "Start here", after "Your first book":

1. **What goes where.** A table, in author words:

   | What you have | Where it goes |
   |---|---|
   | A character | a page in `characters/`: one paragraph to describe them, then anything else |
   | A place | a page in `places/` |
   | Magic, history, factions, a glossary | a note in `notes/`, one per topic; tags group them |
   | A timeline | a note, like the demo book's timeline; or an outline, if it's really the plot |
   | "Bea is Ilka's aunt" | a line under "Relationships" on Bea's page, with a link to Ilka. Not on both pages |
   | A plot synopsis or beat sheet | an outline: each `##` heading a column, each bullet a card |
   | Chapters already drafted | one file per chapter in `manuscript/`, listed in order in `CONTENTS.md` |

2. **Doing it yourself.** Start a new book in the app, then add pages and paste in your text. It's slower, and nothing can go wrong.
3. **With an AI assistant.** Give it the address of the assistants' guide and your material. Ask it to make a **new** folder, never to change your originals. Then open the folder in Plot Device and look.
4. **When something didn't come across.** What the app shows ("Not in the book yet", "kept as written") and how to fix it.

### The guide for assistants

`https://mooeypoo.github.io/plotdevice/for-assistants.md`, written for an AI assistant to read:

- The folder, each file's format, and the Salt Orchard as a complete worked example.
- The mapping table above, with the cases that need judgment spelled out.
- The rules:
  - Keep the author's wording. Never rewrite, summarise or "improve" it.
  - Never invent facts, names, relationships or dates. When unsure, put it in a note called "To sort" and say so.
  - Write into a new folder; never change the source.
  - Relative Markdown links only. One direction for each relationship.
  - No chapter numbers in files or titles; the app numbers chapters.
  - Hebrew books: `language: he` and the relationships heading `קשרים`.
- **Finishing:** run the checker until it reports nothing, then tell the author what was put where and list everything it wasn't sure about.

It's in English only, since assistants read English, but it covers books in any language.

### The checker

```
$ npx plotdevice check "The Glass Weir"
The Glass Weir: 12 chapters, 18 characters, 9 places, 14 notes, 1 outline

2 things to fix:
  CONTENTS.md:7          links to manuscript/the-flood.md, which doesn't exist
  characters/oren.md:9   links to ../places/mill.md, which doesn't exist

1 thing to know:
  manuscript/unused-opening.md   isn't in CONTENTS.md, so it's "Not in the book yet"
```

- **To fix** (exit code 1): `project.md` missing or unreadable; `CONTENTS.md` missing, or its list can't be read; a contents link to a missing file; a chapter or page whose frontmatter isn't valid YAML; a link in a chapter, page or outline to a file that isn't there; a Markdown file outside the known folders (the app won't see it).
- **To know** (exit code 0): a chapter not in the contents; contents link text that differs from the chapter's title; anything the app would show as "kept as written".
- `--json` prints the same list for assistants and scripts.
- It only reads. It never writes, repairs or creates a file.

## Open decisions

1. **How the checker reaches authors and assistants.** I recommend **a small `plotdevice` package on npm**, so `npx plotdevice check <folder>` works anywhere Node is installed (assistants that write files almost always have it). The name is free today. Publishing is an outward step, so this PR builds the package and its release workflow, and the owner publishes the first version by hand. The alternatives:
   - a `--check` option on the desktop app, which needs the app installed and its path known;
   - only in this repository, which authors can't use.
2. **The address of the assistants' guide.** I recommend `/plotdevice/for-assistants.md`, plus a short `/plotdevice/llms.txt` that points to it (the emerging convention assistants look for).
3. **Where the guide page sits.** I recommend "Start here", after "Your first book", since it's how some authors start.
4. **The start-screen line.** I recommend the start screen only. The top bar's "Documentation" already reaches the guide.

## Files

- **Application** (`checks/`, new): `checkProject`, which turns what reading a project finds into a list of problems, each "to fix" or "to know", with tests. It reuses `readProject` and the reference and outline readers, so the checker and the app can't disagree.
- **Domain:** a pure function that finds links to missing files, given each file's links and the project's file list, with tests.
- **CLI** (`apps/cli`, new): argument parsing, plain and `--json` output, exit codes. Built into one file with no runtime dependencies. Its README covers use and publishing.
- **Release:** a GitHub workflow that publishes the CLI to npm when a `cli-v*` tag is pushed (decision 1). Nothing publishes until the owner adds the token and tags.
- **UI:** `WelcomeView.vue` (the line); `links.ts` (the guide address per language).
- **Words:** `packages/i18n/src/messages/en.json`, `he.json`.
- **Site:**
  - `start/bring-in.mdx` and `he/start/bring-in.mdx`;
  - `public/for-assistants.md` and `public/llms.txt`;
  - the sidebar in `astro.config.ts`;
  - a link from "Your files" and "Questions".
- **Docs:** `UX_SPEC.md` (the start-screen line); `ARCHITECTURE.md` (the CLI as a second host); this plan.

## Tests

- **Application, against real temporary folders:**
  - The Salt Orchard samples, English and Hebrew, report nothing to fix.
  - Each problem above is found once, with its file and line: a missing contents file, an unreadable list, a broken link in a chapter, a page and an outline card, a file outside the folders, broken YAML.
  - Obsidian `[[links]]` that resolve to one file aren't reported; ones that resolve to none or several are.
  - Paths with spaces, Hebrew file names, CRLF files.
  - Checking changes no file: the folder is byte-identical afterwards.
- **Domain:** link resolution against the file list, including `../`, angle-bracket paths, `#anchors` and links to outside the project.
- **CLI:** exit codes; `--json` matches a schema; a folder that isn't a book gives one clear sentence, not a stack trace.
- **The guide stays true:** a test builds a folder from every example in `for-assistants.md` and checks it reports nothing, so the guide can't drift from the format.
- **Architecture:** the CLI may use application, storage and fs-node, but nothing from Electron or Vue.
- **End to end:** the start-screen line opens the guide in the interface's language, by mouse and keyboard.
- **By hand:** convert a short invented world bible (not a real book) with an assistant, using only the published guide, then open the result in the app. Its notes go into the results below.

## Work order

1. `checkProject` and broken links: domain and application, test-first.
2. The CLI, its output and its tests.
3. The assistants' guide, and the test that keeps it true.
4. The guide page, English and Hebrew; sidebar and links.
5. The start-screen line.
6. The release workflow; the hand-run conversion.

## Later ideas

- **"Copy instructions for an AI assistant"** in the app: copies a prompt with the format included, in the book's language. Nothing is sent anywhere. Deferred by the owner, 2026-10-27.
- **An MCP server**, so an assistant can work alongside an author in an open book (add a character, link pages), not just convert material once. Worth doing only if authors ask for ongoing assistant work.
- **"Check this book" inside the app**, reusing `checkProject`, for books changed in other apps.
