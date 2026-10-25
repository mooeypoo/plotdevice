# domain

The story's concepts and rules, in pure TypeScript, one folder per context:

- `project`: project details and what a new project needs.
- `manuscript`: the book's structure (chapters, optional parts, reading order), numbering, chapter
  file names from titles, and matching renamed files by id.
- `text-direction`: paragraph direction rules (ADR 0004).

Imports only `shared`. Never Node, Electron, Vue, Markdown parsers or file systems: reading
`CONTENTS.md` is the `markdown` package's job. Contexts import each other only through `index.ts`.
New rules are written test-first.
