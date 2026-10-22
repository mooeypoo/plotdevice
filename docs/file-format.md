# File format (the on-disk contract)

This document defines what the app reads and writes. Anyone should be able to understand and edit a project folder with only this document and a text editor. The format works well in Obsidian, but nothing depends on Obsidian.

Version: 1. The version is stored as `format: 1` in `novel.md`.

## Principles

- **Frontmatter decides what a file is and where it belongs in the book.** Folders and file names are only for the writer's own organization. The app never takes meaning from them, with two exceptions: `novel.md` marks the project root, and dot-folders are skipped.
- **Files the app didn't create are first-class.** A file written by hand, in Obsidian, or by another tool is read the same way as one the app made.
- **The app changes only what it owns.** It changes only the keys it owns, and the bytes of a file stay as they were otherwise (see "Rules for writers").

## Text encoding

- Files are UTF-8, which covers every language, including Hebrew. A UTF-8 byte-order mark (BOM) at the start of a file is kept if present.
- A file that is not valid UTF-8 (for example, an old Windows-1255 Hebrew file) is reported as a warning and left untouched.
- **Line endings.** A file's existing line endings (LF, CRLF, or mixed) are preserved, and so is its trailing newline, or lack of one. New files use LF on every OS and end with one newline.

## Frontmatter

- Frontmatter is a YAML block that starts with a line that is exactly `---` at the very start of the file (after an optional BOM) and ends at the next line that is exactly `---`.
- An empty block (`---` followed directly by `---`) is valid. A file with no block is valid and has no keys.
- If the block isn't closed, or its YAML can't be parsed, the app shows a warning, ignores the file's keys, and never writes to the file.
- All keys are optional. Unknown keys are kept.

## Project folder

The project root is the folder that contains `novel.md`. It can be anywhere, including inside an Obsidian vault or a dot-folder.

Projects sit side by side; they are never nested. A folder inside a project, or one that contains a project, can't become a project. If a folder below the root has its own `novel.md` anyway, the app skips that folder and reports it.

The app reads every `.md` file under the root, at any depth. It skips any file or folder whose name starts with `.` (for example `.obsidian/`, `.git/`, `.trash/`). Other file types are ignored.

When the app **creates** a file, it uses a default location for that file's type. These defaults can be changed in `novel.md` (see `settings.folders`):

```
my-novel/
  novel.md
  manuscript/
    Part One/                   # one folder per part (the part's title)
      Part One.md               # type: part
      The Ferry.md              # type: chapter, part: "[[Part One]]", order: 1
      First frost.md            # type: chapter, part: "[[Part One]]", order: 2
    Part Two/
      Part Two.md
      The Cannery.md            # order: 1 again; numbering restarts in each part
  characters/
    Ilka Szabó.md
  locations/
    Marrow.md
  notes/
```

Moving files into other folders, or keeping everything in a single folder, changes nothing about the book.

## Entry types

Each file's `type` key says what it is:

| `type` | Meaning |
|---|---|
| `part` | A part of the manuscript |
| `chapter` | A chapter: the unit of prose and of story metadata |
| `character` | A codex entry for a character |
| `location` | A codex entry for a location |
| `note` | A free-form note; the app lists notes and assigns them no meaning |
| `outline` | The writer's outline: a free-form plan, shown beside the draft and as a board in Plotting mode (see "Outlines") |
| `scene` | Reserved for a later version (see "Scenes") |

- `novel.md` is identified by its name and needs no `type`.
- A file with no `type`, or a `type` the app doesn't know, is listed as **untyped**. The app keeps the unknown value, shows it, and offers to set a type.

## `novel.md`

```yaml
---
format: 1
title: The Salt Orchard
author: Ines Varga
language: en                   # the book's language (BCP 47 tag, such as en or he)
calendar: gregorian            # gregorian | day-count (see StoryDate)
statuses: [idea, outline, draft, revised, final]
threads:                       # plotlines; chapters refer to them by key
  - key: main
    name: Main plot
    color: "#4f7cac"
  - key: strike
    name: The cannery strike
    color: "#b5654a"
settings:
  file_names: ask              # ask | always | never: rename the file when the title changes
  order_prefix: false          # true: also prefix app-created chapter file names with their order
  folders:                     # where the app puts new files, relative to the root
    part: manuscript
    chapter: manuscript        # a chapter in a part goes in that part's folder
    character: characters
    location: locations
    note: notes
    template: templates        # character.md, location.md, note.md: how new entries start
  vocabulary:                  # optional: your own word for a heading the app recognizes
    outline_inbox: Ideas
---
Free text: premise, notes. The app shows it but does not parse it.
```

