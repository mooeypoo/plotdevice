# Keep the story world close

The **Codex** holds characters, locations, and notes alongside the manuscript.
These are Markdown files too, not records locked in a database.

## Characters, places, and notes

Create an entry from its type's template, open it in the editor, and use the
inspector for the supported profile properties. A character can have other names,
a role, groups, a birth date, and relationships.

The **Appears in** list connects characters and locations to chapters. It uses
chapter properties such as `characters`, `pov`, and `location`; mentioning a name
in ordinary prose alone does not add an appearance.

## Organize your cast

Keep supporting characters in the codex without keeping every name in view.
Open a character and use **Groups** in the inspector: choose an existing name
from the suggestions, or type a new one and press Enter. A character can belong
to several groups, such as **Main cast**, **Part 2**, and **The Observatory**.
Use the remove button on a group chip to remove only that membership.

In the character list:

- **All** lists each character once; **Grouped** shows collapsible group headings
  with counts. A character can appear under several headings, all opening the
  same file. Characters without memberships appear under **Ungrouped**.
- **Filter groups** shows characters in any selected group. In All mode a
  character appears once even when several selected groups include them; in
  Grouped mode only the selected groups are shown. Clear group filters to see
  the whole cast again.
- Search matches names and aliases across the current filter, including Hebrew.
  Matching groups expand while searching; clearing the search restores their
  collapse state. The shown count counts files, not repeated group rows.

List mode, collapsed groups, and filters are remembered per project on this
computer, not written into the project folder. Groups removed outside the app
are ignored by the filter until they exist again.

Membership lives in each character's ordinary frontmatter:

```yaml
groups:
  - Main cast
  - Part 2
```

There is no separate group list to maintain in `novel.md`. A group disappears
when no characters use it; names differing only by case or Unicode normalization
are treated as the same group. Existing `tags` are not changed. A malformed
`groups` value is shown read-only with an explanation, never silently replaced.

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
