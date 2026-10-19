# Architecture

## In one paragraph

The Electron **main process** owns the domain, the use cases, and all file access. The **renderer** (Vue) is a presentation layer that calls a typed API exposed by the **preload** script. The code is organized by **bounded context** first and by layer second. Domain code is pure TypeScript, so it can be tested without Electron or a disk.

```
 renderer (Vue, Pinia)          preload            main process
 ───────────────────────   ─────────────────   ─────────────────────────────────────
 features/* components  ──▶  window.plotDevice ──▶ ipc handlers ──▶ application (use cases)
 stores hold DTOs       ◀──  change events    ◀──     │                 │
                                                      │            domain (pure)
                                                      ▼                 ▲
                                              infrastructure ─ implements ports ─┘
                                              (fs, yaml, watcher)
```

## Bounded contexts

| Context | Owns | Key concepts |
|---|---|---|
| **workspace** | Opening a folder, recognizing or initializing a project, project settings, recent projects, file watching | `Project`, `ProjectRoot`, `ProjectSettings`, `FormatVersion` |
| **manuscript** | Structure and prose | `Manuscript`, `Part`, `Chapter`, `Status`, `Synopsis`, `WordCount`, `ChapterOrder` |
| **codex** | Story-world entries and notes | `Character`, `Location`, `Note`, `Relationship`, `Alias` |
| **chronology** | Story time and plotlines | `StoryDate`, `Calendar`, `Thread`, `TimelineEntry` |

`Scene` is reserved for a later version (see `docs/file-format.md`).

**Contexts never import each other.** Each context exposes its use cases from `application/`, split into `commands/` (which change state) and `queries/` (which return read models).

**Cross-context read models** (outline, "appears in", interactions, timeline grid) live in `src/main/queries/`. They use the `application/queries/` of the contexts they combine, and they return DTOs. They never change entities. Each context's domain stays small and knows nothing about the others.

**Classifying files.** Every file's `type` comes from its frontmatter (`docs/file-format.md`). A shared infrastructure scanner (`infrastructure/project-scan/`) reads each file's frontmatter once and hands files of a given type to the repository that asks for them. Contexts never look at folders or file names to decide what a file is.

**Shared kernel** (`src/main/shared-kernel/`) holds small, stable types that every context uses: `Result`, `DomainError`, `ProjectPath`, `FileName` (with Windows-safe validation and title-to-file-name conversion), and `WikiLink`. It is pure: no Node, no `node:path`. A `ProjectPath` is a project-relative path that uses forward slashes on every OS. Keep the kernel small. If something there starts growing behavior, it probably belongs to a context.

## Layers inside a context

```
src/main/contexts/manuscript/
  domain/           entities, value objects, domain services, repository interfaces (ports)
  application/
    commands/       use cases that change state
    queries/        use cases that return read models; the only part other code may use
  infrastructure/   adapters: MarkdownChapterRepository, etc.
  README.md
```

The dependency rule: `infrastructure → application → domain`. `domain` depends only on `shared-kernel`. Concrete adapters are wired in only in `composition-root.ts`. `dependency-cruiser` enforces all of this in `npm run lint`. A test in `tools/dependency-rules/` proves that each rule catches a violation and allows legitimate imports.

## Main-process layout

```
src/
  main/
    index.ts                  # app lifecycle, window creation
    composition-root.ts       # the only place that wires concrete adapters into use cases
    ipc/                      # one file per context; maps API calls to use cases, validates payloads with zod
    queries/                  # cross-context read models (outline, timeline grid, interactions, appears-in)
    shared-kernel/
    contexts/
      workspace/  manuscript/  codex/  chronology/
    infrastructure/           # cross-context technical adapters
      markdown/               # frontmatter document (yaml Document API), wikilink parser, body/frontmatter split
      fs/                     # atomic writer, path guard, line-ending and BOM preservation
      project-scan/           # finds .md files (skipping dot-folders) and classifies them by `type`
      watching/               # chokidar wrapper, own-write suppression
  preload/
    index.ts                  # exposes `window.plotDevice`, implementing the contract via ipcRenderer.invoke
  contract/
    api.ts                    # the PlotDeviceApi interface: the whole renderer↔main surface
    dtos.ts                   # plain serializable shapes; no classes, no methods
    events.ts                 # main → renderer events (for example `project:changed`)
  renderer/
    src/
      app/                    # shell, router, layout
      features/
        welcome/  binder/  editor/  inspector/  outline/  timeline/  codex/  interactions/
      shared/                 # generic UI components and composables
      assets/fonts/           # bundled OFL fonts (Literata, Frank Ruhl Libre, IBM Plex Sans + Hebrew); the CSP blocks remote fonts
```

