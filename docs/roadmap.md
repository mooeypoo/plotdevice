# Roadmap

One phase per agent session. Each phase ends with lint, typecheck, and tests green, and a commit.

## Phase 0: Scaffold and guardrails
- [x] Scaffold with electron-vite (Vue + TypeScript template) without overwriting existing files. Reshape `src/` to match `docs/architecture.md`, and drop the `@electron-toolkit/*` packages.
- [x] Set the app identity from `AGENTS.md` ("App identity") in `package.json` and `electron-builder` config, including the Windows `executableName` and the license (GPL-3.0-or-later).
- [x] Turn on TypeScript strict mode with `noUncheckedIndexedAccess`. Set up ESLint (typescript-eslint strict, vue), Prettier, Vitest, and `vue-tsc`.
- [x] Add dependency-cruiser rules for the layer and context boundaries, plus a test in `tools/dependency-rules/` that proves each rule catches a violation and allows legitimate imports.
- [x] Add `shared-kernel` with `Result`, `DomainError`, `ProjectPath`, `FileName` (Windows-safe, title → file name), `WikiLink`, and tests.
- [x] Create `fixtures/sample-novel/` following `docs/file-format.md`, including the edge cases listed in the architecture doc, plus the fixture-integrity test. Keep git and Prettier from rewriting fixture files.
- [x] Add a GitHub Actions workflow that runs checks on Linux and Windows on push, and builds Linux and Windows installers on tags and on manual runs.

**Done when:** `npm run dev` opens an empty window, all checks pass, and CI builds both installers.

## Phase 1: Workspace
- [x] Open a folder with the native dialog. Recognize `novel.md`, or offer to initialize a new project.
- [x] Read `novel.md`, including `settings`, with defaults for missing keys.
- [x] Keep a recent-projects list in `userData`.
- [x] Project scan: find `.md` files (skipping dot-folders) and classify them by `type`.
- [x] Use cases: `OpenProject`, `InitializeProject`, `ListRecentProjects`.
- [x] Add the typed IPC contract and preload bridge for these use cases.

**Done when:** you can open the fixture, reopen it from the recents list, and initialize an empty folder.

## Phase 2: Binder and editor
- [x] Single-instance lock (`app.requestSingleInstanceLock()`), so two windows can never autosave the same file. Phase 1 testing showed two instances can run side by side.
- [x] Manuscript domain: `Manuscript`, `Part`, `Chapter`, order from `part` and `order` in frontmatter, the unordered tray, `WordCount`.
- [x] `MarkdownChapterRepository` with byte-exact round-tripping (test it), including BOM and line-ending preservation.
- [x] Binder tree in the left sidebar (parts → chapters, plus the unordered tray), a CodeMirror 6 markdown editor in the center, and chapter, part, and total word counts.
- [x] Hebrew and other right-to-left text display and edit correctly in the editor (per-line text direction).
- [x] Autosave of the body only.
- [x] Dark writing-room design (see the UI direction canvas), bundled fonts, focus mode, links styled by type, and an early "changed outside" check so no save overwrites an edit made in another program.

**Done when:** you can write in a chapter, see the change in Obsidian, and frontmatter is untouched.

