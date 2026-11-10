# Plot Device — Domain and Markdown File Format
Version: 0.7 (2026-11-10). Project layout per ADR 0006; Markdown fidelity per ADR 0003; text direction per ADR 0004; safe writes per ADR 0005; rendered editing per ADR 0010; page kinds per ADR 0011; timelines per ADR 0012; poems per ADR 0013.

## Domain vocabulary
- Project: identity, display metadata, language, chapter numbering style, schema version, its kinds of pages and the name of its manuscript unit.
- Manuscript: ordered chapters, optionally grouped into parts.
- Chapter: mandatory writing unit, one `.md` file; not inherently composed of named scenes. Prose, or a poem (ADR 0013).
- Chapter form: prose (the default) or a poem, which keeps its lines and stanzas. Changing it never changes the text.
- Part: optional ordered chapter grouping with a name. No file of its own in the MVP.
- Outline: named hierarchical document persisted as Markdown, independent from manuscript hierarchy.
- OutlineSection: heading-derived section of an outline.
- OutlineItem: hierarchical bullet item. Display as card/detail depending on view, not inherently a scene.
- Page: a human readable Markdown reference document with optional metadata, of one kind.
- Page kind: a folder of pages plus the names the app shows for it ("Faction", "Factions"). Characters, Places and Notes are the default kinds. All kinds behave the same.
- Manuscript unit: what the interface calls a chapter in this project ("Session"). Interface only.
- Part unit: what the interface calls a part in this project ("Section"). Interface only (ADR 0013).
- Links: explicit references written as ordinary relative Markdown links; never inferred from display title alone.

## Authoritative information
- Manuscript order and parts: the contents list in `CONTENTS.md`. Not file names, not folder order, not frontmatter numbers.
- Chapter prose: `manuscript/*.md` body.
- Chapter title: the chapter's frontmatter `title`; the contents link text mirrors it.
- Outlines: `outlines/*.md` bodies.
- Page text: dedicated Markdown files in their kind's folder.
- Project details (title, author, language, numbering style, schema version, kinds, manuscript and part units, the form of new chapters, main outline and outlines set aside): `project.md` frontmatter.
- A chapter's form: its frontmatter `form` (ADR 0013).
- Personal theme, locale, layout, pinned items, earlier versions (restore points) and recovery journals: OS app data, never the project folder.
- **Backups (Milestone 20)** are zip files of the whole book folder, named "‹Book› backup YYYY-MM-DD HH.MM.zip" in local time, in a folder the author chose for that book, never inside the book. Each backup's entries sit in a folder named after the book, so unzipping it by hand gives a book folder. Which folder, the clean-up rule and the record of automatic backups are kept in OS app data, by the book's folder. Nothing is ever deleted unless the author turned on a clean-up rule.
- Search indexes, caches and thumbnails: disposable, never authoritative.

## Files
```
Novel Title/
  project.md          project details; optional notes by the author
  CONTENTS.md         reading order and parts; also the human table of contents
  manuscript/
    prologue.md
    the-crossing.md
  outlines/
    main-story.md
  characters/
    ilka.md
  places/
    marrow.md
  notes/
    loose-ideas.md
  assets/
```
- Files are recognised by folder. A frontmatter `type` key is optional and informational.
- `characters/`, `places/` and `notes/` are the default kinds. A project that lists its own kinds (below) has a folder per kind; nothing in the app, the project check or the guide for assistants may assume there are exactly three.
- A folder of Markdown pages that the project doesn't list as a kind is not an error: its pages appear in World's "Not sorted yet" tray.
- No hidden app folder is created. If one is ever needed, it is `.plotdevice/` (ADR 0001).

