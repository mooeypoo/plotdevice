# ADR 0013: Poems, and a poetry template

Status: **Accepted** (owner, 2026-11-10, with the recommended answers to every open point) · Amends ADR 0004, 0006 and 0011 · To be built in Milestone 27

## In short

Today every chapter is prose. When you press Enter, you start a new paragraph, and export gives each paragraph an indent. A poem needs the opposite: **Enter starts a new line, and an empty line starts a new stanza.** Lines have to stay exactly where the poet put them.

This ADR adds:

1. **A "Poem" switch for each chapter**, in the Format menu, beside "Plain text". A poem chapter changes how Enter works, how the chapter looks, and how it exports. The words themselves are never changed by the switch.
2. **A Poetry collection template** ("ספר שירה"). Every new chapter starts as a poem, chapters are called poems ("שיר / שירים"), and parts are called sections ("אסופה / אסופות").
3. **A niqqud picker**, so Hebrew poets can add vowel marks without learning their system's keyboard tricks. It doesn't change the file format and is described here because it ships with the poetry work.

A poem chapter on disk is an ordinary Markdown file with one extra line at the top:

```markdown
---
title: עֶרֶב
id: ch-p2m8
form: poem
---
הַיָּם שָׁקֵט הָעֶרֶב\
וְהָרוּחַ נָחָה

אֲנִי יוֹשֶׁבֶת עַל הַחוֹף\
וּמְחַכָּה
```

The `\` at the end of a line means "new line here". It is the line break Plot Device already writes for Shift+Enter, and the editor already hides it. An empty line between lines means a new stanza. Any Markdown app, Pandoc or GitHub shows this as a poem with two stanzas.

## Decisions taken (owner, 2026-11-10)

- **Poem is a per-chapter setting**, not a setting for the whole book. A novel can contain a poem, and a poetry book can contain a prose piece.
- **The switch lives in the Format menu**, in the same group as "Plain text".
- **It should feel prominent in poetry books.** The template makes every new chapter a poem, so poets never have to look for the switch.
- **Names:** the template is "Poetry collection" / "ספר שירה". In the template, a part is a "Section" / "אסופה" (plural "Sections" / "אסופות"). Stanzas get no name in the app: they are simply the empty line between groups of lines. ("בית" was considered and set aside, because in Hebrew poetry it means a stanza, and one name must mean one thing.)

## Decision

### 1. A chapter is a poem when its file says `form: poem`

| Option | What it looks like | Good | Bad |
|---|---|---|---|
| **`form: poem`** (**Recommended**) | `form: poem` in the chapter's frontmatter | Readable; can later hold other forms (a script, a letter) without a new key | One new key |
| `poem: true` | `poem: true` | Very plain | A yes/no key; a second form would need another key |
| `type: poem` | `type: poem` | Reuses an existing word | `type` already means "what kind of file this is" and is informational (ADR 0006); mixing the two would confuse both |
| A `poems/` folder | Poems live in their own folder | Visible in the file browser | Moving a chapter between folders to change its form breaks links and the contents; ADR 0006 keeps all chapters in `manuscript/` |

Without the key, a chapter is prose, exactly as today. The app writes and removes only that one line. Key order, comments and the body are kept (ADR 0005).

### 2. Lines are kept with the existing `\` line break

| Option | Good | Bad |
|---|---|---|
| **Trailing `\`** (**Recommended**, already the house style, ADR 0004) | Every Markdown reader keeps the line; the editor already hides it; nothing new to parse | Visible as `\` when opened in a plain text editor |
| A plain single newline | Cleanest file | In Markdown, a single newline joins the lines. Every other app, and Pandoc, would run the poem together into one paragraph |
| Two trailing spaces | Standard Markdown | Invisible; many editors strip trailing spaces and the poem silently collapses |

So **a poem is stored exactly like prose with line breaks.** The switch changes behaviour and layout, not the text. This is what makes turning it on and off safe.

### 3. Typing in a poem

- **Enter** starts a new line (writes `\` and a newline).
- **Enter on an empty line** (Enter twice) starts a new stanza. The `\` left on the line before is removed, so the file shows a clean blank line between stanzas.
- **Backspace at the start of a stanza** joins it to the stanza above, as a new line, the way Backspace at the start of a paragraph joins paragraphs in prose.
- **Shift+Enter** also starts a new stanza, for people who prefer one key.
- **Pasting** several lines into a poem keeps each line as a line, and a blank line as a stanza break. Pasting into prose works as it does today.

### 4. What the switch does

| | Switched **on** | Switched **off** |
|---|---|---|
| The file | `form: poem` is added. Nothing else changes | `form: poem` is removed. Nothing else changes |
| Existing text | Each paragraph becomes a stanza. Lines already split with Shift+Enter stay split | Each stanza becomes a paragraph. Its lines stay on separate lines (the `\` breaks stay) |
| Enter | New line; twice for a new stanza | New paragraph, as today |
| On screen | No first-line indent; lines don't run together; long lines wrap with an indent so you can see where a line really ends | Prose layout, as today |
| Export | Poem layout (point 6) | Prose layout |
| Word count | Unchanged | Unchanged |

Because the switch never rewrites the text, switching back and forth loses nothing. There is no "convert" step and no undo needed.

### 5. The Poetry collection template

| | English | Hebrew |
|---|---|---|
| Template | Poetry collection | ספר שירה |
| A chapter is a | Poem / Poems | שיר / שירים |
| A part is a | Section / Sections | אסופה / אסופות |
| Kinds of pages | Notes | הערות |
| Starter outline | "Order of the collection", grouped by section | „סדר הספר”, by אסופה |
| Suggested tags | Draft, Ready | טיוטה, מוכן |
| First chapter | One empty poem, so the book opens ready to write | Same |

This needs two new optional keys in `project.md`, both following the pattern of `manuscriptUnit` (ADR 0011):

```yaml
---
title: Salt Hours
language: he
manuscriptUnit:
  one: שיר
  many: שירים