- **`format`.** If `format` is missing, the app assumes `1`. If it is higher than the app supports, the project opens read-only with a warning.
- **`calendar`.** Defaults to `gregorian`.
- **`language`.** The language the book is written in, as a BCP 47 tag (`en`, `he`). It decides the words the app writes into the book (see "Words the app writes and recognizes") and the default direction of lines with no letters yet. It is independent of the app's interface language: switching the interface never changes it. If `language` is missing, the book is treated as English. A value that isn't a language tag gets a warning, is kept, and the book is treated as English.
- **`statuses`.** An open list, like tags. If a chapter uses a status that isn't in the list, the status still appears everywhere, marked "not in your list", and one action adds it.
- **`threads`.** A thread `key` uses letters, digits, `-`, and `_`. A chapter that names an unknown key gets a warning, and the value is kept.
- **`settings`.** Every key in `settings` is optional. Missing keys use the defaults shown above.
- **`settings.vocabulary`.** Optional. Replaces a word the app recognizes with your own (see "Words the app writes and recognizes"). The app reads it and never writes it. Unknown names are kept and ignored; a value that isn't text gets a warning and is ignored.
- **The app never edits `novel.md` on its own.** It writes `novel.md` only when you initialize a project (including `language`), add a status with "Add to list", or change the book's language with that explicit action. Each of these changes only its own key (ADR 0004).

## Parts

```yaml
---
type: part
title: "Part One: The Orchard"
order: 1
synopsis: ...
---
Optional part-opening text, such as an epigraph. It is part of the manuscript.
```

Parts are optional. A novel without part files is a single list of chapters.

## Chapters

```yaml
---
type: chapter
title: The Ferry               # optional; otherwise the file name is the title
part: "[[Part One]]"           # which part; leave out in a novel without parts
order: 1                       # position within the part
status: draft                  # any value; see `statuses` in novel.md
pov: "[[Ilka Szabó]]"          # one link, or a list
characters:
  - "[[Ilka Szabó]]"
  - "[[Aunt Bea]]"
location: "[[Marrow]]"         # one link, or a list
threads: [main]
story_date: 1952-10-03         # one date, or a list (see StoryDate)
story_time: evening            # free text
synopsis: Ilka crosses to Marrow and finds the orchard gate already open.
---
Prose goes here, in plain markdown.
```

### Order

- Parts are sorted by `order`. Chapters with a `part` are sorted by `order` within that part.
- A part without an integer `order` is **outside the numbered sequence**: it is listed separately ("Not in sequence", sorted by title, with a warning), and neither it nor its chapters get numbers. Its chapters still appear in their `order`.
- In a project with no part files, chapters are sorted by `order` at the top level.
- The chapter number shown in the app ("Part Two, Chapter 1") is the chapter's position within its part. It isn't the raw `order` value, so gaps such as `10, 20, 30` are fine.
- A chapter goes to the **unordered tray** when:
  - `order` is missing, or isn't an integer;
  - the project has parts and the chapter has no `part`;
  - `part` doesn't link to a file with `type: part`.

  The last two also show a warning.
- Two chapters with the same `order` in one part get a warning and are sorted by title, then by path.
- **Reordering in the app** numbers the chapters of that part 1, 2, 3… in their new order and rewrites `order` only in the files whose number changes. Chapters that shared an order get distinct numbers as a side effect. Parts are reordered the same way; moving a part without an `order` into the sequence gives it one.
- **Taking a chapter out of the order** (dropping it on the unordered tray) removes its `order` key. The file and its `part` stay.
- **Moving a chapter to another part** updates `part` and `order`. If the file is in its old part's folder (the folder that holds that part's own file), the app also moves it to the new part's folder. A file the writer filed somewhere else stays where it is.
- **New entries.** A new chapter goes at the end of its part, in that part's folder (in a book without parts, in `settings.folders.chapter`), with only `type`, `title`, `part`, and `order`. A new part goes after the others, in its own folder under `settings.folders.part`.

