# Milestone 13: Bringing in what you've already written

Status: **Approved** (2026-10-27) on branch `milestone-13/bring-in-material` (PR #31). The owner's answers to the plan's open decisions are under "Decisions". Publishing a package is deferred; its options are under "Later".

## Goal

Many authors arrive with material already written: a world bible, a draft, a timeline, a plot synopsis. Today Plot Device works well for a blank book and for a book already in its format, but nothing helps an author get from one to the other.

Writing the files is easy: they are ordinary Markdown. The hard part is the judgment calls: which section becomes a character page, where a timeline goes, how "Bea is Ilka's aunt" becomes a relationship. This milestone writes those calls down once, so an author can follow them alone, or hand them to an AI assistant.

1. **A guide page**, "Moving an existing book in", in English and Hebrew, for authors.
2. **The same guide for AI assistants**: one plain Markdown file at a stable address, with the whole format, the rules, a worked example, and a checklist to finish with.
3. **A project check** inside the code that reads a book folder the way the app does and lists anything the app couldn't use. In this milestone it keeps the assistants' guide true (a test checks every example in it); later it can become a command assistants run, and "Check this book" in the app.
4. **A way in from the app**: a quiet line on the start screen.

Moving material in is not the same as learning the app. The guide page says so at the top and points to "Your first book" and the tour for the app itself; the assistants' guide is only about files.

**Out of scope:**

- Publishing a package or command to npm (see "Later").
- An importer inside the app that splits a document by its headings. Real world bibles are too varied for fixed rules, and a half-right import is worse than a good guide.
- Reading `.docx`, Scrivener or other formats. Assistants already read those; the guide asks for Markdown out.
- Any AI inside Plot Device. Nothing is sent anywhere.

## Decisions (owner, 2026-10-27)

1. **No package yet.** Publishing the checker, and how to name it, is decided when it's needed. The options are recorded under "Later".
2. **The assistants' guide** is at `/plotdevice/for-assistants.md`, with a short `/plotdevice/llms.txt` pointing to it.
3. **The guide page** is in "Start here", after "Your first book", and makes clear that moving a story in is different from learning to use the app.
4. **The app links to it** from the start screen only.

## What the author will see

### On the start screen

Under "New book" and "Open book", one line in the secondary text colour:

```
Already have notes or a draft?  Moving them in →
```

It opens the guide page in the interface's language. Nothing else changes.

### The guide page

In "Start here", after "Your first book". It opens with one short paragraph: this page is about moving what you've already written into a book's files; to learn the app, start with "Your first book" and the tour.

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
4. **When something didn't come across.** What the app shows ("Not in the book yet", "kept as written", a missing chapter) and how to fix it.

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
- **Finishing:** a checklist the assistant works through (every chapter listed in `CONTENTS.md`; every link points at a file that exists; frontmatter is valid YAML; no Markdown files outside the known folders). Then it tells the author what was put where and lists everything it wasn't sure about.

It's in English only, since assistants read English, but it covers books in any language. `llms.txt` is a few lines: what Plot Device is, and a link to this file.

## Files

- **Domain:** `unresolvedLink`, a pure function that says whether a link leads to no file or, for `[[name]]`, to more than one, with tests.
- **Markdown:** `locateLinks`, the links in a file with the line each starts on, with tests.
- **Storage** (`check-project.ts`, new): `checkProject`, which reads a book folder the way opening it does and lists problems, each "to fix" or "to know", with tests against real temporary folders. It reuses `readProject` and the app's own link reading, so the check and the app can't disagree. It lives in storage, not application, because it reads Markdown.
  - **To fix:** `project.md` or `CONTENTS.md` missing or unreadable; a contents link to a missing file; a chapter or page whose frontmatter isn't valid YAML; a link in a chapter, page or outline to a file that isn't there, or a `[[name]]` two files share.
  - **To know:** a chapter not in the contents; contents link text that differs from the chapter's title; lines in the contents that aren't chapters or parts; a Markdown file outside the book's folders, which the app doesn't show (a `README.md`, say: harmless, but not in the app).
  - It only reads. It never writes, repairs or creates a file.
- **UI:** `WelcomeView.vue` (the line); `links.ts` (the guide page's address per language).
- **Words:** `packages/i18n/src/messages/en.json`, `he.json`.
- **Site:**
  - `start/bring-in.mdx` and `he/start/bring-in.mdx`;
  - `public/for-assistants.md` and `public/llms.txt`;
  - the sidebar in `astro.config.ts`;
  - links from "Your files" and "Questions".
- **Docs:** `UX_SPEC.md` (the start-screen line); this plan.

## Tests

- **Storage, against real temporary folders:**
  - The Salt Orchard samples, English and Hebrew, report nothing to fix.
  - Each problem above is found once, with its file and line: a missing project or contents file, a missing chapter, a broken link in a chapter, a page and an outline, a file outside the folders, broken YAML.
  - Obsidian `[[links]]` that resolve to one file aren't reported; ones that resolve to none or several are.
  - Paths with spaces, Hebrew file names, CRLF files.
  - Checking changes no file: the folder is byte-identical afterwards.
- **Domain:** link resolution against the file list, including `../`, angle-bracket paths, `#anchors` and links to outside the project.
- **The guide stays true:** a test builds a folder from the examples in `for-assistants.md` and checks it reports nothing to fix, so the guide can't drift from the format.
- **End to end:** the start-screen line opens the guide page in the interface's language, by mouse and keyboard.
- **By hand:** convert a short invented world bible (not a real book) with an assistant, using only the guide, then open the result in the app. Its notes go into the results below.

## Work order

1. Broken links and `checkProject`: domain, markdown and storage, test-first.
2. The assistants' guide, `llms.txt`, and the test that keeps the guide true.
3. The guide page, English and Hebrew; sidebar and links.
4. The start-screen line.
5. The hand-run conversion.

## Later

### Publishing the check as a command

With a command, an assistant could run the check itself (`npx … check <folder>`), fix what it reports and run it again, instead of working through a checklist. Naming, as researched on 2026-10-27:

- **A scope belongs to the project, not a person.** `@mooeypoo/…` ties the project to one account; an `@plotdevice` organisation on npm can have more members and outlive any one of them. Organisations are free for public packages.
- **`@plotdevice` is claimed.** The owner created the `plotdevice` organisation on npm on 2026-10-27, owned by their account `mooeypoo`, with no packages. The workspace's own packages are already named `@plotdevice/domain`, `@plotdevice/storage` and so on; owning the scope means nobody else can publish packages with those names (a "dependency confusion" risk). The workspace packages stay private and are never published. Publishing utilities under the scope is possible whenever it's useful, and decided then.
- **The command's name is unscoped either way.** A scoped package that installs a command named `plotdevice` leaves the unscoped name `plotdevice` open for someone else to register. So the common pattern is a short unscoped package for the command, with any libraries under the scope (as Astro does with `astro` and `@astrojs/*`).

| Option | Running it | For |
|---|---|---|
| `plotdevice` (unscoped), libraries later as `@plotdevice/*` | `npx plotdevice check` | Shortest; protects the command's name. Recommended |
| `@plotdevice/cli` | `npx @plotdevice/cli check` | Everything under one scope; longer to type |
| `@plotdevice/checker` | `npx @plotdevice/checker` | One package per tool, if there will be several |
| `@mooeypoo/plotdevice` | `npx @mooeypoo/plotdevice check` | Tied to a person; not recommended |

### Other ideas

- **"Copy instructions for an AI assistant"** in the app: copies a prompt with the format included, in the book's language. Nothing is sent anywhere. Deferred by the owner, 2026-10-27.
- **An MCP server**, so an assistant can work alongside an author in an open book (add a character, link pages), not just move material in once. Worth doing only if authors ask for ongoing assistant work.
- **"Check this book" inside the app**, reusing `checkProject`, for books changed in other apps.
