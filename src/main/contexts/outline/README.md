# outline

**Purpose.** The writer's outlines (`type: outline`): free-form plans, read beside the draft and, from plotting mode on, as a board (ADR 0020). Edits change only the body; frontmatter is never touched.

**Main concepts.** `OutlineFile` (path and title), `newOutlineText`, `OutlineWords` (a new outline's title and the Inbox heading, resolved from the book language by the composition root, ADR 0019).

**Use cases.** Queries: `ListOutlines` (by title, leaving out the template folder), `OpenOutline`. Commands: `CreateOutline` (at the project root, named uniquely across the project), `SaveOutlineText` (version-checked). Commands refuse read-only projects. Until `api.outline` arrives in P2, the codex IPC handler forwards outline calls here.

**Ports.** `OutlineRepository`, with an in-memory fake beside it.

**Must not know about.** Chapters, threads, or the codex: the board's chapter facts and thread colors are cross-context queries (`src/main/queries/`). It never sees the interface language.