## Outlines

```yaml
---
type: outline
title: Working plan
---
The plan in one breath: Ilka comes back for the orchard and stays for the strike.

## Part One
- [[The Ferry]]: Ilka arrives; Bea is already at the gate. #main
  - Open on the water, not the town.
- Ilka finds the ledger. Bea lies about it. #strike

## Part Two
- [[The Cannery]]
- Who told the foreman?

## Inbox
- The orchard gate should creak in every chapter it appears.
```

- The body is free markdown: headings, lists, questions, anything. Every line is yours, and a file that ignores the shape below is read and edited as plain text.
- Links (`[[…]]` or markdown links) tie lines to chapters. Lines linking to the chapter being written are highlighted beside it.
- A project can have several outlines. The app creates new ones at the project root, named after their title.
- The reference panel renders Markdown; editing opens the unchanged Markdown source in the main editor. HTML and images are not executed or loaded. External links are displayed as text; project links remain navigable.

### The board

In Plotting mode the app shows an outline as a board. It reads a small part of the body:

| In the file | On the board |
|---|---|
| A `##` heading | Starts a column. Text before the first `##` stays above the board. |
| A top-level bullet (`-`, `*`, or `+`) under a `##` heading | A beat card. Its first line is the card's title. |
| Lines indented under that bullet (nested bullets, paragraphs), and lines that directly continue its first line | The beat's notes |
| A link to a chapter in a beat's first line | Shows that chapter's status, POV, and word count on the card |
| A tag that matches a thread key in `novel.md` (`#strike`) | Colors the card with that thread |
| Anything else: other headings, numbered lists, paragraphs, tables, code, HTML | Plain content. It stays where it is and is never moved |

Lines inside fenced code blocks are always plain content. When in doubt, a line is plain content.

### What the app changes in an outline

Only when you act on the board, or capture a beat:

- **Move a beat or a column.** The beat's lines (or the column's, from its heading to the next `##`) move as they are, with the blank line that separated them. No other line changes.
- **Add a beat, retitle a beat, edit its notes.** Only that beat's lines change.
- **Capture a beat** (an experimental setting, off by default). Adds one bullet at the end of the Inbox column, the `##` heading named by the word for `outline_inbox` (see "Words the app writes and recognizes"). If there is no Inbox heading, the app adds it at the end of the file. It never moves or changes existing beats.

Every change follows the "Rules for writers" below: frontmatter, BOM, and every other line stay byte for byte as they were, each with its own line ending. New lines use the line ending most of the file uses; a last line without one gains one only when something is placed after it. If the file changed since the board read it, nothing is written. The board stores nothing outside the file.

## Scenes

Reserved for a later version. A scene will be a file with `type: scene`, `chapter: "[[…]]"`, and `order`, plus the same story keys as a chapter. Until then, files with `type: scene` are listed but not placed in the manuscript.

## Character and location files

```yaml
---
type: character
title: Ilka Szabó
aliases: [Ilk]
role: protagonist
groups: [Main cast, Part 2]    # optional, overlapping character groups
born: 1931                     # same rules as story_date
relationships:
  - with: "[[Aunt Bea]]"
    kind: mentor
    note: Taught her to graft pear trees.
---
## Description
## History
## Arc
```

