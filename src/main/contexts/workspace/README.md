# workspace

**Purpose.** Opens a folder as a project, recognizes `novel.md` or initializes a new project, reads project settings, and keeps the recent-projects list in `userData`.

**Main concepts.** `Project`, `ProjectRoot`, `ProjectSettings` (the `settings` block of `novel.md`), `FormatVersion`.

**Must not know about.** Parts, chapters, characters, dates, or any other context. It never decides what a file *is*; classification by `type` happens in `infrastructure/project-scan/`.

**Status.** Empty until Phase 1.
