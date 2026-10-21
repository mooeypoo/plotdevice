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
    app-menu.ts               # native Edit/View/Help menu, development-only reload and tools
    window-state.ts           # pure settings validation and display-overlap check
    remember-window.ts        # saves geometry after the renderer permits closing, before exit
    composition-root.ts       # the only place that wires concrete adapters into use cases
    ipc/                      # one file per context; maps API calls to use cases, validates payloads with zod
    queries/                  # cross-context read models (outline, timeline grid, interactions, appears-in)
    recovery/                 # project-scoped recovery port; version-bound raw snapshots stay in main
    shared-kernel/
    contexts/
      workspace/  manuscript/  codex/  chronology/
    infrastructure/           # cross-context technical adapters
      markdown/               # frontmatter document (yaml Document API), wikilink parser, body/frontmatter split
      fs/                     # atomic writer, path guard, line-ending and BOM preservation
      project-scan/           # finds .md files (skipping dot-folders) and classifies them by `type`
      links/                  # moves or renames a file and updates the links to it everywhere (ADR 0005)
      watching/               # chokidar wrapper, own-write suppression
      window/                 # atomic window-state.json settings adapter (userData only)
      recovery/               # bounded in-memory snapshots and exclusive recovered-copy publication
  preload/
    index.ts                  # exposes `window.plotDevice`, implementing the contract via ipcRenderer.invoke
  contract/
    api.ts                    # the PlotDeviceApi interface: the whole renderer↔main surface
    dtos.ts                   # plain serializable shapes; no classes, no methods
    channels.ts               # IPC channel names, including main → renderer events (`project:changed`)
  renderer/
    src/
      app/                    # shell, router, layout
      features/
        welcome/  binder/  editor/  inspector/  outline/  reference/  timeline/  codex/  interactions/
      shared/                 # generic UI components and composables
      assets/fonts/           # bundled OFL fonts (Literata, Frank Ruhl Libre, IBM Plex Sans + Hebrew); the CSP blocks remote fonts
