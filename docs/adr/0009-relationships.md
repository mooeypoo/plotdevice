# ADR 0009: Relationships between characters, places and notes

Status: **Accepted** (owner, 2026-10-26, with the Milestone 11 plan)

## In short

A page can say how it relates to other pages, such as "Ilka is Bea's sister", with an ordinary heading and a bulleted list. Each bullet has a few words and a link. The app shows these on the page and on its card in the gallery, and the other page lists them under "Linked from". The file stays readable and editable without the app.

```markdown
---
title: Ilka Varga
aka: [Ilka, Ili]
---
Inherits the orchard; distrusts everyone in Marrow.

## Relationships
- Sister of [Bea](bea.md)
- Owes money to [the Salt Exchange](../places/salt-exchange.md)

## Family
Daughter of Bea's sister.
```

Ilka's page shows "Sister of Bea" and "Owes money to the Salt Exchange". Bea's page shows "Ilka: Sister of" under "Linked from"; nothing is written into Bea's file.

## Decision

- **The heading is found by its name:** "Relationships" or "קשרים", in any case. The list of names lives in one place and grows when a UI language is added. When the app creates the heading, it uses the project's language and places it right after the description (or at the end, if the page has none).
- **Each top-level bullet with at least one link is one relationship.** The words around the link are what the relationship is; the link says with whom. The words can sit anywhere: "[Bea](bea.md)'s rival" works too.
  - A bullet with two links relates the page to both.
  - Bullets without a link are shown as written and aren't counted.
  - Nested bullets belong to their bullet, as details.
- **One direction.** The app never writes the reverse relationship into the other page. The other page shows it under "Linked from", using the same words.
- **The app writes only when the author adds, changes or removes a relationship**, and then changes only that bullet (and adds the heading, the first time). It never reorders, cleans up or rewrites the rest of the page. Pages without the heading are never changed.
- **Links are the usual kind:** ordinary relative Markdown links. Obsidian's `[[bea]]` is read and never written (DOMAIN_AND_FILE_FORMAT, "Links").

## Rejected

| Option | What it looks like | Why not |
|---|---|---|
| Frontmatter | `relationships: [{to: bea, as: sister}]` at the top of the file | Hidden or awkward in other editors, and easy to break when writing it by hand |
| A separate relationships file | `relationships.md` listing every pair | A second place to keep in step, and you can't see a character's relationships on their own page |
| Every link counts | Any link in the page is a relationship | A link in a paragraph doesn't say what the relationship is. Such links still show under "Linked from" |
| Both directions written | Adding "Sister of Bea" also writes "Sister of Ilka" into Bea's file | The app would change a file the author didn't touch, and the reverse wording is often different ("Mother of" / "Daughter of") |

## Engineering notes

- **Domain** (`domain/references`): find the section and its relationships beside the existing description/details split; patch one bullet with the targeted-edit approach of ADR 0003. A page that can't be read cleanly is shown and never "repaired".
- **Tests first:** heading names in both languages, words before and after the link, two links in one bullet, bullets without links, nested details, `[[wiki]]` links, mixed Hebrew and English with emoji, unchanged load and save is byte-identical, unknown frontmatter and line endings are kept.
- **"Linked from"** is a query across outlines, pages and chapters, resolved by path after link normalisation; never by matching names.
