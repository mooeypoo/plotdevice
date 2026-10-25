# ADR 0006: How a project is organized on disk

Status: **Proposed**. Five questions need the owner's decision (marked **Decide**). Recommendations are marked **Recommended**.

## In short

This decides what a Plot Device project looks like as files: where the book's reading order is kept, how parts are written, how a chapter is recognised, and what happens when files appear or disappear behind the app's back. The goal is that **someone who has never heard of Plot Device can open the folder and understand the book**: what the chapters are, in which order, and in which parts. It also has to survive being edited in other apps such as Obsidian or a plain text editor.

**The recommendation in one sentence:** the reading order is a plain Markdown contents list in `CONTENTS.md`, so the human-readable table of contents and the app's source of truth are the same file.

## What is already decided

These are settled elsewhere and are not reopened here:
- One Markdown file per chapter, in `manuscript/`. No scene files (ADR 0003, PRD).
- Outlines, characters, places and notes live in their own folders (`outlines/`, `characters/`, `places/`, `notes/`).
- File names never change automatically when a title changes (owner decision).
- Parts are optional groupings with no files of their own in the MVP (owner decision).
- A human-readable table of contents is required. The machine-readable data alone is not enough (owner decision).
- Text direction markers use Pandoc syntax (ADR 0004).
- Edits never rewrite the author's text, and every save is conflict-checked (ADR 0003, ADR 0005).

## Question 1: Where does the reading order live? (**Decide**)

| Option | What the file looks like | Good | Bad |
|---|---|---|---|
| **A. A list in `project.md`'s frontmatter, plus a generated contents page** (what the specs describe today) | `manuscript:` followed by entries like `- id: ch-k3f9` / `file: manuscript/the-crossing.md` | Structured; easy for the app | Two copies of the same order. Reordering lines in the contents page (say, in Obsidian) does nothing, which is confusing. YAML is unfriendly to non-programmers |
| **B. A Markdown contents list is the order** (**Recommended**) | `- [The Crossing](manuscript/the-crossing.md)` (see the example below) | One source of truth. Readable everywhere. The links are clickable in Obsidian, GitHub and VS Code. Reordering the lines elsewhere really does reorder the book | Someone editing by hand can write something the app doesn't understand. The app then shows a clear warning and changes nothing (as in ADR 0003) |
| C. Each chapter stores its own position (`order: 3`) | A number in every chapter file | No central file | Reordering one chapter rewrites many files. Gaps and duplicate numbers happen. The order is invisible without opening every file. This is the old app's approach, which the specs replaced |
| D. File names (`01-the-crossing.md`) | Numbered names | Order is visible in any file browser | Reordering renames files, which breaks links and confuses sync tools and git. The specs rule this out |

**Why B:** it is the only option where the thing a person reads and the thing the app uses are the same, so they can never disagree. Spike A already proved that the app can move items in a Markdown list safely, without rewriting anything else.

## Question 2: If B, which file holds the list? (**Decide**)

| Option | Good | Bad |
|---|---|---|
| **`CONTENTS.md`, a file whose only job is the contents** (**Recommended**) | Obvious name; anyone browsing the folder finds it. The app can manage the whole file without touching anything the author wrote elsewhere | One more file at the top of the folder |
| A `## Contents` section inside `project.md` | Everything about the project in one file | The app has to edit inside a file that also holds the author's notes, and must recognise exactly where the section ends. That's more fragile |

`project.md` keeps the project's details (title, author, language, numbering style) and any notes the author wants there.

## Question 3: How are parts written, and how are chapters numbered? (**Decide** numbering)

**Parts: Recommended.** A part is a list item without a link, with its chapters nested under it. A chapter outside any part (a prologue or an epilogue) is a top-level item:

```markdown
- [Prologue](manuscript/prologue.md)
- Part One: Arrival
  - [The Crossing](manuscript/the-crossing.md)
  - [The Orchard Gate](manuscript/the-orchard-gate.md)
- Part Two: Salt
  - [Frost](manuscript/frost.md)
- [Epilogue](manuscript/epilogue.md)
```

Using headings (`## Part One`) instead looks nicer, but can't express an epilogue that comes after the last part. Every chapter after a heading belongs to that heading.