```

`contract/` is the standalone typed boundary between main and renderer. The renderer imports DTOs, never domain classes.
`src/i18n/` additionally shares presentation-only catalogs, locale metadata and the Banana formatter;
domain/application code must not import it (ADR 0016).

`node:path` is used only in infrastructure, which converts between OS paths and `ProjectPath`.

## Key mechanisms

**App menu and window.** `app-menu.ts` owns the panel/focus accelerators and sends typed `app:menu-command` events through the preload API (currently contract version 23). The renderer's `use-menu-commands.ts` maps them to existing layout actions while a project is open; Escape and Save remain renderer shortcuts. About shows the app version, GPL-3.0-or-later license, and project link. Reload and developer tools are absent from packaged menus; development tools use F12 to avoid the inspector shortcut. Normal window bounds and maximized state live in `userData/window-state.json`, written atomically after the renderer's close guard permits closing and awaited before exit. Startup validates them with zod and checks overlap against current displays; invalid or wholly off-screen settings fall back to 1200×800. Settings failures are logged explicitly.

**Interface language.** Main restores validated `userData/ui-preferences.json` before creating the
window. Without an explicit choice, the first supported system language wins, otherwise English.
Trusted `ui-language` IPC serializes switches and persists before broadcasting; failures retain
the previous language and are logged and shown. Renderer bootstrap restores language before
mounting Vue and sets explicit root `lang`/`dir`. The instance-local Banana formatter and reactive
locale store update the limited translated shell and rebuilt native menus without replacing
the project/editor. English/Hebrew/qqq catalogs are bundled offline. Structured story-date
readings/issues cross IPC without presentation text; the renderer localizes cached inspector
checks, timeline dates and axis labels without changing numeric spans or file contents.
Project/manuscript warnings also carry semantic parameters; the renderer localizes cached warnings/
file problems and keys rows/groups independently of displayed language, preserving focus and fixes.
Save/recovery and property/relationship failures carry optional semantic diagnostics alongside stable
control-flow codes and legacy descriptions; cached errors/notices reformat on a language switch.
Property results and relationship safety explanations retain the full API failure, including exact
source keys/paths; failed current-entry property reads are explicitly shown in the action-error surface.
Rename/move/renumber failures and partial-success notices also retain semantic state; skipped-link
paths are isolated only when displayed. Failed current-entry rename planning is explicitly reported.
Creation/template/type/status/fix consumers retain full failures too; the inspector status section
shows cached errors as reactive escaped text and clears them on an explicit successful status retry.
Workspace open/initialize/refresh diagnostics retain exact OS paths and creation details.
The project layout displays workspace navigation and refresh failures; refresh uses a separate
semantic cache and rejects stale replies by request generation and project identity.
Listing/reference/outline read errors also retain semantic state. Sidebar alerts expose
listing failures without discarding the last successful listing; per-store request generations
reject results from before close or a newer load. Reference selection/scroll never depends on locale.
Inspector vocabulary-query failures use a separate cache from status actions, displayed in both
inspectors. A shared date-check composable distinguishes API failures from invalid readings and
rejects obsolete input/document/calendar replies; locale switches never rerun date checks.
Timeline/interactions failures retain the last successful view and use reactive alerts with
request/disposal guards. Appearance failures have a current-document notice instead of a
misleading empty chapter list; property-read generations reject stale results.
Shared link notices cache exact semantic targets/addresses with a five-second
action-based expiry and scope cleanup. Reference editor-opening failures capture
the editor's source, not its formatted message; panel request generations reject
obsolete errors and inspector changes without cancelling editor navigation.
Document-tab and writing-preference storage notices retain typed catalog keys;
their computed text updates without storage access or repeated failure logging.
Existing clearing policies, session fallback behavior and settings formats remain unchanged.
Local order-validation state and cached manuscript placement data also reformat
reactively. Shared binder/inspector helpers translate unordered/clash notices and
isolate exact sibling titles without changing their order or manuscript data.
Recent-project persistence/list/removal uses typed results and semantic errors.
Successful project open/initialize results carry an optional recording failure,
displayed independently from list/removal/open errors. Invalid settings remain
untouched; failed reads prevent recents rewrites. List generations reject
superseded/pre-removal results; language switches only reformat the cached errors.
Folder existence/nesting checks also return typed results: I/O failures and
incomplete bounded searches never imply safe initialization. Dialog selection,
startup delivery and later-launch events carry explicit results; cancellation/no
launch remain successful null. Failed inspections grant no new root access and
leave the current workspace/drafts unchanged. Separate folder notices reformat
live on every workspace screen; request generations suppress obsolete results.
Welcome initialization/nesting sentences and recent-list accessibility labels use
whole translated messages with isolated exact names/paths. Recent-project
timestamps use a computed UI-locale date formatter with the existing local
timezone; changing language preserves row/input identity and never rereads recents.
Unmigrated failures explicitly display their original message until their producers are migrated.
Remaining action failures/strings, full RTL geometry and independent content-direction controls
remain tracked in ADR 0016. No language switch changes novel files or existing writing preferences.

**Frontmatter editing.** `infrastructure/markdown/frontmatter-editor.ts` changes one key at a time by replacing only that value's characters in the source (ADR 0004); it never re-serializes YAML. Every edit is re-parsed and checked to have changed exactly that key, or nothing is written. Tests run edits over every fixture file and check that every other byte is unchanged.

**Saving prose.** The editor sends body text with a debounce of about 800 ms and on blur. The main process replaces only the body part of the file and keeps the frontmatter bytes exactly as they were. CodeMirror works with `\n` internally, so the writer converts the text back to the file's line endings.

**Document tabs.** `app/document-tabs-store.ts` holds temporary, kept and pinned paths and the protected manuscript Writing target (ADR 0015). Actual manuscript edits move an unpinned Writing target; pinning locks it, and Write here explicitly chooses and pins another. All editor openings and tab closing/cycling pass through the single editor store's serialized navigation and save/recovery guards. Properties changes are refused while navigation runs. Writing is displayed first and keyboard cycling follows that order; Return to writing also leaves project views. Reference remains independently readable.

Session-only immutable CodeMirror states preserve undo, selection and scroll by stable tab identity, including app moves. Remounts reconfigure callbacks; changed disk text starts fresh history. Versioned project-scoped tab metadata lives in `userData` browser storage with validated restoration after listings load. It contains no document text or editor state and is not draft recovery. Invalid/unavailable storage is reported; missing inactive paths are pruned without discarding an active missing draft. Project changes remount the layout and clear the previous session's caches.

**External changes.** `infrastructure/watching/project-watcher.ts` watches the open project's `.md` files with chokidar (skipping dot-folders) and reports batches of about 150 ms. Every write and move the app makes goes through `fs/write-text-file-atomically.ts` or `fs/move-file.ts`, which first record the new bytes' hash in `own-writes.ts`. The watcher drops events whose file still has a recorded hash, so the app never reacts to itself. Other changes reach the renderer as `project:changed`. `use-live-sync.ts` then re-reads the project summary (`refreshProject`), the manuscript and its warnings, and the open entry (ADR 0006). The open entry is compared by text, not version: if its body text still matches what the editor last saved, only the version is updated, so line-ending conversions and frontmatter edits in Obsidian never conflict. New text loads with a notice unless the writer has unsaved typing. A conflict or vanished file pauses autosave and requires an explicit recovery decision; subsequent changes or reappearance never silently resolve it (ADR 0008).

**Explicit recovery.** Successful markdown reads/writes record exact bytes in the project's bounded in-memory recovery service; `recovery.capture` pins a known path/version and returns an opaque session token (contract version 13). The renderer never reconstructs frontmatter. Conflicts offer Use disk version (read only), Save recovered copy (captured metadata plus draft text), or confirmed Replace disk text (fresh version precondition, current disk frontmatter). Missing files offer a separate copy or closing the draft without recreating the source; reappearing files also offer Use disk version. Copies keep BOM, comments, unknown keys, ordering, and line endings; templates become ordinary notes outside the template folder. Publication uses an atomically written temporary sibling and exclusive hard link, never overwriting a racing destination or recreating missing parent folders. Errors keep the draft open; a successfully published copy is reused on retry unless the draft changes. Recovery decisions serialize actions, temporarily make CodeMirror read-only without resetting its history, and block navigation/project/window close while running. These are session-local snapshots, not crash recovery or a persistent backup history.

**Reordering and moving.** Order lives in frontmatter. `MoveChapter` and `MovePart` place the entry with `placeAt` and write only what `orderChanges` returns (domain `order-plan.ts`), so they're unit-tested without the disk. `MoveChapter` also writes `part` when it changes, and moves the file only if it sat in the folder that holds the old part's own file. Dropping a chapter on the unordered tray removes its `order`. The binder's drag and drop and the inspector's Move up/down and Part select both end in these two commands.

**Renames.** After a title change, the renderer asks `PlanRename`, which returns the new path (`uniqueFileName`, same folder) and how many links would change, or nothing when the name matches or `settings.file_names` is `never`. With `ask` the inspector shows the question; with `always` it renames at once. `RenameEntry` and file moves go through the `EntryRelocator` port, implemented by `infrastructure/links/relocate-entry.ts` (ADR 0005): it plans every link edit first, moves the file (never over another file; a case-only rename goes through a temporary name), then writes each linking file atomically if it hasn't changed since the plan.

**Renderer state.** `app/editor-store.ts` owns the one writable entry, whatever its kind: its text, version, autosave, conflicts, the missing-file state, and the rename prompt. `manuscript-store.ts` (binder, part and chapter properties, moves) and `codex-store.ts` (codex list, codex properties, Appears in) register as the owners of their entry kinds in `app/entry-owners.ts`, which the editor store asks instead of importing them. Both inspectors write properties through the editor store's version, after saving the text first, so the two writes to one file never conflict. `app/reference-store.ts` independently reads a selected document without opening, saving, or changing properties in that editor. Listing reloads refresh references; app moves/renames follow their known paths. Project close invalidates pending reads and clears reference selection/reading positions.

**Character organization.** Character-only `groups` holds overlapping text memberships (ADR 0013). Codex domain readers normalize names and expose editability; malformed values remain visible read-only, and group writes refuse non-character or unusable metadata before changing anything. Existing atomic, version-checked key writes preserve other metadata and body bytes. Optional group fields pass through the existing typed codex properties/listing IPC. `features/codex/character-list.ts` derives names, deduplicated filtered files, and overlapping sections; `use-character-list.ts` owns navigation logic. `CharacterList.vue` and shared `CodexEntryList.vue` present it; the inspector reuses `TextListInput.vue` with native datalist suggestions. The writing-preferences store remembers mode, filters, and collapsed group identities per project root, with backward-compatible defaults. Counts are unique files; search expands matching groups temporarily. Membership changes reload the listing through existing codex saves and live sync.

**Writing preferences.** `app/writing-preferences-store.ts` keeps validated prose size/line width and per-project collapsed part paths in `localStorage` (`plotdevice.writingPreferences`), which Electron stores under `userData`. The status bar's native Writing appearance popover adjusts CSS variables on the project layout; the editor requests a new measurement without replacing its text, selection, or undo history. The reference outline retains its own compact typography. `features/binder/use-binder-collapse.ts` gives both numbered and unnumbered parts controlled expansion state, surviving panel remounts and app restarts. Parts are keyed by project root and path: a renamed part starts expanded. Invalid or unavailable storage is reported in the popover and console; session preferences remain usable. Escape shortcuts leave the browser's native popover dismissal behavior intact.

**Timeline.** `queries/get-timeline.ts` combines the manuscript's chapters in reading order (with threads and the files their `pov`/`characters` point to), chronology's reading of each `story_date` as a span of days, and the codex's character names. The renderer (`features/timeline/`) draws it two ways from pure, tested functions: a reading-order grid (one column per chapter, gaps of N chapters highlighted, "↶ earlier" when a chapter certainly happens before the one before it) and a story-order view on a real time scale (bars from first to last day, dashed when only the month or year is known, stacked into lanes where they overlap). It is read-only; clicking a chapter opens it.

**Interactions.** `queries/get-interactions.ts` lists, for each character in the book, the chapters (in reading order) whose `pov` or `characters` name them, with the POV ones. The renderer builds the symmetric co-appearance matrix from that (`features/interactions/interaction-matrix.ts`); a picked cell lists the shared chapters.

**Mixed-direction text.** Names and titles can be Hebrew next to Latin text. In templates they go in their own `<bdi>` (or an element with `dir="auto"`); in strings that can't hold markup (tooltips, `aria-label`s) they're wrapped by `shared/isolate.ts` (FSI…PDI), so a right-to-left name never reorders the words or numbers around it.

**Side panels.** The left panel has Manuscript and Codex tabs; the right panel has Properties (always the main editor's inspector), Outline, and Reference (ADR 0014). `shared/RenderedMarkdown.vue` and `shared/markdown-view.ts` render both reading panels using `markdown-it`, with HTML disabled, images reduced to descriptions, and only project links made interactive (ADR 0012). Outline linked passages are highlighted; "Edit" opens raw Markdown in the main editor, and the outline panel steps aside while it's there. Reference instead shows a labelled live preview of the same editor draft, never a second writer. Codex entries open in Reference by default, with separate editor actions. Binder parts/chapters have explicit reference buttons; editor and outline links route codex targets to Reference, retaining main-editor navigation for manuscript targets. Reference links stay within Reference.

Both reference loads clear old content, expose loading/errors, and use request identities to reject stale results, including A → B → A switching. Titles come from frontmatter and the selected path is shown separately. Reference scroll positions are retained per file during the project session. `app/use-outline-width.ts` handles shared pointer/keyboard resizing and Expand/Restore for Outline and Reference, constraining width to leave 280 px for the main area after the sidebar. Preferred width (240–720 px, default 320) is validated and stored with writing preferences in `userData`; smaller windows constrain the display without overwriting that preference. Existing version-1 preferences acquire the default width without losing other settings. Properties retains its 320 px width.

**Shared file access.** `infrastructure/markdown/entry-files.ts` reads and writes one project's files (body-only saves, key edits, new files, version checks). The manuscript and codex repositories both delegate to it.

**The open project.** `ipc/project-session.ts` holds the one open project and the per-project use cases the composition root builds for it (repositories bound to that folder, and the project's folder settings). The inspector's choices come from `queries/get-inspector-vocabulary.ts`, which combines the manuscript's statuses with chronology's threads and calendar. Opening another project replaces it; closing clears it.

**Saving safely.** Each opened entry carries a version (a hash of the file). A save re-reads the file first: if it changed since it was opened, the save is refused (`changed-on-disk`) and the editor offers explicit recovery choices. Even confirmed replacement uses a fresh version precondition, never unconditional overwrite; malformed frontmatter refuses writes. These are optimistic checks, not a cross-process filesystem lock. Unchanged text is never written, so opening and reading an entry never touches the file. When the window closes, `ipc/close-guard.ts` waits for the renderer to save; unresolved drafts require confirmation before losing them, and closing is cancelled while recovery or document navigation is running.

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
- **Renderer:** stores and composables against the fake API (`app/fake-plot-device-api.ts`). Components are mounted with `@vue/test-utils` in `happy-dom`; such a test file starts with `// @vitest-environment happy-dom`, and every other test runs in plain Node.
- **End-to-end:** optional later, with Playwright's Electron support. A few smoke tests are enough.
