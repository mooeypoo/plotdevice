# ADR 0007: Edit lists of mappings (relationships) item by item

**Status:** accepted

## Context
ADR 0004 edits one frontmatter value by replacing its characters, and refuses lists of mappings such as a character's `relationships`. The codex needs to edit them. Re-serializing the list would drop comments and change quoting in every entry, even the ones the writer didn't touch.

## Decision
- Compare the list as written with the list wanted, item by item, in order:
  - a changed field: replace only its value's characters, keeping its quoting;
  - a new field: add a line at the end of the item, aligned with its first field;
  - a removed field: delete its line (the first field shares a line with the `-`, so removing it is refused);
  - a removed item: delete its lines; new items: append after the last one, aligned with the others.
- An empty list removes the key; a missing key gets a block list.
- Only block lists of block mappings with plain values are edited. Flow style (`[{with: …}]`) or nested values are refused as `unsupported-value`, and the inspector shows the relationships read-only with a note.
- After editing, re-parse and check that only that key changed, to exactly the wanted list; otherwise it's a bug and nothing is written.

The code is `src/main/infrastructure/markdown/mapping-list-editor.ts`.

## Consequences
- Editing one relationship leaves comments and the other relationships byte-identical (tested).
- Reordering relationships in the app would rewrite the items whose position changed; the app doesn't offer reordering.
- Relationships are one-way: editing one character never writes another character's file.
