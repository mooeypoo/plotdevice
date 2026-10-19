# manuscript

**Purpose.** The book's structure and prose: parts and chapters, their order from frontmatter, word counts, and their properties. Saves change only the body or only the edited frontmatter keys.

**Main concepts.** `Part`, `Chapter`, `Manuscript` (numbered parts, unnumbered parts, a flat list for books without parts, the unordered tray, warnings), `EntryProperties` (the inspector's view of a file's keys), `PropertyChanges` → `PropertyWrite`, `countWords`, statuses. `Scene` is reserved for later.

**Use cases.** Queries: `GetManuscript`, `OpenEntry`, `GetEntryProperties`, `ListStatuses`. Commands: `SaveEntryText`, `UpdateEntryProperties`, `CreateChapter`, `CreatePart`, `RenumberPart`, `AddStatus`. Saves from the editor and the inspector refuse a file that changed on disk since it was read; renumbering re-reads each file and changes only `order`. Every command refuses read-only projects. Port: `ManuscriptRepository`, with an in-memory fake beside it.

**Must not know about.** Folders or file names as structure (ADR 0002), the codex, chronology, Electron, or which project is open (repositories are built per project by the composition root).