## `project.md`
```markdown
---
title: The Salt Orchard
author: Ines Varga
language: he
chapterNumbering: continuous
id: prj-7d2k9q
schemaVersion: 1
---
Anything the author wants to note about the project.
```
- `language` sets the project's default text direction (Hebrew: right to left).
- `chapterNumbering`: `continuous` (default), `per-part` or `none`. Chapter numbers are shown by the app and in compiled output, never written into files.
- `id` identifies the project for per-user state kept in OS app data (recent projects, backups, recovery journals).
- `schemaVersion` drives explicit, backed-up migrations.
- The body belongs to the author; the app never rewrites it.

### Kinds of pages and the manuscript unit (ADR 0011)
Two optional keys. Without them, the project has Characters, Places and Notes, and chapters:
```yaml
kinds:
  - folder: characters
    one: NPC
    many: NPCs
  - folder: places
    one: Location
    many: Locations
  - folder: factions
    one: Faction
    many: Factions
  - folder: notes
    one: Lore
    many: Lore
manuscriptUnit:
  one: Session
  many: Sessions
suggestedTags: [Player character, Villain, Ally]
```
- `kinds` lists the kinds in sidebar order. `folder` identifies the kind and is its folder's name; `one` and `many` are the names the app shows, in any language, exactly as typed.
- A built-in kind (`characters`, `places`, `notes`) without `one`/`many` keeps the app's English and Hebrew names.
- `manuscriptUnit` renames "chapter" in the interface only ("New session", "Session 3"). Files, `CONTENTS.md` and export are unchanged.
- `suggestedTags` (Milestone 19) is a one-line list of tags that "+ Tag" offers before any page uses them, as a page's `tags` are written; a single tag is read too. Without it, nothing is suggested beyond the tags pages use.
- The app writes these keys with targeted frontmatter patches, as it does for `title`. Key order, comments and unknown keys are kept.
- Removing a kind removes its entry only; its folder and pages stay, and show in "Not sorted yet".
- These keys are optional additions: `schemaVersion` stays 1 and no migration is needed. An older version of the app ignores them and the folders it doesn't know; nothing is lost.

### Parts' name and the form of new chapters (ADR 0013)
Two more optional keys, written by the Poetry collection template:
```yaml
manuscriptUnit:
  one: Poem
  many: Poems
partUnit:
  one: Section
  many: Sections
chapterForm: poem
```
- `partUnit` renames "part" in the interface only ("New section"), as `manuscriptUnit` renames "chapter". `CONTENTS.md` is unchanged. Set on the "Kinds of pages" screen; both names, or none.
- `chapterForm: poem` means new chapters are written with `form: poem` (and a template's first chapter too). Existing chapters don't change. Absent, or any other value: new chapters are prose. Set with "Start new chapters as poems" in the book menu.
- Both are optional additions: `schemaVersion` stays 1. An older version ignores them.

### The main outline (ADR 0012)
```yaml
mainOutline: outlines/main-story.md
```
- Its sections name the timeline's columns. Optional: without it, or if that file is gone, the first outline in the Plot group is main, and nothing is written on open.
- The app writes it when a book is created from a template (its first outline), when an outline is added to a book that doesn't have it (naming the current main, so the new one doesn't take over), when the author makes another outline main, and when the main outline is set aside or deleted in the app. Each is a targeted frontmatter patch; no outline file changes.

### Outlines set aside (Milestone 21)
```yaml
setAside: [outlines/old-plan.md]
```
- Outlines the author set aside: listed under **Set aside** at the end of Plot and kept off the timeline (still lining others up through chains). The file stays where it is; **Bring back** removes it from the list. A set-aside outline is never main.
- Deleting an outline (owner, 2026-11-05) moves its file to the computer's Trash, after a confirmation that recommends setting it aside instead; a backup is kept first, and Undo puts it back as it was until another book opens. Only the outline goes: chapters and pages it links to stay, and line-ups in other outlines that pointed to it show as "can't line up". Where there is no Trash, the app says so and asks before deleting for good. `mainOutline` and `setAside` are updated in the same step.