- The body is free markdown. The headings above are a template the app inserts for new characters; the app does not depend on them.
- Location files follow the same pattern with `type: location`.
- `aliases` are alternate names for search and autocomplete. They don't change which file a link points to.
- **Character `groups`.** A name or list of names, for example `groups: [Main cast, Part 2]`. Membership is optional and overlapping; a character may appear under several collapsible group headings, but each row refers to the same file. Group names are discovered from character files, not registered in `novel.md`. Names are trimmed and compared after NFC normalization and case-folding; empty names and duplicates are ignored. With no memberships a character appears under Ungrouped. Removing the last membership removes the key; a group disappears when no characters use it. Structured or non-text group values are retained and shown read-only with an inspector warning; valid text memberships in a mixed list can still be displayed. `groups` on locations or notes, and `tags` on every entry, remain unknown keys and are not edited. Collapse state, list mode, and filters are per-user preferences, never project metadata.
- **New entries.** A new character, location, or note goes in `settings.folders.character`, `.location`, or `.note`, named after its title (unique across the project), with only `type` and `title`. New entries start from the project's template for their kind: `character.md`, `location.md`, or `note.md` in `settings.folders.template`. A template's body and frontmatter keys are copied, except `type` and `title`, which the app sets. Without a template file, characters start with the headings above, locations with `## Description` and `## History`, and notes empty. These headings are written in the book's `language`. Templates only seed new files: edit, remove, or add any heading in any entry. Files in the template folder are not listed as entries or untyped files.
- **Setting a type.** For an untyped file, the app writes only a `type` line, and only on request.

## Words the app writes and recognizes

Keys and `type` values are the same in every language (`pov`, `type: chapter`). The app shows them translated, but always writes and reads them as shown in this document.

**Words the app writes** into a new file follow the book's `language`: the statuses and comments in a new `novel.md`, the default headings of new characters and locations, and default titles such as "Untitled chapter" or "Outline". The app never reads meaning back from them, so you can change them freely. Folder names stay as shown above in every language. Changing `language` affects only words written afterwards.

**Words the app recognizes** in your files are kept to a minimum:

| Name | Default (en) | Default (he) | Meaning |
|---|---|---|---|
| `outline_inbox` | `Inbox` | `רעיונות` | The `##` heading in an outline that captured beats go under |

- To use your own word, set it in `settings.vocabulary` in `novel.md`.
- The app looks for, in order: your `settings.vocabulary` word, the default for the book's `language`, the English default, then the default of any other language or an older default. It writes the first of these that applies.

## StoryDate

- **`calendar: gregorian`** accepts `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. The year can have any number of digits and a sign, for example `1952`, `-0500`, `+12000-03`. A year-only value written without quotes is read as a number, and that's accepted too.
- **`calendar: day-count`** accepts any integer, including negative numbers: `story_date: 14` is day 14 of the story.
- **A list of dates** means the chapter spans from the earliest to the latest.
- A chapter with no `story_date` is **undated**. A value the app can't use, such as `1952-02-30`, text in a day-count project, or an integer beyond ±9,007,199,254,740,991, shows a warning and the chapter is treated as undated. Undated chapters appear in a separate tray, in manuscript order.

## Values with a different shape

People and tools write the same idea in different YAML shapes. The app reads them like this:

| What's written | How it's read |
|---|---|
| `characters: "[[Ilka Szabó]]"` (one value where a list is allowed) | A list of one |
| `pov: [[Ilka Szabó]]` (unquoted; YAML reads this as a list inside a list) | The link `[[Ilka Szabó]]`, plus a note in the warnings panel |

When the app writes a key, it keeps the style the key already uses. If a single value becomes a list, the app writes a block list (one `- ` item per line). New list keys are written as block lists. Wikilinks are always written quoted.

## Titles and file names

- **The title is the `title` key.** If there is no `title`, the file name without `.md` is the title.
- **App-created file names come from the title:**
  - `:` becomes ` -`.
  - `/`, `\`, and `|` become `-`.
  - `< > " ? * # ^ [ ]` and control characters are removed.
  - Runs of spaces become one space, and leading or trailing spaces and dots are trimmed.
  - The name is cut to 100 characters, and further if needed so the whole file name fits in 255 bytes of UTF-8 (the Linux limit; Hebrew letters with niqqud take about 4 bytes each). A letter is never separated from its combining marks.
  - An empty result becomes `Untitled`.
  - A Windows reserved name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, with or without an extension, in any case) gets `_` appended.