`contract/` is the only code shared between main and renderer. The renderer imports DTOs, never domain classes.

`node:path` is used only in infrastructure, which converts between OS paths and `ProjectPath`.

## Key mechanisms

**Frontmatter editing.** `infrastructure/markdown/frontmatter-editor.ts` changes one key at a time by replacing only that value's characters in the source (ADR 0004); it never re-serializes YAML. Every edit is re-parsed and checked to have changed exactly that key, or nothing is written. Tests run edits over every fixture file and check that every other byte is unchanged.

**Saving prose.** The editor sends body text with a debounce of about 800 ms and on blur. The main process replaces only the body part of the file and keeps the frontmatter bytes exactly as they were. CodeMirror works with `\n` internally, so the writer converts the text back to the file's line endings.

**External changes.** The watcher emits change events for paths inside the project. Writes the app made itself are suppressed by remembering their content hash for a short time. For anything else, the affected read models are invalidated and the renderer gets `project:changed`. A change that only converts line endings (Obsidian rewrites CRLF files as LF) is not treated as an edit. If the chapter open in the editor changed on disk while it has unsaved edits, the editor shows a banner: "Changed outside the app — keep mine / load theirs".

**Reordering and moving.** Order lives in frontmatter, so `ReorderChapters` rewrites only the `order` key of the affected chapters and renames no files. `MoveChapter` updates `part` and `order`. It moves the file only if the file is in its old part's default folder. Both compute a plan in the domain, so they can be unit-tested without touching the disk.

**Renames.** `RenameEntry` happens when a title changes (depending on `settings.file_names`) or when the writer asks for it. It computes a rename plan (old path → new path), applies it, then calls `UpdateWikiLinks`, which rewrites matching links across the project. Rename plans use temporary names when needed, so swaps and case-only renames work on case-insensitive file systems.

**The open project.** `ipc/project-session.ts` holds the one open project and the per-project use cases the composition root builds for it (repositories bound to that folder, and the project's folder settings). The inspector's choices come from `queries/get-inspector-vocabulary.ts`, which combines the manuscript's statuses with chronology's threads and calendar. Opening another project replaces it; closing clears it.

**Saving safely.** Each opened part or chapter carries a version (a hash of the file). A save re-reads the file first: if it changed since it was opened, the save is refused (`changed-on-disk`) and the editor asks the writer to load the file's version or keep theirs. Unchanged text is never written, so opening and reading a chapter never touches the file. When the window closes, `ipc/close-guard.ts` waits for the renderer to save; if text can't be saved, the writer is asked before it is lost.

**Path safety.** The main process only opens project folders the writer chose in the native dialog or that are in the recents list (`ipc/workspace-handlers.ts`), so the renderer can't make it read an arbitrary folder. Every path coming in through IPC is resolved against the project root and rejected if it escapes. File names are built through `FileName`, which rejects names that are invalid on Windows or that break links.

## Security baseline

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The preload exposes only the `PlotDeviceApi` methods, with no generic `invoke`. IPC handlers reject calls that don't come from the app's own window and top frame, and validate every payload with zod. New windows and navigation are denied, and only `https:` links open in the system browser. A strict Content-Security-Policy is set in the renderer HTML.

## Testing pyramid

- **Domain:** most tests live here. Plain Vitest, no mocks needed.
- **Application:** use cases with in-memory repository fakes, which live next to the ports.
- **Infrastructure:** real files in a temp copy of `fixtures/sample-novel/`. The fixture includes:
  - three parts with chapter numbering restarting in each part
  - a chapter whose folder disagrees with its `part`
  - duplicate and missing `order`
  - untyped files and a file of an unknown type
  - CRLF, mixed line endings, and missing trailing newline
  - a UTF-8 BOM file and a non-UTF-8 file
  - YAML comments and unknown keys
  - empty, unclosed, and broken frontmatter
  - non-standard list shapes
  - two files with the same name
  - Hebrew and other non-ASCII names and prose
  - a dot-folder
- **Fixture integrity:** `fixtures/sample-novel.test.ts` checks that the fixture still has the line endings, BOMs, and file names it is supposed to have. It catches git rewriting fixture files on checkout.
- **End-to-end:** optional later, with Playwright's Electron support. A few smoke tests are enough.
