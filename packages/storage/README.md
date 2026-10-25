# storage

The project repository: a project's files as `DOMAIN_AND_FILE_FORMAT.md` describes them, opened into a
snapshot and changed safely. Implements the `ProjectRepository` port over the `FileStore`,
`ProjectFolders`, `JournalStore` and `IdGenerator` ports. Also the outline repository: `outlines/*.md`
read into the domain's `Outline` and edited by splices (ADR 0003).

- Checks the domain rules before writing; writes splices (via `markdown`) with the revision it
  expects, so files changed outside the app are refused, never overwritten (ADR 0005).
- File renames run through the recovery journal; interrupted ones are finished when a project opens.
- Never touches the disk directly, and imports no Node: integration tests in `test/` use `fs-node`.
