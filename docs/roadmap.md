# Roadmap

One phase per agent session. Each phase ends with lint, typecheck, and tests green, and a commit.

## Phase 0: Scaffold and guardrails
- [x] Scaffold with electron-vite (Vue + TypeScript template) without overwriting existing files. Reshape `src/` to match `docs/architecture.md`, and drop the `@electron-toolkit/*` packages.
- [x] Set the app identity from `AGENTS.md` ("App identity") in `package.json` and `electron-builder` config, including the Windows `executableName` and the license (GPL-3.0-or-later).
- [x] Turn on TypeScript strict mode with `noUncheckedIndexedAccess`. Set up ESLint (typescript-eslint strict, vue), Prettier, Vitest, and `vue-tsc`.
- [x] Add dependency-cruiser rules for the layer and context boundaries, plus a test in `tools/dependency-rules/` that proves each rule catches a violation and allows legitimate imports.
- [x] Add `shared-kernel` with `Result`, `DomainError`, `ProjectPath`, `FileName` (Windows-safe, title → file name), `WikiLink`, and tests.
- [x] Create `fixtures/sample-novel/` following `docs/file-format.md`, including the edge cases listed in the architecture doc, plus the fixture-integrity test. Keep git and Prettier from rewriting fixture files.
- [ ] Add a GitHub Actions workflow that runs checks on Linux and Windows on push, and builds Linux and Windows installers on tags and on manual runs. *(Workflow written; Linux packages build locally. The first CI run, including the Windows build, is pending the GitHub remote.)*

**Done when:** `npm run dev` opens an empty window, all checks pass, and CI builds both installers.

## Phase 1: Workspace
- [ ] Open a folder with the native dialog. Recognize `novel.md`, or offer to initialize a new project.
- [ ] Read `novel.md`, including `settings`, with defaults for missing keys.
- [ ] Keep a recent-projects list in `userData`.
- [ ] Project scan: find `.md` files (skipping dot-folders) and classify them by `type`.
- [ ] Use cases: `OpenProject`, `InitializeProject`, `ListRecentProjects`.
- [ ] Add the typed IPC contract and preload bridge for these use cases.

**Done when:** you can open the fixture, reopen it from the recents list, and initialize an empty folder.

## Phase 2: Binder and editor
- [ ] Manuscript domain: `Manuscript`, `Part`, `Chapter`, order from `part` and `order` in frontmatter, the unordered tray, `WordCount`.
- [ ] `MarkdownChapterRepository` with byte-exact round-tripping (test it), including BOM and line-ending preservation.
- [ ] Binder tree in the left sidebar (parts → chapters, plus the unordered tray), a CodeMirror 6 markdown editor in the center, and chapter, part, and total word counts.
- [ ] Hebrew and other right-to-left text display and edit correctly in the editor (per-line text direction).
- [ ] Autosave of the body only.

**Done when:** you can write in a chapter, see the change in Obsidian, and frontmatter is untouched.

## Phase 3: Inspector and structure editing
- [ ] Right-hand panel that edits `title`, `status`, `pov`, `characters`, `location`, `threads`, `story_date`, and `synopsis`, with statuses from `novel.md` and "not in your list" statuses.
- [ ] Create, reorder, and move parts and chapters, with drag and drop in the binder. Reordering rewrites only `order`. Moving updates `part` and `order`, and moves the file only from its default folder.
- [ ] Title → file name sync per `settings.file_names`. Renames update wikilinks in every form.
- [ ] Drag from the unordered tray into a part.

**Done when:** you can restructure the fixture, Obsidian shows the same frontmatter, and links stay intact.

## Phase 4: Live sync
- [ ] File watcher with own-write suppression. Changes that only convert line endings are not treated as edits.
- [ ] "Changed outside the app" banner for the open chapter.
- [ ] Warnings panel: unparseable files, invalid encoding, unusable values, ambiguous links, duplicate orders, names that break links.

**Done when:** editing in Obsidian with the app open behaves sensibly, and a test covers the conflict path.

## Phase 5: Codex
- [ ] Characters, locations, and notes: list, profile view and editing, a new-entry template, and a relationships editor.
- [ ] Untyped files list, with an action to set a type.
- [ ] Link autocomplete that shows each candidate's type and writes the path form for names that aren't unique. Links styled by target type.
- [ ] Read markdown links (`[text](file.md)`) when resolving references.
- [ ] "Appears in" list on each character.

## Phase 6: Outline view
- [ ] Derived outline: parts and chapters with status chips and synopses. Edit synopses inline, filter by status, POV, or thread.

## Phase 7: Timeline
- [ ] Grid with threads (or characters) as rows and chapters as columns. Chapters with a list of dates span their range.
- [ ] Toggle between manuscript order and story-date order.
- [ ] Filters, an undated tray, and a "missing for N chapters" highlight for threads and characters.

## Phase 8: Interactions
- [ ] Co-appearance matrix (characters × characters, counts, click a cell to list the chapters), from `characters` and `pov`.
- [ ] Optional relationship graph later.

## Phase 9: Packaging polish
- [ ] App icon and a stylized "Plot Device" wordmark in the UI.
- [ ] Project-file association (optional).
- [ ] Test an install on a Windows machine or VM.

## Decide after MVP
- Edge cases in part and chapter structure beyond what `docs/file-format.md` defines (nested parts, chapters belonging to several parts).
- Relationship direction, and what happens when both characters declare the same relationship.

## Later
- Phase 0 follow-ups:
  - The deb installs to `/opt/Plot Device/` (electron-builder derives it from `productName`). It works, but it's the one place the `plotdevice` token isn't used. Decide before the first public release.
  - Running `npm run dev` from a process that inherits `ELECTRON_RUN_AS_NODE=1` (for example, a VS Code extension host) starts Electron as plain Node, and `app` is undefined. Unset it.
  - `npm audit` reports moderate issues in electron-builder's own build tooling (`sprintf-js` via `global-agent`). Not shipped in the app; recheck when electron-builder updates.
  - npm 12 blocks `electron-winstaller`'s install script. It is only used for Squirrel installers, which aren't built here.
  - The production menu still has the default developer tools entry; replace the menu in Phase 9.
- Scene files (`type: scene`, belonging to a chapter), when chapter-level metadata isn't enough.
- "Body mentions" for interactions (characters mentioned in prose but not listed). Suggestions only, never counted; Hebrew prefixes (ו, ה, ב, ל, מ, ש) make name matching unreliable.
- Rewriting markdown links (`[text](file.md)`) on rename.
- Converting non-UTF-8 files to UTF-8.
- Windows: retries when antivirus or sync tools briefly lock a file during an atomic write. Ignore the atomic writer's temporary files in the watcher.
- Compile/export to DOCX, EPUB, or PDF via pandoc.
- Writing goals and session stats.
- Focus or typewriter mode.
- Snapshots of a chapter before major revisions, stored as plain files under `snapshots/`.
