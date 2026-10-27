# storage

The project repository: a project's files as `DOMAIN_AND_FILE_FORMAT.md` describes them, opened into a
snapshot and changed safely. Implements the `ProjectRepository` port over the `FileStore`,
`ProjectFolders`, `JournalStore` and `IdGenerator` ports. Also the outline repository: `outlines/*.md`
read into the domain's `Outline` and edited by splices (ADR 0003); and the reference repository:
character, place and note pages, and the links outline cards make. And `checkProject`: what the app
would make of a book folder written elsewhere, as a list of things to fix and to know (Milestone 13).

- Checks the domain rules before writing; writes splices (via `markdown`) with the revision it
  expects, so files changed outside the app are refused, never overwritten (ADR 0005).
- `withBackups` wraps the project folders, so every file is backed up before the app overwrites it.
- File renames run through the recovery journal; interrupted ones are finished when a project opens.
- Never touches the disk directly, and imports no Node: integration tests in `test/` use `fs-node`.
