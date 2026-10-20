# codex

**Purpose.** Story-world entries and free-form notes: characters, locations, notes, and the untyped files the writer can give a type. Edits change only the body or only the edited keys.

**Main concepts.** `CodexEntry` (`character`, `location`, `note`), `CodexProperties` (the inspector's view: the keys the app edits, `relationships` with "listed by" from other characters, and every other key shown as written), `CodexChanges` → `CodexWrite`, `newCodexText` (templates that only seed new files), `UntypedFile`.

**Use cases.** Queries: `ListCodex`, `OpenCodexEntry`, `GetCodexProperties`, `PlanCodexRename`. Commands: `SaveCodexText`, `UpdateCodexProperties`, `UpdateRelationships` (ADR 0007), `CreateCodexEntry` (from `templates/<kind>.md` or the default), `EditTemplate`, `SetEntryType`, `RenameCodexEntry`. Every command refuses read-only projects.

**Ports.** `CodexRepository` (in-memory fake beside it) and the shared `EntryRelocator`.

**Must not know about.** Chapters, parts, or story dates. "Appears in" is the cross-context query `src/main/queries/get-appears-in.ts`, built on the manuscript's `ListChapterReferences`.