## Phase 3a: Inspector and new entries
- [x] "New chapter" and "New part" in the binder, including in an empty project's binder, so a fresh project can start writing at once. A small title box comes first; the file is named from that title.
- [x] The inspector shows `part` and `order` as written. A duplicate-order warning names the other chapter and offers "Renumber this part" (rewrites `order` to 1, 2, 3…).
- [x] Right-hand panel that edits `title`, `status`, `pov`, `characters`, `location`, `threads`, `story_date`, `story_time`, and `synopsis`, with statuses from `novel.md` and "not in your list" statuses (one click adds them to the list).
- [x] Surgical frontmatter edits (ADR 0004): only the edited key's characters change; everything else stays byte-identical.
- [x] A visible "+ New chapter" row in every part (the "+" on a part's title was too hard to find).
- [x] Order is editable in the inspector, and "Remove from manuscript" removes `order` so the chapter moves to the unordered tray (the file stays).

**Done when:** you can create a part and a chapter in an empty project, edit any property, fix a duplicate order in one click, and Obsidian shows the change with every other byte of the file unchanged.

## Phase 3b: Restructuring, renames, and links
- [x] Drag and drop in the binder: reorder chapters, move them between parts, drag from the unordered tray into a part (or onto it, to take a chapter out of the order), reorder parts. Keyboard alternatives in the inspector: Move up/down and a Part select.
- [x] Reordering rewrites only `order`, and only where it changes. Moving updates `part` and `order`, and moves the file only from its old part's folder.
- [x] Title → file name sync per `settings.file_names`. Renames update wikilinks in every form (ask first when other files would change).

**Done when:** you can restructure the fixture, Obsidian shows the same frontmatter, and links stay intact.

## Phase 4: Live sync
- [x] File watcher with own-write suppression. Changes that only convert line endings are not treated as edits.
- [x] "Changed outside the app" banner for the open chapter.
- [x] Warnings panel: unparseable files, invalid encoding, unusable values, ambiguous links, duplicate orders, names that break links.

**Done when:** editing in Obsidian with the app open behaves sensibly, and a test covers the conflict path.

## Phase 5a: Codex entries
- [x] Characters, locations, and notes in a Codex tab beside the manuscript: list, open in the editor, profile in the inspector (name, other names, role, born), new entries from a template.
- [x] Untyped files list, with an action to set a type.
- [x] "Appears in" list on each character and location.
- [x] Renaming a codex entry's file to match its title, as for chapters.

## Phase 5b: Links and relationships
- [x] Relationships editor (one-way; the other character shows them read-only). When a file can't be edited safely, say so on the entry.
- [x] Link autocomplete that shows each candidate's type and writes the path form for names that aren't unique. Aliases match. Links styled by target type.
- [x] Ctrl/Cmd+click on a link opens its target.
- [x] Read markdown links (`[text](file.md)`) when resolving references.
- [x] Fix-it actions in the warnings panel: write an ambiguous link with its folder, quote an unquoted link.
- [x] Templates for new characters, locations, and notes that the writer can change (`templates/` by default; the built-in default when a file is missing).

## Phase 6: Outline and Overview
- [x] Overview (the derived view): parts and chapters with status, POV, threads, and synopses. Edit synopses inline, filter by status, POV, or thread. Opened from Write | Overview in the top bar.
- [x] **Writer's outline (MVP requirement).** An outline the writer writes and reads alongside the draft: how they see chapters and sequences going, independent of what is written so far and of story dates (unlike the timeline, which is derived). Readable as a reference panel while writing. Storage and format (plain markdown in the project, linking to chapters) to be designed before this phase.

## Phase 7: Timeline
- [x] Grid with threads (or characters) as rows and chapters as columns. Chapters with a list of dates span their range.
- [x] Toggle between manuscript order and story-date order.
- [x] Filters, an undated tray, and a "missing for N chapters" highlight for threads and characters.

## Phase 8: Interactions
- [x] Co-appearance matrix (characters × characters, counts, click a cell to list the chapters), from `characters` and `pov`.
- [ ] Optional relationship graph later.

## Phase 9: Packaging polish
- [x] App icon (a pen nib whose line runs on as the plot; a simpler drawing at 16–32 px) and a matching wordmark in the UI. `npm run icons` renders every size.
- [x] Ubuntu 24.04+ sandbox: the `.deb` installs electron-builder's AppArmor profile (checked in the package); the AppImage can't, so the README recommends the `.deb` and `docs/development.md` gives the AppImage's one-time profile.
- [x] Opening a project from outside the app: `plotdevice <folder>` (into the running window if there is one), and "Open With → Plot Device" on folders on Linux.
- [ ] Test an install on a Windows machine or VM: follow `docs/testing-windows.md`.

## Phase 10: App menu and window
- [x] Replace the default menu: Edit (undo, redo, cut, copy, paste, select all), View (panels, focus mode, the four views), Help → About Plot Device (version, GPL-3.0-or-later, project link). Reload and developer tools only in development builds.
- [x] Remember the window's size, position, and maximized state between sessions, in the settings folder (`userData`), never in the novel folder.

## Phase 11: Writing comfort
- [x] Adjustable prose size (14–28 px) and line width (45–90 ch), with live preview and Reset in the status bar's Writing appearance popover. Defaults remain 19 px and 66 ch. Per-user settings apply across projects and in focus mode, without changing markdown or resetting editor history.
- [x] Remember collapsed binder parts per project, including parts outside the sequence. Reordering preserves collapse state; creating a chapter expands its part. Preferences stay in `userData` browser storage, never in the novel folder.

## Phase 12: Explicit, safe recovery
- [x] Preserve the open draft's last safely captured frontmatter (including inspector changes, unknown keys, comments, BOM, and line endings) when saving a separate recovered copy. Keep the original path, other files, and links untouched; recover templates as ordinary notes.
- [x] Respect intentional outside edits and deletions: clean changes load with a notice; conflicts pause autosave and offer Use disk version, Save recovered copy, or explicitly confirmed Replace disk text with a fresh version check. A deletion offers recovery or closing the draft without recreating the source.
- [x] Keep a pending decision explicit when the file reappears or changes again. Failed reads/writes retain the draft, and failed reopening of a published copy can retry without duplicate copies.
- [x] Serialize recovery actions, freeze editing without resetting history while they run, and guard entry/project/window navigation. Snapshots are session-local; this is not persistent crash recovery.

## Phase 13: Outline reading comfort
- [x] Render Markdown in the outline reference, retaining project-link navigation and linked-passage highlights. Edit opens raw Markdown in the existing main editor; HTML, remote images, and web navigation remain inert in the reference.
- [x] Clear previous content during outline loads, show errors explicitly, and reject obsolete responses even when switching A → B → A. Show the selected path alongside the frontmatter-derived title.
- [x] Expand/Restore and pointer/keyboard resizing for the outline panel. Remember the preferred width in user settings, constrain it for smaller windows, and leave Properties unchanged.

## Phase 14: Character groups
- [x] Optional overlapping `groups` membership in character frontmatter, discovered from files without a central registry. Normalize name identity, preserve tags and other metadata, and show malformed group fields read-only.
- [x] Inspector group chips with existing-name suggestions and inline creation/removal, through validated, version-checked codex writes.
- [x] All/Grouped character lists, collapsible headings and Ungrouped, name/alias search, and union-of-groups filters with unique file counts. Remember list mode, collapse state and filters per project in user preferences.

## Phase 15: Independent references
- [x] Character rows show the existing role/alias subtitle beneath the name, without adding a summary field.
- [x] Independent rendered Reference panel for characters, locations, notes, parts and chapters; explicit editor actions retain one writable editor and its Properties inspector.
- [x] Reuse inert outline rendering and reading width; retain per-reference scroll during the project session, refresh external changes, reject stale loads and follow app moves/renames.
- [x] Route codex lookups and reference links without replacing the manuscript; preserve outline selection and existing conflict/recovery protections.

## Phase 16: Writing anchor and document tabs
- [x] Keep an automatic manuscript Writing target based on actual writing, with an explicit pin to lock it and a Write here action to change it.
- [x] Temporary, kept and pinned document tabs; deduplicate open documents and offer quick Return to writing and keyboard cycling.
- [x] Preserve per-document CodeMirror history, selection and scroll while retaining one active writable surface and all save/recovery navigation guards.
- [x] Route every document-opening surface consistently; follow renames/moves and restore valid per-project tab metadata from user settings, never novel files or an implied unsaved-draft backup.

## Runtime localization and Hebrew/RTL (ADR 0016)

One installation with a live English/Hebrew selector; no language-specific builds.
See [ADR 0016](adr/0016-runtime-localization-and-hebrew-rtl.md) for decisions,
acceptance criteria, and the cross-session checklist.

- [x] I1: Banana catalogs/runtime, persisted locale, selectors, root direction,
  typed main/renderer synchronization and native menu refresh. Verified with
  full checks and an isolated browser preview; remaining limitations and next
  session instructions are recorded in ADR 0016.
- [ ] I2: Structured diagnostics and story dates; reactive presentation formatting.
  - [x] I2a: Semantic date readings/issues over IPC; English/Hebrew inspector,
    timeline and axis formatting; cached readings retranslate without file writes.
  - [ ] I2b: General semantic errors/warnings and reactive presentation; stable
    warning identity and preserved recovery details.
    - [x] I2b.1: Semantic project/manuscript warnings, localized file problems/
      panel, stable rows/focus and explicit fix payloads across language switches.
    - [ ] I2b.2: Action failures and cached errors, including recovery/navigation
      details. Next approval boundary.
- [ ] I3: Complete interface/native translation and Hebrew/qqq coverage.
- [ ] I4: RTL layout, binder, timeline, matrix and interaction qualification.
- [ ] I5: Independent writing/reading direction and mixed-script editor support.
- [ ] I6: Translation workflow and packaged Linux/Windows qualification.
- [ ] D1: Public Hebrew manual/distribution text (separate approval).

## Proposed release and documentation program

The [release plan](release-plan.md) tracks approved work: MVP version policy,
draft/immutable releases, a documentation site, and a published-version feed.
Local release preparation (R1) is implemented: beta metadata, changelog, read-only
guided helpers, and a [release checklist](releasing.md). Remaining phases need
their own approval; app release publication is not authorized.
R2 now assembles unpublished drafts for validated annotated version tags after both
platform checks and Linux x64 packaging. Local tests cover assembly/retries; the first tagged Actions
rehearsal and real installer qualification remain pending.
R3 adds a local VitePress manual, search, production link/publication checks, and a
manually gated Pages workflow. R4 provides the published-release JSON below;
the in-app update checker remains separate work.
R4 now derives download information and version JSON from verified published stable
releases. Offline previews emit no feed. Hosted Linux/Windows checks and manual
Pages deployment passed; the repository and site are public. Automatic Pages
refresh is approved and enabled. The first beta is Linux-only; Windows installers
are withheld pending real Windows qualification (ADR 0011). The app checker remains R5.
The deb now includes AppStream developer/license/help/screenshot metadata and the
documentation homepage. Local App Center presentation still needs a visual recheck;
native deb permissions and publisher authentication are not changed by metadata.

## Decide after MVP
- Edge cases in part and chapter structure beyond what `docs/file-format.md` defines (nested parts, chapters belonging to several parts).
- Relationship direction, and what happens when both characters declare the same relationship.

## Later
- Documentation tooling: the offline manual build passes but emits Node module-type and Vite native-config compatibility warnings. Address module configuration separately from reference UI work.
- Character-group follow-ups: persistent empty groups, custom ordering/colors/descriptions, bulk assignment, and group filters in Timeline/Interactions are not part of Phase 14.
- Phase 9 follow-ups:
  - Sign the Windows installer, so SmartScreen doesn't warn (needs a code-signing certificate).
  - A Windows Explorer "Open with Plot Device" entry for folders.
  - A Flatpak, if the AppImage's sandbox step proves a nuisance.
- Phase 8 follow-ups:
  - A relationship graph (from `relationships` and co-appearances).
  - Bidi isolation audit: the Interactions view, timeline tooltips, and the rename prompt isolate names (`<bdi>`, or FSI/PDI via `shared/isolate.ts`). Check the remaining messages that embed names or titles, such as warnings built in the main process, status messages, and the outline panel's hints.
- Phase 7 follow-ups:
  - Changing a chapter's date by dragging it on the time axis; dates are edited in the inspector today.
  - Ordering chapters on the same day by `story_time`; it's shown in the tooltip only.
  - Remember the timeline's options (order, rows, gap length, zoom) per project.
  - Filters by status or POV on the timeline, as in the Overview.
- Phase 6 follow-ups:
  - Plan meets draft (deferred until the outline has been used for a while): mark outline lines whose chapters exist (with their status), chapters the outline never mentions, and offer "create this chapter" for links to chapters that don't exist yet.
  - Editing the outline in the side panel; today it's read-only there, with "Edit" opening it in the main editor.
- Phase 5b follow-ups:
  - Fix-its cover parts and chapters; ambiguous links in notes and codex entries are not checked yet.
  - Relationships can't be reordered in the app, and removing an entry's first field (`with`) is refused (ADR 0007).
  - Markdown links are read for Appears in and Ctrl/Cmd+click, not for chapter placement (`part:`) or renames.
- Phase 5a follow-ups:
  - The writable editor and Properties inspector still share one open entry; Phase 15 separates read-only references and Phase 16 adds document tabs without competing writers.
  - Codex entries have no word counts in their list, and notes have no aliases field (their other keys are shown read-only).
- Phase 4 follow-ups:
  - Changes to `novel.md` settings (`file_names`, folders) take effect when the project is reopened; statuses and threads update live.
  - Each change batch re-reads the whole project (scan, manuscript, warnings). Fine at novel scale; cache per file if it ever isn't.
  - The warnings panel only lists problems. Fix-it actions (rewrite an ambiguous link in path form, quote a link) come with the codex in Phase 5.
- Phase 3b follow-ups:
  - Renaming a part renames its file only, not the part's folder. Renaming the folder too would move every chapter in it; decide with the writer first.
  - There's no "Rename file to match title" action outside the title-change prompt yet, and no undo for moves or renames.
  - Component tests exist for the binder only (`BinderTree.test.ts`, with `@vue/test-utils` and `happy-dom`). Add them for the inspector and editor as those change.
  - Dragging a part out of the sequence isn't offered; the part's Order field can be cleared instead.
- Phase 3a follow-ups:
  - Editing nested values (`relationships`) needs its own careful editor (Phase 5); the frontmatter editor refuses them today.
  - The inspector edits parts' `title` and `synopsis` only; part-level status could come later.
- Phase 2 follow-ups:
  - A light theme. Only the dark theme exists.
  - The panel framework (reference panel, timeline drawer) arrives with Phases 5 and 7, as drawn in the UI direction canvas.
  - Typewriter scrolling.
  - Embeds show their target as `Marrow#Mill`; render headings as `Marrow › Mill`.
  - Clicking a link in the editor to open its target (Phase 5, with the codex).
- Phase 1 follow-ups:
  - `write-file-atomic` 8 ships no types; `@types/write-file-atomic` 4.0.3 describes the same `writeFile(path, data, options)` API. Recheck when either updates.
  - `findProjectBelow` stops after 10,000 folders, so choosing a huge folder can't hang the app. Past that, nesting isn't checked.
  - The project screen is a placeholder (counts and problem files) until Phase 2's binder replaces it.
- Phase 0 follow-ups:
  - Running `npm run dev` from a process that inherits `ELECTRON_RUN_AS_NODE=1` (for example, a VS Code extension host) starts Electron as plain Node, and `app` is undefined. Unset it.
  - `npm audit` reports moderate issues in electron-builder's own build tooling (`sprintf-js` via `global-agent`). Not shipped in the app; recheck when electron-builder updates.
  - npm 12 blocks `electron-winstaller`'s install script. It is only used for Squirrel installers, which aren't built here.
- Scene files (`type: scene`, belonging to a chapter), when chapter-level metadata isn't enough.
- "Body mentions" for interactions (characters mentioned in prose but not listed). Suggestions only, never counted; Hebrew prefixes (ו, ה, ב, ל, מ, ש) make name matching unreliable.
- Rewriting markdown links (`[text](file.md)`) on rename.
- Converting non-UTF-8 files to UTF-8.
- Windows: retries when antivirus or sync tools briefly lock a file during an atomic write. Ignore the atomic writer's temporary files in the watcher.
- Compile/export to DOCX, EPUB, or PDF via pandoc.
- Writing goals and session stats.
- Focus or typewriter mode.
- Snapshots of a chapter before major revisions, stored as plain files under `snapshots/`.
