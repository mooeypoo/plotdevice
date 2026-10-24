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
- [x] I2: Structured diagnostics and story dates; reactive presentation formatting.
  - [x] I2a: Semantic date readings/issues over IPC; English/Hebrew inspector,
    timeline and axis formatting; cached readings retranslate without file writes.
  - [x] I2b: General semantic errors/warnings and reactive presentation; stable
    warning identity and preserved recovery details.
    - [x] I2b.1: Semantic project/manuscript warnings, localized file problems/
      panel, stable rows/focus and explicit fix payloads across language switches.
    - [x] I2b.2: Action failures and cached errors, including recovery/navigation
      details.
      - [x] I2b.2a: Semantic save/recovery failures, reactive cached editor notices,
        localized recovery controls and safe replacement confirmation.
      - [x] I2b.2b: Remaining create/rename/move/property/workspace/reference/
        inspector failures and cached consumers.
        - [x] I2b.2b.1: Property/relationship refusals, cached read/write and
          background synopsis errors, localized relationship safety explanation.
        - [x] I2b.2b.2: Remaining action/query failures, partial-success summaries
          and cached consumers.
          - [x] Rename/move/renumber failures, reactive partial-success summaries
            and explicitly reported rename-plan refusals.
          - [x] Creation/template/type/status/fix diagnostics, reactive action
            errors and visibly reported status-add failures.
          - [x] Workspace open/initialize/refresh diagnostics, reactive cached
            notices and visible current-project failures with stale-reply guards.
          - [x] Live manuscript/codex listing errors and visible sidebar alerts;
            reactive reference/outline read failures, with source paths retained.
          - [x] Inspector vocabulary/date-query failures, independent reactive
            notices and stale document/calendar response guards.
          - [x] Timeline/interactions and appearance query errors, reactive
            alerts, retained last successful views and obsolete-response guards.
          - [x] Shared link notices and reference edit failures, reactive
            semantic snapshots, fixed expiry and obsolete-panel-action guards.
          - [x] Document-tab load/save/invalid/pruning and writing-preference
            load/save/invalid notices; reactive cached keys preserve session state.
          - [x] Inspector integer-order validation, all unordered reasons and
            shared binder/inspector duplicate-order diagnostics.
          - [x] Recent-project persistence/list/removal failures, preserved corrupt
            settings and independent non-blocking warnings after project open.
          - [x] Explicit folder inspection/dialog/launch failures, fail-closed
            nesting checks and live notices preserving the current workspace.
          - [x] Final production producer/fallback/cache inventory; internal and
            logging-only exceptions recorded in ADR 0016. I2 complete for existing
            displayed diagnostics; untranslated interface text continues under I3.
- [x] I3: Complete interface/native translation and Hebrew/qqq coverage.
  - [x] I3a: Welcome/initialization controls and nesting explanations, recent-list
    accessibility/labels and dates following the selected interface language.
  - [x] I3b: Project top-bar accessibility/tooltips, complete save/status/focus
    labels/counts, and writing appearance with UI-locale numeric presentation.
  - [x] I3c: Document-tab actions/states, sidebar tab/navigation names, and
    generated semantic entry-position and template-title presentation.
  - [x] I3d: Binder-tree actions, accessible labels, creation guidance and
    UI-locale word-count formatting without translating authored status values.
  - [x] I3e: Codex sections, character search/filter controls, untyped-file and
    template copy, entry actions and shared reference-button accessibility.
  - [x] I3f: Overview filters, generated section labels/counts, and inline synopsis
    editing copy/accessibility; authored metadata and synopsis text stay unchanged.
  - [x] I3g: Chapter/part Properties inspector labels, link-picker and rename
    prompts; dynamic project values remain authored and unmodified.
  - [x] I3h: Timeline controls, empty states, counts, cell accessibility and
    locale-aware chapter/day-count numbers; no story data or layout changes.
  - [x] I3i: Interactions controls, notices, cell/detail accessibility and
    UI-locale counts; preserve authored names, selection and project data.
  - [x] I3j: Codex profile fields, appearances, relationships and accessibility;
    preserve authored values, drafts and relationship behavior.
  - [x] I3k: Outline/Template inspector explanations and accessible labels;
    preserve manuscript/template tokens, editor state and project files.
  - [x] I3l: Outline/Reference reading-panel chrome, empty/loading/editor
    actions and accessibility; keep authored titles and Markdown unchanged.
  - [x] I3m: Localized unresolved-draft close confirmation; preserve the
    explicit draft-loss and unchanged-files warning and close behavior.
  - [x] I3n: Localized native folder-picker title; preserve OS-owned controls,
    folder-selection behavior and cancellation.
  - [x] I3o: Collate generated Codex groups, Overview filter choices, link
    suggestions and relationship options by UI locale; preserve values/order.
  - [x] I3p: Translate Project Overview guidance, counts, read-only/empty
    states and right-panel controls/accessibility; preserve project data.
  - [x] Completion audit: verify no untranslated app-owned renderer copy,
    native dialog labels or startup messages remain; preserve OS-owned and
    technical text.