## `CONTENTS.md`: reading order and parts
```markdown
# The Salt Orchard

- [Prologue](manuscript/prologue.md)
- Part One: Arrival
  - [The Crossing](manuscript/the-crossing.md)
  - [The Orchard Gate](manuscript/the-orchard-gate.md)
- Part Two: Salt
  - [Frost](manuscript/frost.md)
- [Epilogue](manuscript/epilogue.md)
```
- A list item containing exactly one link to a `.md` file is a chapter. Its position in the list is its position in the book.
- A list item without a link, with nested items, is a part; its text is the part's name. Chapters outside any part are top-level items.
- Links are relative to `CONTENTS.md`. Paths with spaces use angle brackets: `[The Crossing](<manuscript/the crossing.md>)`.
- The link text mirrors the chapter's `title`. When a title changes in the app, the app updates that one line. Reordering lines here, in any app, reorders the book.
- Anything else in the file (paragraphs, other headings, list items with extra text) is preserved, ignored for ordering, and reported as a warning. If the list itself can't be read safely, the app shows a warning and doesn't reorder or rewrite until the author fixes it, or confirms a previewed repair.
- Chapter files in `manuscript/` that the contents doesn't mention appear in a "Not in the book yet" tray; the app never adds them automatically. A contents link whose file is missing appears as a missing chapter, with "find it" and "remove from contents" actions; nothing is deleted automatically.