partUnit:
  one: אסופה
  many: אסופות
chapterForm: poem
---
```

- **`partUnit`** renames "part" in the interface only ("New section", "Section 2"). `CONTENTS.md` and files don't change. Like `manuscriptUnit`, it is the author's text, in any language.
- **`chapterForm: poem`** means new chapters start as poems (`form: poem` is written into each new chapter file). It doesn't change existing chapters. Without it, new chapters are prose.

**Decided:** the author changes "new chapters start as poems" from a checked item in the book menu, "New chapters are poems", next to "Kinds of pages…". There is no book settings screen yet, and this keeps it one click away without adding one.

**Decided:** the starter outline has three sections with a placeholder poem title in each, in the same tone as the other starters, written fresh (not from a real book).

### 6. Exporting poems

For PDF, EPUB and Word, a poem chapter:

- has no first-line indent and is never justified or hyphenated;
- keeps every line where the poet put it;
- leaves a gap between stanzas (one empty line's height);
- indents the continuation of a line too long for the page, so the reader can tell it's the same line;
- starts on a new page, like every chapter.

Markdown export is unchanged: the poem's file is already the poem.

**Decided:** each poem starts on a new page, as every chapter already does. Short poems sharing a page waits until poets ask for it.

**Decided:** many poems are untitled, or known by their first line, so a poem's title may be left empty. The sidebar and the export's table of contents then show its first line in italics, and the export prints no heading above it. (For prose chapters, nothing changes.)

### 7. The niqqud picker (no file-format change)

- Niqqud already works in the app: it's saved as typed, search ignores it ("יעל" finds "יַעֵל"), word count and file names handle it, and Backspace removes only the last mark.
- What's missing is a simple way to type it. The picker opens from a shortcut and from the Format menu, in any chapter or page whose text is Hebrew. It shows the marks for the letter before the cursor (all vowels, dagesh, shin and sin dots), and you see the result (`ב → בָ → בָּ`) as you click.
- No automatic niqqud: tools that add niqqud for you are online services, and Plot Device doesn't send the author's text anywhere.
- Text is saved as typed. The app never reorders the marks.

## Rejected

| Option | Why not |
|---|---|
| A whole-book "poetry mode" only | A novel with a poem, or a collection with a prose piece, couldn't be written. The book-wide part is only the default for new chapters |
| A poem block inside a prose chapter | Useful (a song a character sings), but a new kind of Markdown block that other apps wouldn't show as a poem. Left for later, if writers ask |
| Swapping Enter and Shift+Enter in poems | Poets would have to learn Shift+Enter for every stanza. Enter twice is how people already type poems in Word |
| An "operating-system IME" for niqqud | Not ours to build; systems already have Hebrew keyboards. The problem is that their niqqud keys are hidden and different on each system, so we offer a picker inside the app |
| Automatic niqqud (an online service) | Sends the author's unpublished text to someone else's server |

## Older versions

- All three keys (`form`, `partUnit`, `chapterForm`) are optional, and older versions keep keys they don't know. **`schemaVersion` stays 1** and nothing is migrated.
- An older version shows a poem as prose with line breaks: every line still in its place, but Enter makes paragraphs and export indents the stanzas. Nothing is lost.

## What ships with it

### The app

- The Poem switch, the Enter behaviour, the poem layout on screen and in export.
- The Poetry collection template in English and Hebrew, and "New chapters are poems".
- The niqqud picker.
- An invented sample poem in each language for tests and screenshots, never a real book or a real poet's work. The Hebrew one has full niqqud.

### The Guide (plotdevice.app, English and Hebrew)

- **Your first book**: add Poetry collection to the list of templates.
- **A new page, "Writing poems"**: what the Poem switch is, where to find it, Enter for a new line and Enter twice for a new stanza, and the table from point 4 in plain words: what changes when you switch it on, what stays when you switch it off, and that switching never changes your words. How a poem exports. The niqqud picker, with a short example.
- **Chapters and parts**: parts can have another name, such as sections in a poetry collection.
- **Formatting**: a line to point to "Writing poems".
- **Hebrew and English**: a short section on niqqud.

### Technical docs

- The chapter file page: `form: poem`, with the example above.
- The book folder page: `partUnit` and `chapterForm`.
- The guide for AI assistants (`for-assistants.md`, `llms.txt`): poems use `\` line breaks and blank lines for stanzas, and adding `form: poem` makes a chapter a poem.

### The front page

A new band, **"One app, many kinds of writing"**: a novel, a short story, a poetry collection and a D&D campaign, each with a small screenshot of that template in the app (taken by the existing screenshot script, in each language). The poetry screenshot shows the Hebrew poem with niqqud on a Hebrew page and the English poem on an English page.

### The comparison page

- **No new row in the table** (owner, 2026-11-10). A row would need the same sourced, fair check as the others (Milestone 25), so it waits.
- **A new section in the page's text instead,** about how Plot Device handles different kinds of writing: a novel, a short story, a poetry collection and a campaign each start with the right pages, outlines and names, and one book can mix prose and poems. It talks only about what Plot Device does and names no other app, so it needs no sources. It is written in English and Hebrew, like the rest of the page.

## Engineering notes

- **Domain:** `ChapterForm = 'prose' | 'poem'`, read from frontmatter `form` (any other value is kept as written and treated as prose, shown as "kept as written"). `Project` gains optional `partUnit` and `chapterForm`. Frontmatter writes are targeted patches (ADR 0005, point 5); a no-op toggle round-trip is byte-identical.
- **Editor (CodeMirror):** a `form` facet, swapped in a compartment so toggling never remounts the editor. In poem form, Enter runs a `poemLine` command: on a line that is empty except for hidden markup, it removes the previous line's trailing `\` and inserts a blank line; otherwise it inserts `\` plus the file's own line ending (as `lineBreak` in `keys.ts` does). Backspace at a stanza start joins with `\`. Paste in poem form converts single newlines to `\` + newline and keeps blank lines. Direction marks (`::: {dir=…}`) wrap a stanza as they wrap a paragraph.
- **Layout:** a class on the editor for poem form; each visual line is a block with a hanging indent (`padding-inline-start` plus negative `text-indent`), logical properties only, so it works right to left.
- **Export:** a poem chapter's paragraphs render as `<div class="stanza">` with one `<span class="line">` per line (HTML, EPUB, print). Word: one paragraph per stanza, `w:br` between lines, hanging indent, no first-line indent, spacing after. Markdown export copies the file.
- **Niqqud picker:** Unicode U+05B0 to U+05C7 (vowels, dagesh U+05BC, shin dot U+05C1, sin dot U+05C2). It inserts after the base letter and any marks already there. It never normalises (NFC reorders Hebrew marks). Tests: mixed-mark orders, a letter at the start of a line, right-to-left selections, and Backspace after a picked mark.
- **Spell check:** check whether the system spell checker underlines every word with niqqud; if so, offer to turn spell check off in that chapter rather than turning it off silently.
- **Tests:** round-trip fixtures for poems in English and Hebrew with niqqud, CRLF, direction marks; toggle on/off is a one-line diff; Enter, Enter twice, Backspace and paste behaviours; export snapshots for each format; template creation in both languages.
- **Spec impact:** `DOMAIN_AND_FILE_FORMAT.md` (Chapters: `form`; Project: `partUnit`, `chapterForm`; version 0.7), `UX_SPEC.md` (Format menu, book menu, template picker), ADR 0004 (Enter in poems), ADR 0006 and 0011 (new optional keys).

## Implementation note (Milestone 27)

- **Built as decided**, with these details:
- **Word:** each line of a poem is its own paragraph, not one paragraph with `w:br` breaks as the engineering notes first said. A hanging indent applies to every line after a break inside a paragraph, so with breaks every poem line but the first would have been indented. A stanza's lines keep together on a page, and its last line is followed by one line's space.
- **The form reaches the editor through its settings**, which change in place, so switching never remounts the editor (as theme and language changes). A chapter's new form is applied before its text loads.
- **Untitled poems:** a new poem's file and its line in `CONTENTS.md` are named with the book's word for a poem ("Poem", „שיר”; „poem.md”, „שיר.md”), or "Poem"/„שיר” by the book's language. Above the page an untitled poem says "Untitled poem"; the sidebar shows its first line, as it is typed. The poetry collection's first poem is untitled, not named after the book.
- **An unknown form** (`form: screenplay`) reads as prose and stays in the file when the author switches the Poem item off.
- **The label beside the chapter's number** appears only when a chapter's form differs from the book's new chapters ("Poem" in a novel, "Prose" in a poetry collection), so a poetry collection doesn't say "Poem" above every poem.
- **The template cards** fit five in a row on an ordinary window.
- **The niqqud picker** is offered in chapters and pages (not in outline text). It works on the letter before the cursor, where marks may already be in any order; a vowel replaces another vowel and a shin dot the sin dot.

## Consequences

- Plot Device supports four kinds of writing out of the box: novels, short stories, poetry collections and campaigns. That's worth showing on the front page.
- `form` leaves room for other forms later (a screenplay, letters) without another key.
- `partUnit` is useful beyond poetry: a campaign could call its parts "Arcs".
