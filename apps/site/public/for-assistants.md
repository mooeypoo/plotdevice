# Plot Device: moving an author's material into a book

This guide is for an AI assistant helping an author move material they already have (a world bible, a draft, notes, a timeline, a plot synopsis) into the files of a [Plot Device](https://mooeypoo.github.io/plotdevice/) book. Plot Device is a writing app for novelists. A book is an ordinary folder of Markdown files, so you can write it directly; the app opens it as it is.

This guide is only about the files. It doesn't explain how to use the app; the author can read the [user guide](https://mooeypoo.github.io/plotdevice/) for that.

## Rules

1. **Write into a new folder.** Never change, move or delete the author's original files.
2. **Keep the author's words.** Move their text as it is. Don't rewrite, summarise, shorten, correct or "improve" it. Changing Markdown formatting (headings, lists, bold, italic) is fine; changing what it says is not.
3. **Invent nothing.** No new facts, names, dates, relationships, descriptions or tags the material doesn't state. If something is unclear, keep the author's text and say so in your report.
4. **Leave nothing out.** Anything you can't place goes into a note called "To sort" (`notes/to-sort.md`), word for word, under a heading saying where it came from.
5. **Links are ordinary relative Markdown links** to files that exist: `[Bea](../characters/bea.md)`. Don't write `[[wikilinks]]`, web links to the book's own files, or links to files you haven't created.
6. **Finish with the checklist** at the end of this guide, then report to the author.

## The folder

```text
The Salt Orchard/
  project.md        the book's title, author and language
  CONTENTS.md       the chapters, in reading order, grouped into parts
  manuscript/       one file per chapter
  outlines/         one file per outline (a plan of the plot)
  characters/       one page per character
  places/           one page per place
  notes/            one page per topic: anything else
  assets/           images, if any
```

- The folder name is the book's title. Only these folders and files are part of the book; the app ignores other Markdown files.
- File names: from the title, lowercase, spaces as hyphens, ending in `.md`: "Bea Halmi" → `bea-halmi.md` or `bea.md`. Letters in any script are fine (`מרו.md`). Two files in one folder can't share a name.
- Files are UTF-8 with LF line endings. Frontmatter (the block between `---` lines at the top) is YAML; quote a text value, or a list entry, if it contains `: ` or starts with `[`, `{`, `"`, `'`, `*`, `&`, `!` or `#`.

## What goes where

| What the author has | Where it goes |
|---|---|
| A character | a page in `characters/` |
| A place: a town, a house, a planet, a ship | a page in `places/` |
| Anything else about the world: magic, history, a faction, a religion, technology, a glossary, research | a page in `notes/`, one per topic |
| Groups: a family, a faction's members, who matters in which part | `tags` on the pages |
| "Bea is Ilka's aunt" | one relationship, on one of the two pages (see "Relationships") |
| A timeline of the world's or story's events | a note (`notes/timeline.md`), as a list |
| A plot synopsis, beat sheet, or chapter-by-chapter plan | an outline in `outlines/` |
| A character's or subplot's arc | its own outline (`outlines/the-arc-of-ilka.md`) |
| Chapters already written | one file each in `manuscript/`, listed in `CONTENTS.md` |
| Scenes, if the draft is in scenes | the chapter they're in, separated by `* * *` |
| Deleted or unplaced scenes | files in `manuscript/` that aren't listed in `CONTENTS.md`; the app keeps them "On the side" |
| Images (maps, portraits) | `assets/`, linked from the page that uses them |

When a section describes one person or place, make it a page. When it describes many at once ("The Varga family: Ilka, Bea and Josef…"), make a page for each that the material describes, and a note for the section itself if it says more than the individual pages hold.

## project.md

```markdown
---
title: The Salt Orchard
author: Ines Varga
language: en
---
Anything the author wants to note about the book.
```

- `title` is required. `author` is optional.
- `language` is the book's language as a code: `en`, `he`, `fr`… Hebrew and Arabic books are shown right to left.
- Optional: `chapterNumbering`: `continuous` (the default), `per-part` (numbering restarts in each part) or `none`.
- Don't write `id` or `schemaVersion`; the app manages them.

## CONTENTS.md

The book's reading order. One list: a chapter is a list item that is exactly one link to its file; a part is a list item with only its name, with its chapters nested under it.

`CONTENTS.md`:

```markdown
# The Salt Orchard

- Part One: Arrival
  - [The Crossing](manuscript/the-crossing.md)
  - [The Orchard Gate](manuscript/the-orchard-gate.md)
- Part Two: Salt
  - [Frost](manuscript/frost.md)
```

- The link text is the chapter's `title`. Paths are relative to `CONTENTS.md`; a path with spaces goes in angle brackets: `[The Crossing](<manuscript/the crossing.md>)`.
- Chapters before or after any part (a prologue, an epilogue) are top-level items. Parts are optional.
- Nothing else goes in the list. A paragraph under the heading is kept, but it isn't part of the order.

## Chapters

`manuscript/the-crossing.md`:

```markdown
---
title: The Crossing
---
The ferry left Szeged an hour late. [Ilka](../characters/ilka.md) held the will on her knees.

* * *

"You're thinner than your photograph," said [Aunt Bea](../characters/bea.md).
```

- `title` is the chapter's name, **without its number**: the app numbers chapters. "Chapter 3: Frost" → `title: Frost`. If a chapter has only a number, use a few words of its opening as a working title, and list it in your report.
- Don't write an `id`; the app adds one.
- The text: paragraphs separated by a blank line; `*italic*`, `**bold**`, `> quotes`, lists, `## headings` inside a chapter if the author used them. A line ending in `\` is a line break inside a paragraph.
- A scene break is `* * *` on its own line, with a blank line before and after.
- No HTML, footnote markup or comments. If the draft has comments or notes to self, put them at the end of the chapter under a `## Notes` heading, or in "To sort".
- Links in the prose are optional. Add one only where the draft already had one.

`manuscript/the-orchard-gate.md`:

```markdown
---
title: The Orchard Gate
---
The gate was chained, and the chain was new.
```

`manuscript/frost.md`:

```markdown
---
title: Frost
---
The first frost came in the night, and in the morning the trees were white.
```

## Characters, places and notes

All three are pages, written the same way. The folder says which kind a page is.

`characters/ilka.md`:

```markdown
---
title: Ilka Varga
aka: [Ilka, Ili]
tags: [Main, Varga family]
---
Inherits the orchard from a grandfather she met twice; trusts paperwork more than people.

## Relationships

- Heir to [the Salt Orchard](../places/salt-orchard.md)

## Wants
To sell the orchard quickly and go back to the city.

## Family
Granddaughter of the first Varga to farm the salt fields.
```

- `title`: the name, as the author writes it in full.
- `aka`: other names, nicknames and titles the material uses for them. Search finds the page by these. Optional.
- `tags`: groups, in the author's words (see "Tags"). Optional.
- **The first paragraph is the description**, shown on the page's card. Use the author's own one-line summary if there is one; otherwise their first sentence or two about this character, as written. Don't write a new one.
- Everything after it is the author's material, under `##` headings that keep the author's own section names ("Appearance", "Backstory", "Wants").
- Any other frontmatter the material has as clear fields (`born: 1931`, `pronouns: she/her`) can stay as YAML keys; the app keeps them. Prose belongs in the body.

`characters/bea.md`:

```markdown
---
title: Bea Halmi
aka: [Aunt Bea, Bea]
tags: [Varga family]
---
Ilka's aunt, who stayed in Marrow when everyone else left.

## Relationships

- Aunt of [Ilka](ilka.md)
- Waits at [the Ferry Landing](../places/ferry-landing.md)

## Habits
Counts the trees aloud. Never sits with her back to the river.
```

`places/salt-orchard.md`:

```markdown
---
title: The Salt Orchard
---
The Varga family's orchard above Marrow, where the trees give salt instead of fruit.
```

`places/ferry-landing.md`:

```markdown
---
title: The Ferry Landing
---
A wooden jetty below Marrow, where the ferry stops twice a day.
```

### Relationships

A `## Relationships` heading with a bulleted list. Each bullet is one relationship: the words say what it is, the link says with whom.

- **Write each relationship once**, on one page: the app shows it on the other page under "Linked from". Write "Aunt of [Ilka](ilka.md)" on Bea's page, and nothing about it on Ilka's. Usually the relationship goes on the page of whoever the sentence is about in the author's material.
- A relationship can link to a place or a note too ("Heir to [the Salt Orchard](../places/salt-orchard.md)").
- Put the heading right after the description. In a Hebrew book, the heading is `## קשרים`.
- Only relationships the material states. If it says "Bea and Ilka are related" without saying how, write "Related to [Ilka](ilka.md)", the author's words.

### Tags

The author's own words for grouping pages: a family, a faction, the main characters, who appears in which part. Tags are shown and chosen as written, spaces included: `tags: [Part Two – main, Varga family]`.

- Use groups the material already makes: a "Main characters" list, a family tree, a faction's member list, a section heading that groups several entries.
- Keep the author's wording, and spell a tag the same way on every page.
- Don't make tags from your own reading ("antagonist", "comic relief") unless the author uses those words.

### Notes

Anything that isn't a character or a place: one page per topic, written the same way. A `title`, a first paragraph that says what the note is, then the material.

`notes/timeline.md`:

```markdown
---
title: Timeline
---
The order of events behind the book, for keeping the dates straight.

- **Spring:** Grandfather Varga dies.
- **Autumn:** Ilka crosses the river ([The Crossing](../manuscript/the-crossing.md)).
- **First frost:** the trees give salt.
```

`notes/to-sort.md`:

```markdown
---
title: To sort
---
Material from the world bible that didn't have a clear place. Each part says where it came from.

## From "World bible.docx", section "Misc"
The ferryman's name might be Gyula. Or is that the priest?
```

## Outlines

A plan of the plot, shown in the app as a board: each `##` heading is a column, each top-level bullet is a card, and the bullets nested under it are the card's details.

`outlines/main-story.md`:

```markdown
# Main story

## Beginning

- Ilka inherits the orchard, see [The Crossing](../manuscript/the-crossing.md)
  - [Aunt Bea](../characters/bea.md) is waiting at [the landing](../places/ferry-landing.md)
- The gate is chained, see [The Orchard Gate](../manuscript/the-orchard-gate.md)

## Middle

- The first frost, see [Frost](../manuscript/frost.md)
  - The dates don't fit: see the [timeline](../notes/timeline.md)

## End

- The orchard is sold, but not for money
```

- The `#` heading is the outline's name. Use the author's sections ("Act One", "Part Two", "Beginning") as the `##` headings, in their order.
- Cards are plans, not chapters: a card doesn't need a chapter, and a chapter doesn't need a card. Link a card to a chapter only when the material connects them.
- A synopsis written as paragraphs: keep each paragraph as one card, in order, under the section it belongs to. Don't break it into beats the author didn't write.

## Books in Hebrew and other right-to-left languages

- `language: he` in `project.md`. Everything else is written the same way, in the book's language: titles, headings, tags and file names can all be in Hebrew.
- The relationships heading is `## קשרים`.
- Don't add direction marks or markup. The app sets each paragraph's direction from its text. Only when the material clearly marks a paragraph as being in another language's direction, and the text alone would show it wrong, wrap it in `::: {dir=ltr}` and `:::` lines.

## The checklist

Before reporting to the author, go through every file:

- [ ] `project.md` has a `title`, and `CONTENTS.md` exists.
- [ ] Every link in `CONTENTS.md` points to a file in `manuscript/` that exists, and every chapter that belongs in the book is listed, in order.
- [ ] Every chapter has a `title`, without a number.
- [ ] Every link in every file points to a file that exists, by the right relative path (`../characters/bea.md` from another folder, `bea.md` from the same folder). Paths are case-sensitive.
- [ ] Every frontmatter block is valid YAML: values with `: ` are quoted, lists are closed.
- [ ] Each relationship is written on one page only.
- [ ] Every page's first paragraph is the author's words.
- [ ] No Markdown files outside the book's folders, except `project.md` and `CONTENTS.md`.
- [ ] Nothing from the material is missing: whatever didn't fit is in `notes/to-sort.md`.

Then tell the author, briefly:

1. Where the new folder is, and that they can open it in Plot Device with "Open project…".
2. What went where: how many chapters, characters, places, notes and outlines.
3. **Everything you weren't sure about**: guesses at where something belonged, chapters you titled, relationships you placed on one page rather than the other, and what's in "To sort".
