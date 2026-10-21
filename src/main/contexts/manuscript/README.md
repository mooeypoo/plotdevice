# manuscript

**Purpose.** The book's structure and prose: parts and chapters, their order from frontmatter, word counts, and their properties. Saves change only the body or only the edited frontmatter keys.

**Main concepts.** `Part`, `Chapter` (with its `pov` and `threads`, for the Overview), `Manuscript` (numbered parts, unnumbered parts, a flat list for books without parts, the unordered tray, warnings), `EntryProperties` (the inspector's view of a file's keys), `PropertyChanges` → `PropertyWrite`, `orderChanges`/`placeAt` (which `order` values a move writes), `entryWarnings` (ambiguous links and unusable values, for the warnings panel), `chapterReferences` (which files a chapter's `pov`, `characters`, and `location` point to), `countWords`, statuses. `Scene` is reserved for later.

**Use cases.** Queries: `GetManuscript`, `OpenEntry`, `GetEntryProperties`, `ListStatuses`, `PlanRename`, `ListChapterReferences`. Commands: `SaveEntryText`, `UpdateEntryProperties`, `CreateChapter`, `CreatePart`, `RenumberPart`, `AddStatus`, `MoveChapter`, `MovePart`, `RenameEntry`, `FixWarning` (a warning's one-click fix: write an ambiguous link with its folder, or quote a link). Saves from the editor and the inspector refuse a file that changed on disk since it was read; moves and renumbering re-read each file and change only `order` and `part`. Every command refuses read-only projects.

**Ports.** `ManuscriptRepository` (files' frontmatter and bodies) and `EntryRelocator` (moving or renaming a file and updating links to it), each with an in-memory fake beside it.

**Recovery.** The markdown adapter records exact versioned bytes for the shared project recovery service; domain models never reconstruct or store recovery metadata.

**Diagnostics.** Warnings retain source/fix parameters; migrated save/property/structural/create/status/fix failures retain semantic reasons/paths/keys. Presentation language is renderer-owned and never triggers repairs.

**Must not know about.** Folders or file names as structure (ADR 0002; a move only decides whether the file follows its part), the codex, chronology, Electron, or which project is open (repositories are built per project by the composition root).
