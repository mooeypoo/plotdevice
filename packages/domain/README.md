# domain

The story's concepts and their rules, in pure TypeScript: today, text direction (ADR 0004). Project,
manuscript, outline and story-bible contexts arrive in Gate 2 and later, one folder each.

- Imports only `shared`. Never Node, Electron, Vue, Markdown parsers, file systems or translations.
- Other contexts import a context only through its `index.ts`.
- New rules are written test-first.
