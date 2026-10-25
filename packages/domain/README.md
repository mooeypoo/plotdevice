# domain

The story's concepts and rules, in pure TypeScript, one folder per context:

- `project`: project details and what a new project needs.
- `manuscript`: the book's structure (chapters, optional parts, reading order), numbering, chapter
  file names from titles, and matching renamed files by id.
- `outline`: story outlines (sections, cards, details), the rules for editing them, and outline file
  names. Views (Board, Outline, Cards) show one outline; cards are planning, never chapters.
- `references`: characters, places and notes (kinds from their folder), page file names, search,
  and resolving `[[name]]` links without guessing.
- `text-direction`: paragraph direction rules (ADR 0004).

Imports only `shared`. Never Node, Electron, Vue, Markdown parsers or file systems: reading
`CONTENTS.md` is the `markdown` package's job. Contexts import each other only through `index.ts`.
New rules are written test-first.
