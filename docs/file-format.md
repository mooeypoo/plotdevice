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

The app reads every `.md` file under the root, at any depth. It skips any file or folder whose name starts with `.` (for example `.obsidian/`, `.git/`, `.trash/`). Other file types are ignored.

When the app **creates** a file, it uses a default location for that file's type. These defaults can be changed in `novel.md` (see `settings.folders`):

```
my-novel/
  novel.md
  manuscript/
    Part One/                   # one folder per part (the part's title)
      Part One.md               # type: part
      Arrival.md                # type: chapter, part: "[[Part One]]", order: 1
      First night.md            # type: chapter, part: "[[Part One]]", order: 2
    Part Two/
      Part Two.md
      The Archive.md            # order: 1 again; numbering restarts in each part
  characters/
    Mira Kovač.md
  locations/
    Harbor.md
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
| `scene` | Reserved for a later version (see "Scenes") |

- `novel.md` is identified by its name and needs no `type`.
- A file with no `type`, or a `type` the app doesn't know, is listed as **untyped**. The app keeps the unknown value, shows it, and offers to set a type.

## `novel.md`

```yaml
---
format: 1
title: The Preservers
author: Moriel
calendar: gregorian            # gregorian | day-count (see StoryDate)
statuses: [idea, outline, draft, revised, final]
threads:                       # plotlines; chapters refer to them by key
  - key: main
    name: Main plot
    color: "#4f7cac"
  - key: sect
    name: The sect's history
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
---
Free text: premise, notes. The app shows it but does not parse it.
```

- **`format`.** If `format` is missing, the app assumes `1`. If it is higher than the app supports, the project opens read-only with a warning.
- **`calendar`.** Defaults to `gregorian`.
- **`statuses`.** An open list, like tags. If a chapter uses a status that isn't in the list, the status still appears everywhere, marked "not in your list", and one action adds it. The app never edits `novel.md` on its own.
- **`threads`.** A thread `key` uses letters, digits, `-`, and `_`. A chapter that names an unknown key gets a warning, and the value is kept.
- **`settings`.** Every key in `settings` is optional. Missing keys use the defaults shown above.

## Parts

```yaml
---
type: part
title: "Part One: The Harbor"
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
title: Arrival                 # optional; otherwise the file name is the title
part: "[[Part One]]"           # which part; leave out in a novel without parts
order: 1                       # position within the part
status: draft                  # any value; see `statuses` in novel.md
pov: "[[Mira Kovač]]"          # one link, or a list
characters:
  - "[[Mira Kovač]]"
  - "[[Old Tal]]"
location: "[[Harbor]]"         # one link, or a list
threads: [main]
story_date: 2187-04-12         # one date, or a list (see StoryDate)
story_time: evening            # free text
synopsis: Mira arrives and is met by someone who shouldn't know her name.
---
Prose goes here, in plain markdown.
```

### Order

- Parts are sorted by `order`. Chapters with a `part` are sorted by `order` within that part.
- In a project with no part files, chapters are sorted by `order` at the top level.
- The chapter number shown in the app ("Part Two, Chapter 1") is the chapter's position within its part. It isn't the raw `order` value, so gaps such as `10, 20, 30` are fine.
- A chapter goes to the **unordered tray** when:
  - `order` is missing, or isn't an integer;
  - the project has parts and the chapter has no `part`;
  - `part` doesn't link to a file with `type: part`.

  The last two also show a warning.
- Two chapters with the same `order` in one part get a warning and are sorted by title, then by path.
- **Reordering in the app** rewrites only the `order` key of the chapters in that part, numbering them 1, 2, 3…
- **Moving a chapter to another part** updates `part` and `order`. If the file is in the default folder for its old part, the app also moves it to the new part's folder. A file the writer filed somewhere else stays where it is.

## Scenes

Reserved for a later version. A scene will be a file with `type: scene`, `chapter: "[[…]]"`, and `order`, plus the same story keys as a chapter. Until then, files with `type: scene` are listed but not placed in the manuscript.

## Character and location files

```yaml
---
type: character
title: Mira Kovač
aliases: [Mir]
role: protagonist
born: 2161                     # same rules as story_date
relationships:
  - with: "[[Old Tal]]"
    kind: mentor
    note: Taught her to read the old script.
---
## Description
## History
## Arc
```

- The body is free markdown. The headings above are a template the app inserts for new characters; the app does not depend on them.
- Location files follow the same pattern with `type: location`.
- `aliases` are alternate names for search and autocomplete. They don't change which file a link points to.

## StoryDate

- **`calendar: gregorian`** accepts `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. The year can have any number of digits and a sign, for example `2187`, `-0500`, `+12000-03`. A year-only value written without quotes is read as a number, and that's accepted too.
- **`calendar: day-count`** accepts any integer, including negative numbers: `story_date: 14` is day 14 of the story.
- **A list of dates** means the chapter spans from the earliest to the latest.
- A chapter with no `story_date` is **undated**. A value the app can't use, such as `2187-02-30`, text in a day-count project, or an integer beyond ±9,007,199,254,740,991, shows a warning and the chapter is treated as undated. Undated chapters appear in a separate tray, in manuscript order.

