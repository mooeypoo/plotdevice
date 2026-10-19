# shared-kernel

**Purpose.** Small, stable types that every context uses. Pure TypeScript: no Node (not even `node:path`), Electron, Vue, or libraries.

**Main concepts.**
- `Result`, `ok`, `err`: expected failures without exceptions. `DomainError`: a failure as plain, IPC-safe data.
- `ProjectPath`: a project-relative, forward-slash path; an entry's identity, kept exactly as spelled on disk.
- `FileName`: a name the app may write (Windows-safe, link-safe, NFC). `fileNameFromTitle` builds one from any title.
- `WikiLink`: a parsed `[[target#subpath|shown text]]`. It doesn't resolve links; that needs the project's files.
- `nameComparisonKey`: NFC plus locale-independent case folding, used for every name comparison.

**Must not know about.** Any context, the filesystem, or frontmatter. If something here grows behavior, it belongs in a context.
