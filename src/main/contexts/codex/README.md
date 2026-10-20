# codex

**Purpose.** Story-world entries and free-form writing: characters, locations, notes, the writer's outlines (`type: outline`), and the untyped files the writer can give a type. Edits change only the body or only the edited keys.

**Main concepts.** `CodexEntry` (`character`, `location`, `note`), character-only overlapping `groups` discovered from files (ADR 0013), `CodexProperties` (editable keys, relationships with "listed by", and unknown or malformed group metadata shown read-only), `CodexChanges` → `CodexWrite`, `newCodexText` (templates that only seed new files), `UntypedFile`. Group edits use existing surgical/version-checked writes; non-character group metadata and tags remain untouched.

**Use cases.** Queries: `ListCodex`, `OpenCodexEntry`, `GetCodexProperties`, `PlanCodexRename`. Commands: `SaveCodexText`, `UpdateCodexProperties`, `UpdateRelationships` (ADR 0007), `CreateCodexEntry` (from `templates/<kind>.md` or the default), `EditTemplate`, `CreateOutline`, `SetEntryType`, `RenameCodexEntry`. Every command refuses read-only projects.

**Ports.** `CodexRepository` (in-memory fake beside it) and the shared `EntryRelocator`.

**Recovery.** The markdown adapter records exact versioned bytes for shared recovery; recovered templates are separate notes, never replacements for active templates.

**Outline presentation.** The renderer provides a resizable rendered-Markdown reference with raw editing in the main editor. This context still reads/writes only plain Markdown, independent of its presentation.

**Must not know about.** Chapters, parts, or story dates. "Appears in" is the cross-context query `src/main/queries/get-appears-in.ts`, built on the manuscript's `ListChapterReferences`.