- [ ] I4: RTL interface implementation and browser qualification.
  - [x] I4a: Use logical indentation/alignment in the binder and mirror part
    disclosure direction; preserve selection, order and drag/drop behavior.
  - [x] I4b: Place the binder and right panel by root direction; make pointer
    and keyboard resizing follow RTL inline edges without changing stored widths.
  - [x] I4c: Flow reading-grid columns and sticky headings from inline-start;
    position story-axis ticks/bars logically so dates progress RTL unchanged.
  - [x] I4d: Flow interaction-matrix columns RTL and stick row/corner headings
    to inline-start; preserve names, counts and selected-cell identity.
  - [x] I4e: Mirror directional top-bar icons/crumbs, align Codex rows
    logically, and audit existing responsive wrapping.
  - [ ] Remaining I4: real-browser geometry, responsive overflow, pointer and
    scroll qualification (I6).
- [x] I5: Independent writing/reading direction and mixed-script editor support.
  - [x] I5a: Persist Auto/LTR/RTL prose direction independently of UI language;
    apply live in CodeMirror without losing draft, selection, or undo history.
  - [x] I5b: Localize live CodeMirror copy; isolate mixed-script link,
    completion, and inline-code direction without changing markdown.
  - [x] I5c: Set per-block automatic direction for authored Outline/Reference
    Markdown and isolate inline/fenced technical code LTR.
  - [ ] Remaining I5: qualify caret and shaping in a real browser (I6).
- [ ] I6: Translation workflow and packaged Linux/Windows qualification.
  - [x] I6a: Check locale catalog key parity, placeholder/plural parameter
    consistency, and parameter notes in qqq.
  - [x] I6b: Add a Banana-style contributor translation guide and glossary,
    including Hebrew RTL and project-content preservation rules.
  - [x] I6c: Browser-check mixed-script editing/reading, completion, RTL layout,
    timeline/matrix flow, resizing and narrow-window overflow.
  - [x] I6d: Build Linux AppImage/deb and smoke-launch the unpacked app with a
    copied fixture; verify the project files remain unchanged.
  - [ ] Remaining I6: review caret/shaping in Chromium and build/run the Windows
    installer on Windows; keep the Hebrew progress notice until qualification.
- [ ] D1: Public Hebrew manual/distribution text (separate approval).
- [ ] I7: Workbench and plotting RTL qualification, folded into ADR 0016's
  checklist and delivered with the W, L and P phases below.

## Workbench, plotting mode and book language (approved 2026-10-22)

Planned in [the workbench plan](plans/workbench-ui-plan.md) from the
[brief](plans/workbench-ui.md). Draft decisions: ADR 0017 (layout model),
ADR 0018 (readers and navigation), ADR 0019 (book language and vocabulary),
ADR 0020 (outline grammar). Every phase follows ADR 0016: banana-i18n messages
with `en`/`he`/`qqq`, logical start/end in the model and CSS, direction-aware
interaction, and the matching I7 items. Each phase ends with
`npm run lint && npm run typecheck && npm run test && npx electron-vite build`.

Order: W1 → W2 → W3 → W4, then W5 and the P track in either order. W6 after W5.
L1 any time before P2. P1 needs only W2's dependency rules.

