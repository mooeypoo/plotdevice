# Plot Device — Domain and Markdown File Format
Version: 0.4 (2026-10-25). Project layout per ADR 0006; Markdown fidelity per ADR 0003; text direction per ADR 0004; safe writes per ADR 0005.

## Domain vocabulary
- Project: identity, display metadata, language, chapter numbering style and schema version.
- Manuscript: ordered chapters, optionally grouped into parts.
- Chapter: mandatory writing unit, one `.md` file; not inherently composed of named scenes.
- Part: optional ordered chapter grouping with a name. No file of its own in the MVP.
- Outline: named hierarchical document persisted as Markdown, independent from manuscript hierarchy.
- OutlineSection: heading-derived section of an outline.
- OutlineItem: hierarchical bullet item. Display as card/detail depending on view, not inherently a scene.
- Character / Place / Note: human readable Markdown reference documents with optional metadata.
- Links: explicit references written as ordinary relative Markdown links; never inferred from display title alone.

## Authoritative information
- Manuscript order and parts: the contents list in `CONTENTS.md`. Not file names, not folder order, not frontmatter numbers.
- Chapter prose: `manuscript/*.md` body.
- Chapter title: the chapter's frontmatter `title`; the contents link text mirrors it.
- Outlines: `outlines/*.md` bodies.
- Character/place/note text: dedicated Markdown files in their folders.
- Project details (title, author, language, numbering style, schema version): `project.md` frontmatter.
- Personal theme, locale, layout, pinned items, backups and recovery journals: OS app data, never the project folder.
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
- `title` is the chapter's name. File names never change automatically when it changes.
- `id` is written by the app and optional. Its only job is to recognise a chapter after its file was renamed outside the app, so the app can suggest updating the contents. The app always asks; it never relinks silently.
- `* * *` is a thematic break (a scene break), **not** a semantic scene identity. It is always preceded by a blank line, because `---` directly under a paragraph would turn that paragraph into a heading.
- Supported prose formatting: paragraphs, headings, bold (`**…**`), italic (`*…*`), block quotes, links, bullet and numbered lists, scene breaks, and line breaks (a trailing `\`). Existing `_…_` and `__…__` are kept as written.
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
- Do not conflate board card with manuscript chapter/scene.
- Unknown Markdown blocks: retain; if structural editing cannot round-trip safely, restrict operation with helpful explanation.
- Cards link to chapters, characters and places with ordinary relative Markdown links. Cards themselves have no stored IDs in the MVP (ADR 0003).

## Characters, places and notes
```markdown
---
title: Ilka Varga
aka: [Ilka, Ili]
---
Inherits the orchard; distrusts everyone in Marrow.

## Relationships
- Niece of [Bea](bea.md)
- Owes money to [the Salt Exchange](../places/salt-exchange.md)

## Family
Daughter of Bea's sister.
```
- One page per file in `characters/`, `places/` or `notes/`. The folder says what the page is; a `type` key is optional and informational.
- `title` names the page. Without one, the first `#` heading names it, then the file name, so pages written in any app work unchanged. `aka` (a list, or a single name) holds other names, used by search.
- The first paragraph is the description; everything after it is details. Pages are read leniently and never rewritten to fit; the app changes only `title`, when the author renames a page, and one bullet of the relationships section, when the author adds, rewords or removes a relationship.
- **Relationships** (ADR 0009): a heading named "Relationships" (or "קשרים", any level, any case) with a bulleted list. Each top-level bullet with a link is one relationship: the words around the link say what it is, the link says with whom. One direction only: the other page shows it under "Linked from" and is never written to. The first relationship adds the heading after the description, in the project's language.
- Pages have no ids (ADR 0008).

## Links
- The app writes ordinary relative Markdown links: `[Ilka](../characters/ilka.md)`. They work in Obsidian, on GitHub and in VS Code without the app. It reads Obsidian's `[[ilka]]` as well, resolved only when exactly one file has that name, but never writes it.
- Links are explicit: the app never infers one from a name, and never adds or changes links in prose by itself.

## Advanced filename synchronization (deferred)
- Stable chapter IDs independent of title, position and file path.
- Explicit rename source file: validate/collision-check, update the `CONTENTS.md` link and other managed Markdown links, log the transaction in the recovery journal and provide recovery (ADR 0005).
- Optional numbered filename sync: preview all renamed files and references, then perform recoverable batch operation. Not on every drag.
- No implicit renames on title change.

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
- Every schema change requires migration, backup and fixtures.