## Chapters
```markdown
---
title: The Crossing
id: ch-k3f9
---
The letter arrived on a Tuesday.

* * *

Three hours later, Daniel called.
```
- `title` is the chapter's name. File names never change automatically when it changes. Only a poem may have an empty title (`title: ""`, ADR 0013): the app then shows its first line, and its line in `CONTENTS.md` keeps whatever it says (the book's word for a poem when the app wrote it) and is never reported as outdated.
- `id` is written by the app and optional. Its only job is to recognise a chapter after its file was renamed outside the app, so the app can suggest updating the contents. The app always asks; it never relinks silently.
- `* * *` is a thematic break (a scene break), **not** a semantic scene identity. It is always preceded by a blank line, because `---` directly under a paragraph would turn that paragraph into a heading.
- Supported prose formatting: paragraphs, headings, bold (`**…**`), italic (`*…*`), block quotes, links, bullet and numbered lists, scene breaks, and line breaks (a trailing `\`). Existing `_…_` and `__…__` are kept as written.
- **Poems (ADR 0013).** `form: poem` in the frontmatter makes a chapter a poem. A poem is stored exactly like prose with line breaks: each line but a stanza's last ends with `\`, and a blank line separates stanzas. Without `form`, a chapter is prose; a value the app doesn't know is kept as written and read as prose. Switching the form writes or removes only that one line.

```markdown
---
title: Evening in the Orchard
id: ch-p2m8
form: poem
---
The evening settles on the orchard\
and salt lies quiet on the leaves\
I count the trees

The wind says nothing\
and the sea remembers\
everything we forgot
```
- Author-owned unknown frontmatter keys and unsupported Markdown are preserved, and shown as "kept as written" in the editor.

## Text direction
A paragraph's direction comes from the project language, or from its own first strong character, depending on the author's setting. When that is wrong, the author can set it, and the app writes Pandoc's standard notation, **only when needed**:

| What | Markup |
| --- | --- |
| A paragraph | `::: {dir=ltr}` on the line before and `:::` on the line after |
| A list item or quote | its whole text as `[…]{dir=ltr}` |
| A phrase inside a paragraph | `[text]{dir=ltr}` |

```markdown
::: {dir=ltr}
The letter was written in English, and it began without a greeting.
:::

נואל ענה: ["It was *never* anyone's orchard",]{dir=ltr} ושתק.
```
- A marker is written only when the wanted direction differs from what the text shows without one. Setting the direction the text already has removes the marker.
- Pandoc applies these when publishing. Other Markdown apps show them as plain text; nothing is lost.
- Invisible direction characters (RLM/LRM) and HTML comments are not used.

## Outlines
```markdown
# Main Story

## Beginning

- The letter arrives
  - No return address
  - Maya recognizes the handwriting
- Daniel returns
  - He needs Maya's help

## Ending

- The family secret is revealed
```
- In default Board: H2 -> columns, first-level list item -> card, descendants -> details. Mapping and supported Markdown are defined in ADR 0003.
- The Text view (Milestone 14) shows the outline's body, rendered from Milestone 16 (sections as headings, cards as bullets, links as names), to type freely, and saves it like a chapter's text; frontmatter is kept as is. Board and List read the file again when they show.
- Rendering never changes the file (ADR 0010). What the author types is written as typed; in plain text, every mark is visible and saved exactly as typed.
- The Timeline (ADR 0012) reads all the book's outlines: each outline is a thread, each `##` section a moment in file order, labelled by its heading (no dates are parsed), and each card an event. The main outline's sections are the column names.
- **Lining up** (ADR 0012): a section's intro paragraph (after the heading, before the first card) that contains exactly one link to a section of **another** outline lines that section up with it. The words around the link are the author's own; the app writes "At the same time as" or "במקביל ל־", in the project's language.
  ```markdown
  ## Hiding at the boathouse
  At the same time as [The night of the storm](main-story.md#the-night-of-the-storm)
  - Hides the letter in the boathouse
  ```
  - The `#` part is the target heading's anchor: lowercase, punctuation removed, spaces as `-`, Hebrew and other letters kept, `-1`, `-2` for repeated headings. The heading's own text is accepted too.
  - Only the first such paragraph counts. Links to pages, chapters or the same outline don't line anything up.
  - The app adds or removes that one line when the author lines up or unpins, and updates its link when the app renames the target section. A link to a section that is gone is shown as "can't line up" and never rewritten without the author.
  - No new file, field or syntax; an older app shows the line as the section's intro text.
- Do not conflate board card with manuscript chapter/scene.
- Unknown Markdown blocks: retain; if structural editing cannot round-trip safely, restrict operation with helpful explanation.
- Cards link to chapters, characters and places with ordinary relative Markdown links. Cards themselves have no stored IDs in the MVP (ADR 0003).

## Pages
```markdown
---
title: Ilka Varga
aka: [Ilka, Ili]
tags: [Main, Varga family]
---
Inherits the orchard; distrusts everyone in Marrow.

## Relationships
- Niece of [Bea](bea.md)
- Owes money to [the Salt Exchange](../places/salt-exchange.md)

## Family
Daughter of Bea's sister.
```
- One page per file in its kind's folder (`characters/`, `places/`, `notes/`, or the project's own kinds). The folder says what the page is; a `type` key is optional and informational.
- Every kind of page has the same format and behaviour: title, other names, description, details, relationships and tags. No kind has fields of its own.
- `title` names the page. Without one, the first `#` heading names it, then the file name, so pages written in any app work unchanged. `aka` (a list, or a single name) holds other names, used by search.
- **Tags** (Milestone 12): `tags` (a list, or a single tag) holds the author's own words for grouping pages ("Part Two – main", "Varga family"), spaces included. Tags that differ only in case or spacing are the same tag, shown with the first spelling found. An entry YAML reads as a one-key map (`- Part Two: main`, unquoted) is read as the tag the author meant. When the author changes a page's tags, the app rewrites only the `tags:` line, as a flow list, quoting a tag only when YAML needs it; removing the last tag removes the line.
- The first paragraph is the description; everything after it is details. Pages are read leniently and never rewritten to fit; the app changes only `title`, when the author renames a page, the `tags:` line, when the author changes its tags, and one bullet of the relationships section, when the author adds, rewords or removes a relationship.
- **Relationships** (ADR 0009): a heading named "Relationships" (or "קשרים", any level, any case) with a bulleted list. Each top-level bullet with a link is one relationship: the words around the link say what it is, the link says with whom. One direction only: the other page shows it under "Linked from" and is never written to. The first relationship adds the heading after the description, in the project's language.
- Pages have no ids (ADR 0008).