### W1: Layout model
- [x] Pure model in `workbench/model/`: center stage, `start`/`end` docks, `bottom` shelf, card-stack sections, stacked or tabbed sections, follow/pin bindings, Writing/Plotting modes.
- [x] Operations (dock, move, collapse, resize, split, pin), validation, presets as data (Write, Revise, Plot), and the minimum page width rule. A split's lock is a project binding, defined in the storage shape; W5c sets it.
- [x] Versioned zod storage: per-user layout shapes in `plotdevice.workbench`, per-project bindings keyed by project root. One-time derivation from `plotdevice.layout` and `outlineWidth`, leaving old keys readable.
- [x] Unit tests for every operation, validation, migration, and LTR/RTL mirroring. The `workbench-model-is-pure` dependency rule and an ESLint browser-globals guard land here rather than in W2.

**Done when:** the model and storage are tested in Node, nothing renders them yet, and existing behavior is unchanged.

### W2: Seams
- [x] View registry in `workbench/views/` with descriptors (id, title message key, icon, component); placement and bindings come from the W1 catalog. Components are imported statically for now; W3 can make them lazy if startup warrants.
- [x] Replace every direct `layout.mainView` write (editor store and six composables) with workbench navigation commands (`showCenterView`, `choosePanel`, `revealPanel`). The editor store presents documents through `document-presenter.ts` and tells readers about moves through `move-followers.ts`; it imports neither the layout nor the Reference store. Center-view switches now go through the navigation queue (ADR 0018).
- [x] Extract a reusable read-only document reader from `reference-store.ts` (request generation, moves, scroll) plus `useLiveDraft`. Reference becomes one instance.
- [x] Move `WarningsPanel` out of `ProjectOverview` into its own view. Move `link-at` and `wiki-link-scan` to `shared/` so shared code stops importing features; move the other cross-feature helpers to `shared/` or `app/`. Binder, Codex, Properties and Warnings become self-contained views; the old shell renders every panel through the registry, with the center switch in `app/CenterStage.vue`.
- [x] Add the renderer dependency-cruiser rules from the plan, with fixtures in `tools/dependency-rules/`. `shared-ignores-features` covers `features/` and `workbench/` only: `shared/` still uses `app/ui-language-store` and `app/entry-place`.

**Done when:** the app looks and behaves exactly as before, and the new boundary rules pass and are proven by the rules test.

### W3: Shell on existing features
- [x] `workbench/shell/` renders the model: regions, splitters, collapse, tab sets and stacks, the bottom shelf, and a layout switcher (Write, Revise), using flex rows that follow the root direction and logical properties. Revise's read-only split waits for W5c.
- [x] Generalize `use-outline-width.ts` into direction-aware splitters (pointer and keyboard), keeping stored sizes direction-free. Narrow windows shrink, then hide, the end dock and then the start dock.
- [x] The Write preset reproduces today's app: document tabs, Writing target, Properties, Outline, Reference, outline width, focus mode. Properties now shares the end dock's resizable width. Both shells read one arrangement: `layout-store.ts` is a facade over `workbench-store.ts` and no longer writes `plotdevice.layout`.
- [x] Keep the old shell behind a per-user View → Classic Layout command (contract version 24). ProjectLayout's tests run in both shells.

**Done when:** a writer upgrading sees the same arrangement in the new shell, can switch back, and every existing test passes in both shells.

### W4: Views and layouts
- [x] Binder, Codex list, Properties, Reference, Outline, Overview, Timeline, Interactions, and Warnings register as views. The shell imports no feature component directly (done in W2, enforced by `views-only-through-the-registry`).
- [x] `MainView` becomes center-stage views and persists with the layout. Menu commands and accelerators keep working; a view already placed in a panel is brought forward there instead of duplicated.
- [x] Bottom shelf with Outline and Warnings (and Overview, Timeline or Interactions if the writer moves them there).
- [x] Save, rename, delete and reset layouts from the layout menu, which also shows closed views again. A ⋯ menu per view and per panel moves views between sides (named by physical side), reorders, collapses, closes, adds views and switches tabs/stacked, all by keyboard. Pinning moved to W5a; dragging tabs between panels is in Later.
- [x] The Outline view shows the live draft (ADR 0018) and highlights the active manuscript document, falling back to Writing.

**Done when:** every existing feature can be placed in its accepted regions, layouts survive restart and mirror in Hebrew, and mode and layout switches go through the navigation queue (tested).

