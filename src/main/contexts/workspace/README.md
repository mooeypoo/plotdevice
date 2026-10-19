# workspace

**Purpose.** Opens a folder as a project, recognizes `novel.md` or initializes a new project (writing only `novel.md`), reads project settings, and keeps the recent-projects list in `userData`.

**Main concepts.** `Project`, `ProjectRoot`, `ProjectSettings` (the `settings` block, defaults filled in), `FormatVersion` (newer formats open read-only), `RecentProject`. Projects are never nested: initialize refuses a folder inside or containing a project.

**Use cases.** Commands: `OpenProject`, `InitializeProject`, `RemoveRecentProject`. Queries: `InspectFolder`, `ListRecentProjects`, `ReadProject` (re-reads the open project after outside changes, without touching recents). Ports (with an in-memory fake beside them): `ProjectFolders`, `NovelFileStore`, `ProjectScanner`, `RecentProjectsStore`, `Clock`.

**Must not know about.** Parts, chapters, characters, dates, or any other context. It reads only its own keys of `novel.md` (`format`, `title`, `author`, `settings`). Classification by `type` happens in `infrastructure/project-scan/`.
