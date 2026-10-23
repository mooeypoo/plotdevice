# Keep the story world close

The **Codex** holds characters, locations, and notes alongside the manuscript.
These are Markdown files too, not records locked in a database.

## Characters, places, and notes

Select a character, location, or note to read its rendered Markdown page in the
right-hand **Reference** tab without replacing your manuscript. Select another
entry to switch references. Character rows put the role (or other names when
there is no role) below the name, with room for two lines.

Use **Edit** beside an entry, or **Open on the page** in the reference, to edit its
raw Markdown in the center and its supported profile details in **Details**.
A character can have other names, a role, groups, a birth date, and relationships.
Creating an entry still opens it on the page so you can write it immediately.
Entries you open join the tabs: keep or pin one for longer work, then use
**Back to your chapter** to resume your manuscript. Pin your chapter first
when you want to annotate other manuscript pages without changing it.
[Learn the tab workflow](writing.md#keep-your-writing-chapter-close).

The reference has its own reading position for each file during this project
session. It supports the same inert Markdown as the outline: project links work,
but raw HTML, remote images, and web navigation do not run. Links followed inside
a reference replace that reference, not the manuscript. If the same file is open
on the page, the reference shows its current draft, clearly labelled; there is
never a second writable copy.

**Details** always describes the entry on the page. Switch between
**Details**, **Outline**, and **Reference** without losing your selected
reference or outline. Reference and outline share a resizable reading width;
Details keeps its fixed width. Reference selection and reading positions
reset when you leave the project; no project files are changed by looking things up.

The **Appears in** list connects characters and locations to chapters. It uses
chapter properties such as `characters`, `pov`, and `location`; mentioning a name
in ordinary prose alone does not add an appearance.

## Organize your cast

Keep supporting characters in the codex without keeping every name in view.
Open a character and use **Groups** in Details: choose an existing name
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

Links to characters, locations, and notes open in Reference; links to manuscript
entries open on the page unless followed from inside Reference itself.
The **Listed by** character links in its relationships also open in Reference.

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
