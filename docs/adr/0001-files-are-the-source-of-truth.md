# ADR 0001: The novel folder is the only source of truth

**Status:** accepted. The ordering rule and its consequences are superseded by [ADR 0002](0002-frontmatter-defines-structure.md); the rest still holds.

## Context
The novel must remain usable if the app disappears, and it must be editable in Obsidian while the app is open.

## Decision
- All persistent data lives in markdown files with YAML frontmatter, as defined in `docs/file-format.md`. There is no database or hidden index in the project folder.
- An entity's identity is its project-relative path. Scenes don't carry a hidden ID.
- Order comes from numeric name prefixes, not from a manifest file.
- Every view (outline, timeline, interactions) is computed from the files on load and recomputed when they change.

## Consequences
- Anyone can read and edit the project with no tools. Git diffs stay readable.
- Reordering renames files, so the app must update wikilinks. This is a single use case, and it's tested.
- A file moved outside the app looks like a delete plus an add. That's acceptable, because nothing outside the file depends on its path except wikilinks, which follow file names the same way Obsidian's do.
- Projects of a few hundred scenes load in well under a second, so a cache isn't needed. If one is ever added, it goes in `userData` and must be safe to delete.