**Numbering, Decide:** chapter numbers are shown by the app and in compiled output; they are never written into files. Options, as a setting in `project.md`:
- `continuous` (1, 2, 3 … across the whole book). **Recommended default.**
- `per-part` (each part starts again at 1).
- `none` (titles only).

## Question 4: How does the app recognise a chapter that was renamed outside it? (**Decide**)

If someone renames `the-crossing.md` to `crossing.md` in a file browser, the contents link breaks.

| Option | Good | Bad |
|---|---|---|
| **An `id:` in each chapter's frontmatter, written by the app** (**Recommended**) | The app can say "the chapter *The Crossing* now seems to be `crossing.md`. Update the contents?" and be right. The id is optional: files without one still work | One extra line in each chapter's frontmatter that authors don't need to understand |
| Paths only | Simplest files | A renamed chapter shows as one missing chapter plus one unknown new file. The author has to reconnect them by hand |

Either way, the app **never fixes things silently**. It shows what it found and asks (as the specs require: "no aggressive guessing").

## Question 5: What about files the contents doesn't mention, or mentions but can't find? (**Decide**)

- **A chapter file in `manuscript/` that isn't in the contents (Recommended):** it appears in a "Not in the book yet" tray. The author can add it in one step. Nothing is added automatically: the author may be keeping a draft out on purpose.
- **A contents link whose file is missing:** shown as a missing chapter, with "find it" and "remove from contents" actions. Nothing is deleted automatically.

The alternative, adding unlisted files to the end of the book automatically, is simpler but surprises authors who park drafts in the folder.

## What a project looks like with the recommendations

```
The Salt Orchard/
  project.md          ← title, author, language, numbering; optional notes
  CONTENTS.md         ← the reading order (also the human table of contents)
  manuscript/
    prologue.md
    the-crossing.md
    …
  outlines/  characters/  places/  notes/
```

`project.md`:
```markdown
---
title: The Salt Orchard
author: Ines Varga
language: he
chapterNumbering: continuous
schemaVersion: 1
---
Anything the author wants to note about the project.
```

`CONTENTS.md`: the list from Question 3, under a `# The Salt Orchard` heading.

A chapter:
```markdown
---
title: The Crossing
id: ch-k3f9
---
The ferry left Szeged an hour late…
```

The chapter title lives in the chapter's frontmatter. The contents link text mirrors it: when the author renames a chapter in the app, the app updates that one line in `CONTENTS.md`.

## Engineering notes

For developers; product readers can skip this section.

- **Parsing `CONTENTS.md`** follows ADR 0003: the file is parsed with mdast for structure and offsets, and every edit is a splice.
  - A list item containing exactly one link to a `.md` file is a chapter.
  - An item without a link that has nested items is a part.
  - Anything else (paragraphs, other headings, items with extra text) is preserved, ignored for ordering, and reported as a warning.
- **Reordering a chapter is a list-item move.** It uses the code proven in Spike A (exhaustive moves, commutation and locality tests). Moving between parts means moving into or out of a nested list. Writes go through the revision-checked store and per-file queue (ADR 0005).
- **Link targets** are relative to `CONTENTS.md`. Paths containing spaces are written as `<manuscript/the crossing.md>` (CommonMark angle brackets), so they stay valid and readable.
- **The id↔path relationship is one-directional.** The path in the contents decides which file is in the book. The `id` exists only to suggest a relink after an external rename. IDs come from the `IdGenerator` port (short, random, prefixed `ch-`).
- **Title changes** write two files (the chapter's frontmatter and its line in `CONTENTS.md`), so they go through the multi-file journal (ADR 0005), the same as a file rename.
- **Spec impact:** if accepted, `DOMAIN_AND_FILE_FORMAT.md` changes: the manifest moves from `project.md` frontmatter to `CONTENTS.md`, and `type:` in frontmatter becomes optional (files are found by folder). `schemaVersion` stays in `project.md` for future migrations.
- **Risk:** hand edits that break the list (for example, deleting a link's closing parenthesis). Mitigation: warn and keep the file as written; don't reorder or rewrite until the author fixes it, or until the app offers a preview of a repair the author confirms.

## Consequences

- A person can understand the book from `CONTENTS.md` alone, in any Markdown app.
- Reordering in another app works, as long as the list structure is kept.
- The app needs a "Not in the book yet" tray, missing-chapter handling, and a relink suggestion: all part of Gate 2.
