# manuscript

**Purpose.** The book's structure and prose: parts and chapters, their order from frontmatter, word counts, and their properties. Saves change only the body or only the edited frontmatter keys.

**Main concepts.** `Part`, `Chapter`, `Manuscript` (numbered parts, unnumbered parts, a flat list for books without parts, the unordered tray, warnings), `EntryProperties` (the inspector's view of a file's keys), `PropertyChanges` → `PropertyWrite`, `orderChanges`/`placeAt` (which `order` values a move writes), `entryWarnings` (ambiguous links and unusable values, for the warnings panel), `countWords`, statuses. `Scene` is reserved for later.

**Use cases.** Queries: `GetManuscript`, `OpenEntry`, `GetEntryProperties`, `ListStatuses`, `PlanRename`. Commands: `SaveEntryText`, `UpdateEntryProperties`, `CreateChapter`, `CreatePart`, `RenumberPart`, `AddStatus`, `MoveChapter`, `MovePart`, `RenameEntry`. Saves from the editor and the inspector refuse a file that changed on disk since it was read; moves and renumbering re-read each file and change only `order` and `part`. Every command refuses read-only projects.

**Ports.** `ManuscriptRepository` (files' frontmatter and bodies) and `EntryRelocator` (moving or renaming a file and updating links to it), each with an in-memory fake beside it.

**Must not know about.** Folders or file names as structure (ADR 0002; a move only decides whether the file follows its part), the codex, chronology, Electron, or which project is open (repositories are built per project by the composition root).