### W5: Reference comes to the page
- [x] W5a: Peek on project links (hover in rendered panels, Ctrl/Cmd+hover in the editor, Alt+Enter on a focused link or the caret's link; Ctrl/Cmd+Shift+Enter stays Return to writing), entry cards with live drafts, the card stack (collapse, reorder by drag or menu, per-user fields by entry kind), and pin/unpin from peeks, cards and Reference. Pinning Reference makes a card, as the brief describes, rather than freezing the panel.
- [x] W5b: Cast strip above the page (from `pov`, `characters`, `location`, and the live draft's body links; chips peek, pin, or drag to Cards) and the chapter card (synopsis, status, POV, threads, linked outline lines from the current outline's live draft). Both follow Writing; Write and Revise show the strip, Revise adds the chapter card.
- [x] W5c: Open beside (from cards, peeks, Reference and the tab bar) as a read-only split at inline-end of the page, up to two; lock keeps a split's document; Write here swaps the split's document into the editor through the navigation queue and pins it as Writing. Splits resize by pointer and keyboard, shrink to keep the page readable, and follow app moves.
- [x] W5d: Command palette (View → Command Palette…, Ctrl/Cmd+K; contract version 25): entries by title or alias (Enter opens as the side panels do, Shift+Enter beside), views, layouts and menu commands, matched ignoring case, accents and niqqud. Modes join the palette with plotting (P2). Optional "Fade panels while typing" in Writing appearance, off by default.

**Done when:** each sub-phase works by keyboard alone, peeks and cards show live drafts without saving, and Write here never drops a draft or bypasses recovery (tested).

### W6: Retire the old shell
- [x] Remove `SidePanel`, `RightPanel`, the Classic switch (native menu and palette; contract version 30), and `layout-store.ts`, whose parts moved to the workbench store (focus mode, center view, document presenter) and to navigation in view ids.
- [x] Remove `plotdevice.layout` and `plotdevice.lastEntry` after a confirmed migration: derived settings are saved, then the old record is removed (or kept if the save fails); the old global outline carries to the first project opened; a project's last entry seeds its tabs once. A source scan keeps the keys inside the migration modules. Update `docs/architecture.md` and the renderer README.

**Done when:** no code reads the old keys, and an upgrade from a pre-W1 profile keeps the writer's arrangement (tested).

### L1: Book language and file vocabulary
- [x] L1a: Optional top-level `language` in `novel.md`, read by workspace. Initialization asks for it (defaulting to the interface language). An explicit "Book language" action in the project overview edits only that key (contract version 26).
- [x] L1a: Seed catalog in `src/main/book-language/` (`en`, `he`, `qqq`, with parity checks): `novel.md` statuses and comments, default template headings, default titles. The composition root resolves the words once per open project and hands them to workspace, manuscript and codex through `words()` getters, so a language change applies without reopening.
- [x] L1a: Book-language direction is the base direction for Auto writing direction (lines without letters follow it; books without `language` keep `auto`).
- [x] L1b: Vocabulary registry (`outline_inbox`), `settings.vocabulary` overrides, resolution order, retired aliases, the stray-literal test, and three dependency rules (`book-language-is-pure`, `contexts-receive-resolved-words`, `book-content-ignores-interface-language`).
- [x] Apply the `file-format.md` changes for `language` and vocabulary. Accept ADR 0019.

**Done when:** a new Hebrew project writes Hebrew seeds and `language: he`, an existing project without `language` is byte-identical after opening, and interface-language switches still write nothing.

### P1: Outline context and grammar
- [x] New `outline` bounded context. Move outline listing, creation, and text open/save out of codex, keeping the contract compatible (the codex IPC handler forwards to it; `api.outline` moves to P2).
- [x] Pure line-based parser with source ranges: preamble, columns, beats, notes, chapter links, thread tags, plain content, fenced code.
- [x] Pure structural planners (move beat, move column, add beat, retitle beat, edit notes, capture), not yet wired to IPC. P3 adds the raw-body write they need (the editor path normalizes line endings).
- [x] Fixture outlines in `fixtures/sample-novel/`, including hostile ones, with byte-identical round trips outside edited lines. Fixture-integrity test updated.
- [x] Apply the "Outlines" changes to `file-format.md`. Accept ADR 0020.

**Done when:** every planner is proven byte-exact on every fixture outline, and codex no longer owns outlines.

### P2: Plotting mode and read-only board
- [x] `api.outline` (`list`, `create`, `openEntry`, `saveEntryText`, `readBoard`, `capture`; contract version 27), with the codex outline methods kept as deprecated aliases for one version; a renderer outline store takes the `outline` entry owner.
- [x] Writing/Plotting mode switch through the navigation queue; the Plot preset. The mode is a project binding; opening any document but the outline returns to Writing.
- [x] Beat board as a projection (columns follow inline direction; beats in document order) with chapter status, POV, word count, and thread color (always with the thread's name).
- [x] Toggle between board and the outline's text in the writable editor, never both editable (the Board and Text tabs).
- [x] Capture a beat behind an experimental setting, off by default, with the Inbox as the last column; an option ends the beat with a link to the Writing chapter (Q10).

**Done when:** the board matches the outline for every fixture, mirrors in Hebrew, and capture changes only the appended lines.

### P3: Move on the board
- [x] Drag and keyboard moves of beats and columns, through version-checked IPC commands (contract version 28). The editor adopts the result (ADR 0018). Every drag has a keyboard path (Alt+arrows) and a menu path (the card's and column's ⋯ menu); the Inbox stays last. Capture and moves share `app/outline-writes.ts`.

**Done when:** only moved lines change, a stale board refuses to write, and an unresolved outline draft blocks moves.

### P4: Edit on the board
- [x] Add and retitle beats, edit notes (contract version 29): in place on the card, from the ⋯ menu, F2, and "+ Add card" at a column's foot; Enter keeps the add field open for the next card.
- [x] Edit chapter synopsis and status from a beat card through the existing property commands (`updateChapterProperties`, shared with the Overview).

**Done when:** each edit changes only its lines or keys, and every edit has a keyboard path.

### U1: Simplicity — UX research, audit and redesign
Guiding principle (writer, 2026-10-22): the interface should be beautifully simple, with advanced
features easy to reach but never cluttering the page. Prioritize features *with* simplicity. This is
the final tightening step for the W/L/P work, planned and approved on its own before any change.

- [x] U1a Research and audit ([audit](plans/u1/audit.md), from the new preview harness): inventory every control, menu, tab, button and shortcut across the
  top bar, panels, ⋯ menus, document tabs, native menus and the palette; map each to the tasks it
  serves; find duplicates, dead ends and unclear names. Walk real writing, revising and plotting
  sessions in English and Hebrew.
- [x] U1b Vocabulary ([glossary](plans/u1/glossary.md), approved 2026-10-23; "Properties" becomes "Details"): one name per concept everywhere, in a glossary (en/he) the catalogs follow.
  Known clashes: "Binder" (button, menu) vs "Manuscript" (tab) for the same panel; "Inspector"
  (button) vs "Properties" (tab); "view", "panel" and "layout" are not explained anywhere.
- [x] U1c Information architecture ([redesign plan](plans/u1/redesign.md), decisions D1–D6 approved 2026-10-23): what is always visible, what is one step away (palette, a
  single menu), what is advanced. Decide the fate of each duplicate control; prefer progressive
  disclosure over more buttons.
- [x] U1d Visual system (ADR 0021, accepted): type scale, spacing, color tokens (dark and the planned light theme),
  shapes (pills, chips, cards), icon set with visible labels where needed, and focus/hover states;
  checked for contrast and RTL.
- [x] U1e (the redesign plan and clickable mock-ups in `docs/plans/u1/mockups.html`) A written redesign plan with before/after mock-ups, an ADR for the visual system and
  naming, and phased implementation steps that keep every keyboard path and RTL guarantee.

**Done when:** the redesign plan and glossary are approved; implementation follows as its own
phases. Approved 2026-10-23. The phases below run in this order: U3a, U2a, U3b, U2b.

### U3a: Vocabulary
- [x] Catalog renames per the [glossary](guide/translation.md#glossary), in en, he and qqq: Manuscript (not
  Binder), Details (not Properties or Inspector), Plot and Write modes, Standard / Side by side /
  Board layouts, beats on the board, Go to… for the palette.
- [x] The glossary moves into the translator guide, and a catalog test fails on any retired name. The user guide uses the new names. No layout changes.

**Done when:** no screen shows a name the glossary lists under "Not", in either language.

### U2: Beautification
Runs as U2a (tokens and shared controls, after U3a) and U2b (beauty and the light theme, after U3b);
see the [redesign plan](plans/u1/redesign.md#implementation-phases).
Requested by the writer (2026-10-22): after U1's redesign plan is approved, make the whole app
impressively beautiful *and* simple, built on U1's visual system. Every element is styled; nothing
is left as a bare native control.

- [x] U2a Tokens and shared controls: the ADR 0021 scales in `global.css`; one styled
  `SelectField` (an ARIA select-only combobox with typeahead, drawn over panels and mirrored in
  RTL), `CheckboxField`, `SwitchField` and `RangeField` (native inputs, styled); button variants
  and field styles; menus with separators, shortcuts and typeahead. All 14 selects, 4 checkboxes
  and 2 ranges replaced, and a test fails on any native one outside `shared/`.
- [x] Every control follows the system: **all selects** (one styled select, trigger and menu, that
  works by keyboard, in RTL and with screen readers), text fields and areas, buttons (primary,
  quiet, icon), checkboxes and toggles, menus, tabs and pills, cards, scrollbars, focus rings, and
  hover and active states.
- [x] Empty states, notices and loading states designed rather than plain text (U2b-3: shared `.empty`, `.loading` and `.notice` / `.warn` / `.error` in `global.css`; components only place them).
- [x] Typography and rhythm across the editor, panels, board, timeline and welcome screens; subtle
  motion that respects reduced-motion. (U2b-2: every size comes from the type, space and radius
  scales, and `tools/styles/scale.test.ts` keeps it so. U2b-3: menus, lists, popovers, the
  palette, peeks and dialogs rise into place; panels ease on Expand; all motion uses the tokens
  and stops under reduced motion.)
- [x] Dark theme first, then the light theme with the same care; contrast checked in both (U2b-1: **Theme ▸** in the ⋯ menu, stored beside the interface language and applied through Electron's `nativeTheme`; a contrast test checks every text colour on every ground in both).
- [x] A screenshot review of every screen in English and Hebrew, dark and light (U2b-4: [review](plans/u2/review.md), 22 scenarios × 4 in `docs/plans/u2/screens/`).

**Done when:** every screen passes the review in both languages and themes, and a test finds no
native `<select>` or checkbox outside the shared styled components.

### U3b: Information architecture
Shipped in four stacked PRs (U3b-1 to U3b-4).
- [x] The top bar (D1, D2): mode switch, a visible Go to…, side toggles and one ⋯ menu (interface language, Appearance, Layout, Close project). Write is the page; Overview, Timeline and Interactions moved to Plot; the Text tab is gone.
- [x] Document tabs only with two or more documents, their actions in one ⋯, and Back to your chapter only while away from it; "In this chapter" as a line under the heading; a status bar of words, ⚠ Needs attention and Saved; no empty Needs attention shelf.
- [x] Panel headers with one ⋯ (and double-click to expand) and a More ▾ tab after three; Manuscript rows with a hover ⋯; compact Details (placement and story time folded, characters and place behind one quiet add) and "Edit details" on rows, cards, peeks and the Chapter card (D6). Menus now draw over the page, so scrolling panels never clip them.
- [x] The status bar, Go to…'s empty state (Recent, Suggested, everything else), the board's fit (soft edges, opens at its first column) and header (outline name, Edit as text, ? for keys), and "+ Add column" with the offer to create the part (D5, contract version 31).

**Done when:** every keyboard path still works and is tested, and the harness screens match the
mock-ups in both languages.

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
- Chrome cleanup (writer feedback on W5) is now phase U1 above.
- A Plot Board rethink (writer, 2026-10-23), once the U phases are solid. Include whether beats get "Edit details" for the chapters they link.
- The user guide now uses the U1 names and places (U3a, U3b), but still has no page of its own for the workbench: layouts, splits, cards and peeks. Write one with U2b's screenshots.
- Workbench follow-ups (out of the proposed W/L/P plan): dragging tabs and sections between panels (W4 provides menu and keyboard moves); a Search view with full-text search (the palette only jumps to entries); the thread grid (threads × chapters, reusing the timeline's reading-order grid); pop-out windows; a visual `novel.md` settings editor for language, vocabulary, statuses and folders (ADR 0004 and 0007); scene-level cards once scenes exist.
- Renderer coupling: 44 feature files import `app/` stores directly. W2 cuts feature-to-feature imports only; narrowing features' access to app stores is separate work.
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
  - `findProjectBelow` remains bounded at 10,000 visited folders; an incomplete
    search now explicitly refuses inspection/initialization (ADR 0016), rather
    than treating unchecked nesting as safe.
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
