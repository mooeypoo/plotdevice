# ADR 0004: Edit frontmatter by replacing source ranges, not by re-serializing

**Status:** accepted

## Context
The app must change single frontmatter keys (a title, an order, a list of characters) without touching anything else: comments, the spaces that align them, key order, quoting, unknown keys, CRLF, the BOM. The `yaml` library's Document API keeps comments and order, but writing a document back reformats it. For example, it collapses `genre: literary fiction       # note` to one space before the `#`.

## Decision
- Parse the frontmatter with `yaml` only to find where each top-level key's value sits in the source text.
- To change a key, replace exactly the characters of its value. To add a key, append one line before the closing `---`. To remove one, delete its lines.
- Keep the value's shape: a flow list stays a flow list, a block list keeps its indentation, a quoted string keeps its quotes, and a single value that becomes a list is written as a block list. New lines use the frontmatter's own line ending.
- After every edit, re-parse and check that the edited key has the intended value and every other key is unchanged. A mismatch is a bug: nothing is written.
- Values the app can't rewrite safely (lists of mappings, such as `relationships`) are refused rather than guessed at.

The code is `src/main/infrastructure/markdown/frontmatter-editor.ts`.

## Consequences
- Editing one key leaves every other byte of the file identical. Tests check this on every fixture file.
- The editor handles top-level keys with scalar or scalar-list values. Nested values (relationships) need their own careful editor when the codex edits them (Phase 5).
- It's more code than `document.set(key, value); document.toString()`, and that's the point.