## Links
- The app writes ordinary relative Markdown links: `[Ilka](../characters/ilka.md)`. They work in Obsidian, on GitHub and in VS Code without the app. It reads Obsidian's `[[ilka]]` as well, resolved only when exactly one file has that name, but never writes it.
- Links are explicit: the app never infers one from a name, and never adds or changes links in prose by itself.

## Templates
- A template (Milestone 19) is bundled with the app, in English and Hebrew: its kinds, its word for chapters, its suggested tags, whether it starts with a chapter, and which starter outlines it begins with. The starter outlines are plain Markdown in `packages/templates/starters/<language>/`.
- Creating a project reserves a new folder (refused if it exists), then writes `project.md` from the author's details plus the template's `kinds`, `manuscriptUnit`, `partUnit`, `chapterForm` and `suggestedTags`, `CONTENTS.md`, the outlines and one empty chapter listed in `CONTENTS.md`: for a short story, named after the book; for a poetry collection, an untitled poem (`title: ""`, `form: poem`) whose file and contents line are named with the book's word for a poem. Every file is written as new, never over another. Ids come from the new project, never from the template.
- The story's language picks the template's language; any language other than Hebrew gets English.
- Nothing records which template a project came from. Once created, it is simply the author's project.
- Every template, in every language, passes the project check with no warnings and loads without any write.

## Word import (Milestone 22)
- A `.docx` manuscript becomes ordinary chapter files and `CONTENTS.md` entries, after a preview of how it splits into chapters. Chapters only; the `.docx` itself is never changed.
- Formatting comes in as the supported prose formatting (ADR 0004, point 3). What can't come in (comments, tracked changes, footnotes) is named in the preview. Details are decided in the Milestone 22 plan.
- Export to Word is later, designed with the owner first.

## Advanced filename synchronization (deferred)
- Stable chapter IDs independent of title, position and file path.
- Explicit rename source file: validate/collision-check, update the `CONTENTS.md` link and other managed Markdown links, log the transaction in the recovery journal and provide recovery (ADR 0005).
- Optional numbered filename sync: preview all renamed files and references, then perform recoverable batch operation. Not on every drag.
- No implicit renames on title change.

### Folder names of kinds (Milestone 18, ADR 0011)
- Renaming a kind changes only `one`/`many`. Its folder is never renamed automatically.
- **Match folder names…** renames chosen folders to match the kinds' names, and updates every link to them in chapters, outlines, pages and `CONTENTS.md`, plus the kind's `folder` key. Reference-style links and `[[wikilinks]]` are covered too (ADR 0005, open item).
- Preview first: each folder's old and new name, how many links change, and anything that blocks it (an existing folder with that name, a name Windows can't use, a case-only change). Blocked renames are refused with a reason.
- Before applying: a backup step (a copy of the book folder in a place the author picks, or the author confirming they have one).
- Applied as one journalled, recoverable operation (ADR 0005), with **Undo folder renames** restoring names and links byte-identical.
- The same mechanism later serves "synchronize chapter filenames with manuscript order".

## External editing policy
- Normal use is within app; closed-project external edits reread on next open.
- On save compare observed file revision/hash; if changed, stop and offer reload, save copy or comparison/recovery. Never silently overwrite.
- Missing/renamed files: show broken-link list and manual relink workflow; no aggressive guessing.
- Atomic writes where supported; safe temp files/recovery; backup policy documented and tested.
- No concurrent live merging or automatic detection of semantic file edits in v1.

## Parse/serialize contract
- Parse Markdown with source spans and preserve unrelated blocks, whitespace and unrecognized metadata wherever possible. Never re-serialize a whole document (ADR 0003).
- Board and contents operations mutate only supported list constructs; nonrepresentable Markdown requires a warning and non-destructive fallback.
- UTF-8; existing line endings and BOM preserved; new files use LF.
- Avoid unsafe HTML rendering; sanitize project content for display.
- Every breaking schema change requires migration, backup and fixtures. Optional keys that older versions ignore without loss are not a breaking change.