- **App-created file names are unique across the project.** On a clash, the app first adds the type (`Marrow (location).md`), then a number (`Marrow (2).md`). `title` keeps the name the writer sees, so both files can still be titled "Marrow".
- **Title changes.** When a title changes, `settings.file_names` decides whether the file is renamed: `ask` (the default), `always`, or `never`. The new name follows the rules above and stays unique; the file stays in its folder (a part's folder is not renamed). Renames update links (see "Links").
- **Names the writer types** for a file are checked against the same rules and rejected if they break them.
- **Files the app didn't create** can have any name the OS allows. If a name contains characters that break links (`# ^ [ ] |`), the warnings panel says so.
- **Unicode normalization.** New names are written in Unicode NFC form. Names are compared after NFC normalization and case-folding (`toLowerCase`, independent of locale). Scripts without case, such as Hebrew, are unaffected by case-folding. The app never renames a file only to normalize it.

## Links

- **Syntax.** References are wikilinks by file name (without `.md`):
  - `[[Ilka Szabó]]`
  - `[[Ilka Szabó|Ilka]]` (shown text)
  - `[[Ilka Szabó#History]]` (heading)
  - `[[Ilka Szabó#^ab12]]` (block)
  - `![[Marrow]]` (embed)
  - `[[locations/Marrow]]` (path form)

  A trailing `.md` is accepted. Inside frontmatter, links must be quoted strings.
- **Resolution:**
  1. A path-form link matches the end of a file's project-relative path.
  2. Any other link matches a file name, compared as described under "Unicode normalization".
  3. If several files match and the key expects a type, the app picks the file of that type. `pov` and `characters` expect a character, `location` a location, and `part` a part. Prose links expect no type.
  4. If more than one file still matches, the link is **ambiguous**. It shows a warning, and the app offers to rewrite it in path form.
- **Writing links:**
  - When the app inserts a link, autocomplete shows each candidate's type.
  - If the target's name isn't unique, the app writes the path form with the plain name as shown text: `[[locations/Marrow|Marrow]]`.
  - In the app, links are styled by the target's type.
- **Ignored text.** Links inside code spans and code blocks are ignored.
- **Renames.** When the app renames or moves a file, it updates links to it in all project files, in both frontmatter and body. The shown text, heading, block, and embed parts are kept.
  - Only links that resolve to that file change. A prose link whose name several files share is ambiguous, so it stays as written; in frontmatter, the key's expected type settles it (rule 3 above).
  - A name link gets the new name. A path-form link keeps its depth: `[[Part One/The Ferry]]` becomes `[[Part Two/The Ferry]]`. A move to another folder leaves name links as they are, since they still resolve.
  - Links in code, and in YAML comments, are left alone.
  - A file the app can't change safely (invalid YAML, unclosed frontmatter, not UTF-8, or a rewrite that would change any other value) is left untouched and listed for the writer.
- **Markdown links.** Links like `[Marrow](../locations/Marrow.md)` are read, relative to the file they're in, but not rewritten. In `pov`, `characters`, and `location` they count for "Appears in".
- **Relationships are one-way.** A character's `relationships` are written only in that character's file; the other character shows them read-only. Editing them changes only the entries that differ (ADR 0007).

## Derived data (never stored)

| View | Derived from |
|---|---|
| Overview | Part and chapter order, plus each entry's `title`, `status`, `pov`, `threads`, and `synopsis` |
| Timeline | `story_date` and `threads` per chapter |
| Character "appears in" | Chapters whose `characters` or `pov` link to the character |
| Interactions | Pairs of characters linked from the same chapter's `characters` or `pov` |
| Word counts | Part and chapter bodies, excluding frontmatter (see "Word counts") |

## Word counts

- Words are found by Unicode word segmentation, so Hebrew (including niqqud and attached prefixes) and other scripts count correctly.
- Obsidian comments (`%% … %%`) and HTML comments (`<!-- … -->`) are left out.
- A wikilink counts its visible text (`[[Ilka Szabó|Ilka]]` is one word); an embed (`![[…]]`) counts nothing; a markdown link counts its text.
- Markdown symbols don't count. A hyphenated word (`well-known`) counts once.

## Rules for writers of this format (including the app)

- Preserve unknown keys, YAML comments, and key order. Change only the keys you own.
- Keep the file's BOM, line endings, and trailing newline exactly as they were.
- Write atomically: write to a temporary file, then rename it over the original.
- Never write to a file whose frontmatter couldn't be parsed.
- File names must not contain `< > : " / \ | ? *` or control characters, must not end with a dot or a space, and must not be a Windows reserved name. Avoid `# ^ [ ]`, because they break wikilinks.
