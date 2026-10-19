# ADR 0002: Frontmatter defines structure and order

**Status:** accepted. Supersedes the ordering rule and the "chapter = folder" layout in ADR 0001.

## Context
ADR 0001 took order from numeric file-name prefixes and took structure from folders. That breaks down in three ways:
- Reordering renames files, which changes every wikilink to them.
- Titles in Hebrew, or with punctuation, make poor file names.
- Writers who organize files their own way, or keep everything in one folder, lose their structure.

The author's novel has three parts, with chapter numbering restarting in each.

## Decision
- A file's `type` key decides what it is: `part`, `chapter`, `character`, `location`, `note`, or later `scene`.
- A chapter's `part` and `order` keys decide its place in the book. Parts have their own files and their own `order`.
- Folders and file names are organization only. The app uses a configurable default folder per type when it creates files, and file names come from titles.
- The chapter is the unit of prose and story metadata for the MVP. Scene files are reserved for later.

## Consequences
- Reordering rewrites one key in a few files and renames nothing. Links never break because of a reorder.
- A file's place in the book is readable in the file itself, in any editor. A file browser no longer shows the book's order, unless `settings.order_prefix` is turned on.
- Frontmatter can be wrong in new ways: duplicate or missing `order`, or a `part` that doesn't resolve. The app shows these as warnings and puts the affected chapters in an unordered tray.
- A file with no frontmatter can't be a chapter. It's listed as untyped until the writer sets a type.
