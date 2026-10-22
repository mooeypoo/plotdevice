# workspace

**Purpose.** Opens a folder as a project, recognizes `novel.md` or initializes a new project (writing only `novel.md`), reads project settings, and keeps the recent-projects list in `userData`.

**Main concepts.** `Project` (with the book's `language`, or `null`), `ProjectRoot`, `ProjectSettings` (the `settings` block, defaults filled in, including the writer's `vocabulary`), `FormatVersion` (newer formats open read-only), `RecentProject`. Projects are never nested: initialize refuses a folder inside or containing a project.

**Use cases.** Commands: `OpenProject`, `InitializeProject` (writes `novel.md` in the chosen book language's words), `SetBookLanguage` (edits only `language`), `RemoveRecentProject`. Queries: `InspectFolder`, `ListRecentProjects`, `ReadProject` (re-reads the open project after outside changes, without touching recents). Ports (with an in-memory fake beside them): `ProjectFolders`, `NovelFileStore`, `ProjectScanner`, `RecentProjectsStore`, `Clock`.

**Warnings.** Semantic codes/parameters preserve invalid settings and unreadable/newer-format reasons; presentation language never changes read-only/default decisions or source files.

**Failures.** Typed folder checks refuse inconclusive nesting/search exhaustion; errors retain exact OS paths/details without choosing presentation language. Recents errors never block a usable open; invalid settings stay untouched and failed reads prevent rewrites.

**Must not know about.** Parts, chapters, characters, dates, or any other context. It reads only its own keys of `novel.md` (`format`, `title`, `author`, `language`, `settings`). The book's words arrive resolved through its ports; it never sees the interface language. Classification by `type` happens in `infrastructure/project-scan/`.
