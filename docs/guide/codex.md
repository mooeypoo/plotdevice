# Keep the story world close

The **Codex** holds characters, locations, and notes alongside the manuscript.
These are Markdown files too, not records locked in a database.

## Characters, places, and notes

Create an entry from its type's template, open it in the editor, and use the
inspector for the supported profile properties. A character can have other names,
a role, a birth date, and relationships.

The **Appears in** list connects characters and locations to chapters. It uses
chapter properties such as `characters`, `pov`, and `location`; mentioning a name
in ordinary prose alone does not add an appearance.

## Link instead of duplicating

Use wikilinks such as `[[Ilka Szabó]]` or `[[locations/Marrow]]`. Link completion shows
candidate types and uses a path when a name is ambiguous. `Ctrl`+click opens a link.

Aliases can help you find a character by another name. If two entries share a name,
choose deliberately rather than assuming the first result is the intended one.

When the app renames files, it can update resolved wikilinks. Ordinary Markdown
links are read but are **not rewritten on rename**. See the
[link contract](../file-format.md#links) for the exact behavior.

## Relationships are one-way

Edit a relationship on the character declaring it. The other character shows that
relationship read-only. This avoids pretending that one person's view is automatically
the other's.

## Make templates your own

Project templates live under `templates/` by default. Missing template files fall
back to the built-in defaults. Templates stay ordinary Markdown; folder preferences
and supported entry properties are documented in the [file format](../file-format.md).
