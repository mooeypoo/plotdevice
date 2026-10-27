# Milestone 12: Tags on pages

Status: **Approved** (2026-10-27), with the recommended answers to the open decisions; in progress on branch `milestone-12/tags` (PR #30). The decisions behind it are in `milestone-11-story-plot-and-world.md`, section "Later: tags on pages".

## Goal

A novel may have 20 characters, and the author needs the right ones at hand: this part's main and secondary characters while writing Part Two, the Varga family while planning a subplot. Today the link picker offers the first five pages A to Z, and the gallery and shelf have no way to group.

Authors give pages **tags** they type themselves ("Part Two – main", "Varga family", "the Marrow plot"). Any list of pages can then be grouped by the tags the author picks: those pages first, one group per tag, everyone else folded below.

**Out of scope:**

- Tag colours (owner decision 5). Tags are calm, neutral pills.
- Tags on chapters or outline cards.
- Working out tags or importance from links or names in the prose.
- A separate tag manager screen.

## What the author will see

### On a page

Pills under the title, with "+ Tag":

```
Noël Arceneaux
(Part One – secondary ×) (Part Two – main ×) (Marrow folk ×)  + Tag
```

"+ Tag" opens a small field that suggests the project's existing tags as the author types. Enter adds the highlighted tag, or creates a new one if nothing matches. × removes a tag from this page only.

### Above a list of pages

The same tag row sits above the World gallery (Characters, Places, Notes), the reference shelf's search, and the link picker. It shows only the tags used by that kind of page; in the shelf and the link picker, the tags of all pages.

```
Characters      (Main ✓) (Part Two – main ✓) (Part Two – secondary) (Varga family) …

 Main
   Ilka   Bea   Josef
 Part Two – main
   Noël
 ▸ Everyone else (14)
```

- Choosing tags groups the list: one group per chosen tag, in the order chosen; a page with two chosen tags appears in the first group only; "Everyone else" follows, folded. With no tag chosen, the list is as today.
- Typing in search filters names across all groups, Everyone else included. A tag whose name matches what's typed is offered as a pill to choose.
- Right-clicking a pill (or its `⋯` from the keyboard) offers "Rename everywhere…" and "Remove from all pages…". Each says how many pages will change before doing it.

### Tidying tags, only when there's something to tidy

When a project opens, the app checks its tags. If nothing needs tidying, nothing is shown, and there is no "Tidy tags" anywhere. If something does, the existing notice appears once:

```
Some tags may need tidying (3).   [Tidy tags…]  ×
```

"Tidy tags…" opens a small dialog listing what was found:

- **Near-duplicates:** tags that match once case, spaces, dashes and punctuation are ignored, or that differ by one or two letters (`Varga famliy` and `Varga family`). Each pair offers "Merge into '…'", which is "Rename everywhere" and says how many pages will change. "Part 2" versus "Part Two" isn't caught: number words in every language are out of scope.
- **Pages whose tags can't be read**, because their frontmatter is broken YAML. Each one offers "Open page", where the existing "kept as written" notice shows the problem. Nothing is repaired without the author.

Tags used on only one page are not a problem, since every new tag starts that way, and are not reported.

- Each fix is a button the author presses, and only `tags:` lines change. The app never tidies by itself.
- × or "Not now" dismisses the notice. It returns only when the project has a problem it hasn't reported before, not on every open. Which problems were already reported is personal state kept in app data.
- While problems remain, "Tidy tags…" also stays in the tag row's menu. When none remain, it disappears.

### While writing

The tags chosen on the shelf and in the link picker are remembered per part. Moving to a chapter in Part Two brings back the tags last chosen in Part Two. Chapters outside any part, and books without parts, share one remembered choice.

## Decisions (owner, 2026-10-27)

1. Tags are written as the author says them, spaces included. There's no slug/display-name split.
2. Choosing tags groups the list (as above).
3. Chosen tags are remembered per part while writing, if it stays simple.
4. Characters, places and notes all have tags.
5. No tag colours for now.
6. Tag problems are checked when a project opens. The author is told only when there is something to tidy, and is offered to tidy it. Otherwise nothing is shown.

## Settled with the plan (owner, 2026-10-27: the recommendations)

1. **How remembered tags find their part.** Parts have no id, only their name in `CONTENTS.md`. Remembered by part name. If a part is renamed, its remembered choice is simply forgotten. It's personal convenience, kept in app data, so nothing in the book breaks.
2. **Many tags in one row.** The row wraps to at most two lines, then "+ 6 more" opens the rest in a small list with search.
3. **A page whose frontmatter can't be read** (broken YAML) during "Rename everywhere". It's skipped and named in the result ("2 pages couldn't be changed: …"); nothing is repaired without the author.
4. **An ADR?** No. One optional frontmatter list is a small format change; it goes into `DOMAIN_AND_FILE_FORMAT.md` beside `aka`.

## File format

```markdown
---
title: Noël Arceneaux
aka: [Noël]
tags: [Part One – secondary, Part Two – main, Marrow folk]
---
```

- `tags` is a frontmatter list, like `aka`; a single value is read as one tag. Blank entries are ignored.
- Matching ignores case (in any script) and surrounding spaces. A tag is shown with the first spelling the app finds, in A-to-Z file order, so the display is stable.
- The app writes only the `tags:` line, as a flow list (`[a, b]`), quoting a tag only when YAML needs it (a colon followed by a space, a comma, brackets, a leading quote or `#`). Removing the last tag removes the line.
- A page without `tags` is never changed until the author tags it. Unknown frontmatter keys, the body and line endings are kept as they are.

## Files

- **Markdown:** `frontmatter.ts` (set or remove one list-valued key, keeping the rest byte-identical); `reference-page.ts` (read `tags`), with tests.
- **Domain:** `references/` (tag normalising and matching; the first spelling wins; finding near-duplicates), with tests.
- **Application:** `references/` (add or remove a tag on a page; rename or remove a tag on every page, with a result that names skipped pages), with tests.
- **Contracts:** `references.ts` (`tags` on the summary view; requests to add, remove and rename tags), `api.ts`, the IPC channels and schemas.
- **Storage:** `reference-repository.ts` (write the tags line through the existing safe page writes).
- **Desktop:** `reference-ipc.ts`; the remembered tags per part, and the tag problems already reported, next to the pinned shelf in the recent-projects app data.
- **Presentation:** `references.ts` (the project's tags for a kind; grouping a list by chosen tags; search within groups; tag suggestions while typing).
- **UI:**
  - new `TagPills.vue` (the pills, "+ Tag" with suggestions, × to remove);
  - new `TagFilter.vue` (the row of tags to choose, "+ N more", the right-click menu);
  - `ReferencePage.vue` (the pills under the title);
  - `WorldGallery.vue`, `ReferenceShelf.vue`, `LinkPicker.vue` (the row and the groups);
  - new `TidyTagsDialog.vue`; the notice in `App.vue` and `stores/project.ts` gains an optional action button.
- **Words:** `packages/i18n/src/messages/en.json`, `he.json`.
- **Demo:** the Salt Orchard samples (English and Hebrew) get a few tags, including per-part ones.
- **Docs:** `DOMAIN_AND_FILE_FORMAT.md` (the `tags` key); `UX_SPEC.md` (tags and grouping); the user guide (English and Hebrew) on the docs site.

## Tests

- **Markdown (test-first):**
  - Reads a list, a single value, an empty list, and Hebrew tags.
  - Adding, removing and renaming change only the `tags:` line; removing the last tag removes it.
  - Quotes only when needed (`"Part Two: Salt"`), and reads unquoted tags written by hand where YAML allows.
  - Unknown keys, the body and CRLF line endings are kept; a load and save with no change is byte-identical.
- **Domain:** matching ignores case and spaces; the first spelling wins; mixed Hebrew and English.
- **Domain:** near-duplicates.
  - Found when only case, spaces, dashes or punctuation differ, or one or two letters in a longer tag.
  - Not found for short tags that merely look alike ("Main" and "Maid"), or for tags used once.
  - Hebrew and English tags are never paired with each other.
- **Application:** rename everywhere touches only pages with that tag, merges into an existing tag without duplicates on a page, and reports pages it couldn't read without changing them.
- **Presentation:** grouping follows the chosen order; a page appears once; "Everyone else" counts the rest; search filters inside groups; a matching tag is offered.
- **Desktop:** remembered tags per part survive a restart and never touch the project folder.
- **End to end:**
  - Tag a character from its page, picking an existing tag from the suggestions, then remove it.
  - In Characters, choose two tags and see two groups and "Everyone else"; search within them.
  - Rename a tag everywhere and see every page change, and only its `tags:` line in the files.
  - While writing, choose tags in Part One, move to Part Two and choose others, come back, and see Part One's again; the same after a restart.
  - The link picker shows the chosen groups before anything is typed.
  - **Tidying:**
    - A project with clean tags opens with no notice and no "Tidy tags".
    - A project with `Varga famliy` and `Varga family` shows the notice once. Merging fixes every page, and "Tidy tags" disappears.
    - Reopening after "Not now" shows nothing until a new problem appears.
  - **Hebrew:** the pills and the row mirror; keyboard use works throughout (Tab to the pills, Enter to choose, Delete or × to remove).
- **Screens:** a page with tags, the gallery grouped, the shelf grouped, in both themes and both languages, checked by eye.

## Work order

1. The file format in `DOMAIN_AND_FILE_FORMAT.md`; reading and writing the `tags` line (markdown, domain).
2. Tags on a page: application, contracts, IPC, and the pills on the page.
3. Grouping: presentation, the tag row, the World gallery.
4. The shelf and the link picker, with tags remembered per part.
5. Rename and remove everywhere.
6. Tidying: the check when a project opens, the notice, the dialog.
7. Demo novels, guide, screenshots.