## Values with a different shape

People and tools write the same idea in different YAML shapes. The app reads them like this:

| What's written | How it's read |
|---|---|
| `characters: "[[Mira Kovač]]"` (one value where a list is allowed) | A list of one |
| `pov: [[Mira Kovač]]` (unquoted; YAML reads this as a list inside a list) | The link `[[Mira Kovač]]`, plus a note in the warnings panel |

When the app writes a key, it keeps the style the key already uses. If a single value becomes a list, the app writes a block list (one `- ` item per line). New list keys are written as block lists. Wikilinks are always written quoted.

## Titles and file names

- **The title is the `title` key.** If there is no `title`, the file name without `.md` is the title.
- **App-created file names come from the title:**
  - `:` becomes ` -`.
  - `/`, `\`, and `|` become `-`.
  - `< > " ? * # ^ [ ]` and control characters are removed.
  - Runs of spaces become one space, and leading or trailing spaces and dots are trimmed.
  - The name is cut to 100 characters.
  - An empty result becomes `Untitled`.
  - A Windows reserved name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, with or without an extension, in any case) gets `_` appended.
- **App-created file names are unique across the project.** On a clash, the app first adds the type (`Harbor (location).md`), then a number (`Harbor (2).md`). `title` keeps the name the writer sees, so both files can still be titled "Harbor".
- **Title changes.** When a title changes, `settings.file_names` decides whether the file is renamed: `ask` (the default), `always`, or `never`. Renames update links (see "Links").
- **Names the writer types** for a file are checked against the same rules and rejected if they break them.
- **Files the app didn't create** can have any name the OS allows. If a name contains characters that break links (`# ^ [ ] |`), the warnings panel says so.
- **Unicode normalization.** New names are written in Unicode NFC form. Names are compared after NFC normalization and case-folding (`toLowerCase`, independent of locale). Scripts without case, such as Hebrew, are unaffected by case-folding. The app never renames a file only to normalize it.

## Links

- **Syntax.** References are wikilinks by file name (without `.md`):
  - `[[Mira Kovač]]`
  - `[[Mira Kovač|Mira]]` (shown text)
  - `[[Mira Kovač#History]]` (heading)
  - `[[Mira Kovač#^ab12]]` (block)
  - `![[Harbor]]` (embed)
  - `[[locations/Harbor]]` (path form)

  A trailing `.md` is accepted. Inside frontmatter, links must be quoted strings.
- **Resolution:**
  1. A path-form link matches the end of a file's project-relative path.
  2. Any other link matches a file name, compared as described under "Unicode normalization".
  3. If several files match and the key expects a type, the app picks the file of that type. `pov` and `characters` expect a character, `location` a location, and `part` a part. Prose links expect no type.
  4. If more than one file still matches, the link is **ambiguous**. It shows a warning, and the app offers to rewrite it in path form.
- **Writing links:**
  - When the app inserts a link, autocomplete shows each candidate's type.
  - If the target's name isn't unique, the app writes the path form with the plain name as shown text: `[[locations/Harbor|Harbor]]`.
  - In the app, links are styled by the target's type.
- **Ignored text.** Links inside code spans and code blocks are ignored.
- **Renames.** When the app renames or moves a file, it updates links to it in all project files, in both frontmatter and body. The shown text, heading, block, and embed parts are kept.
- **Markdown links.** Links like `[Harbor](../locations/Harbor.md)` are read but not rewritten.

## Derived data (never stored)

| View | Derived from |
|---|---|
| Outline | Part and chapter order, plus each entry's `title`, `status`, and `synopsis` |
| Timeline | `story_date` and `threads` per chapter |
| Character "appears in" | Chapters whose `characters` or `pov` link to the character |
| Interactions | Pairs of characters linked from the same chapter's `characters` or `pov` |
| Word counts | Part and chapter bodies, excluding frontmatter |

## Rules for writers of this format (including the app)

- Preserve unknown keys, YAML comments, and key order. Change only the keys you own.
- Keep the file's BOM, line endings, and trailing newline exactly as they were.
- Write atomically: write to a temporary file, then rename it over the original.
- Never write to a file whose frontmatter couldn't be parsed.
- File names must not contain `< > : " / \ | ? *` or control characters, must not end with a dot or a space, and must not be a Windows reserved name. Avoid `# ^ [ ]`, because they break wikilinks.
