# Workbench UI and Plotting Mode: Planning Brief

Status: proposal for planning, not yet approved for implementation
Owner: Moriel
Date: 2026-10-22

This brief describes a new frontend for Plot Device: a configurable **workbench** around the page, a **plotting mode** with a visual board over the writer's outline, and a **book language** with a small **file vocabulary**. It states what we want and the constraints. It does not fix the implementation. The coding agent's first job is to turn it into a phased plan, ADR drafts, and a list of questions (see "What the planning session must produce").

## Precedence

`docs/file-format.md`, the non-negotiables in `AGENTS.md`, and the accepted ADRs outrank this brief. Where this brief conflicts with any of them, do not quietly pick one. Name the conflict, propose the change (usually a new ADR that supersedes or amends), and ask. Known conflicts are listed under "Known conflicts to resolve".

## 1. Problem

The writing surface works. The arrangement around it does not.

- The shell is fixed: binder on one side, Properties/Outline/Reference on the other, one center. A writer can't keep the binder, two characters, and the outline visible together.
- Story knowledge has to be fetched. The best writing tools bring it to the page instead: a hover card on a link, a character pinned beside the chapter, the chapter's beats beside the prose.
- Planning has no visual surface. The outline is free Markdown, read beside the draft, but there is no board to rearrange the story's structure.

The value of Plot Device is that the files are the product: plain Markdown that is safe to edit in Obsidian, git, or any editor. Nothing here may weaken that.

## 2. Goals and non-goals

**Goals**

1. A workbench where every non-prose view is a panel the writer can place, collapse, resize, and restore, with saved layouts.
2. Reference that comes to the page: peek, pin, sticky cards, and a strip of who and where the chapter names.
3. A Writing/Plotting mode switch. In plotting mode a board over the outline takes the center stage.
4. Everything translated, including words the app writes into the book, without coupling interface language to file content.
5. Full parity in Hebrew/RTL, built on the ADR 0016 foundations rather than retrofitted.

**Non-goals for this plan**

- Free-form, IDE-style docking of anything anywhere. Regions are constrained (see 4.1).
- More than one writable editor at a time (see 4.3).
- Pop-out windows, scenes, goals and session stats, AI features, sync, collaboration.
- Localized frontmatter keys (a Hebrew key for `pov`). Deferred; see 4.5.

## 3. What already exists and must be built on

Read these before planning. The new UI is a re-composition of these pieces, not a replacement of their guarantees.

| Area | Where | Guarantee to keep |
| --- | --- | --- |
| One writer, document tabs, Writing target, preview tab | ADR 0015, `document-tabs-store.ts`, `editor-store.ts`, `DocumentTabs.vue` | One writable editor and autosaver; navigation queue flushes before switching; Writing target protection; cached CodeMirror state by tab identity |
| Independent Reference | ADR 0014, `reference-store.ts`, `features/reference/` | Read-only; never flushes or adopts editor recovery; shows the live draft when the file is open in the editor |
| Inert Markdown rendering | ADR 0012, `shared/RenderedMarkdown.vue`, `markdown-view.ts` | No raw HTML, no image loads, project links routed in-app |
| Explicit recovery | ADR 0008 | Recovery decisions block navigation and close |
| Localization and RTL | ADR 0016, `src/i18n/`, `ui-language-store.ts` | banana-i18n catalogs (`en`, `he`, `qqq`); translate at presentation boundaries; interface language never writes project files; independent writing direction; logical CSS; direction-aware panel resizing (I4b) |
| Layout and preferences | `layout-store.ts`, `writing-preferences-store.ts`, `use-outline-width.ts` | Per-user state in `userData` only, versioned and validated, invalid storage reported without blocking writing |
| Live sync | ADR 0006, `use-live-sync.ts` | Outside edits compare text; conflicts never resolve silently |
| Character groups | ADR 0013 | Groups discovered from frontmatter, no central registry |

ADR 0016 lists remaining real-browser qualification (I4/I5, "I6"). New work must not regress it and should add to its checklist where it adds new geometry.

## 4. Requirements

### 4.1 The workbench

**Regions.** Four slots plus a card stack, each optional:

- **Center stage:** the writable editor (with its document tabs) plus at most two read-only splits beside it. In plotting mode it holds the board instead (4.4).
- **Start dock** and **end dock:** vertical columns. Each holds sections, either stacked (collapsible, resizable) or as a tab set.
- **Card stack:** a dock section of sticky cards (4.2). It lives in either dock.
- **Bottom shelf:** a short horizontal strip for wide, shallow views (outline, warnings, compact timeline).

Regions are named `start`/`end`, never `left`/`right`, in the model and in storage. A saved layout mirrors when the interface language changes, with no migration.

**Views.** Every panel is a registered view: a stable id, a catalog message key for its title, an icon, the regions that accept it, the bindings it supports, and a lazily loaded component. The shell renders views only through this registry, never by importing a feature component directly.

| View | Bindings | Default region |
| --- | --- | --- |
| Binder | global | start |
| Codex list | global | start (tab with Binder) |
| Properties | follows the writable editor | end |
| Reference (existing) | its own selection, or pinned | end |
| Writer's outline (reference rendering) | global, highlights the Writing chapter | end or bottom |
| Entry card | pinned to one entry | card stack |
| Cast in this chapter | follows Writing | above the page |
| Scene card | follows Writing | card stack |
| Timeline, Interactions, Overview | global | center (full) or bottom (compact) |
| Warnings | global | bottom |
| Search | global | start |
| Plot board | the chosen outline | center, plotting mode only |

**Bindings.** A view either *follows* (re-targets to whatever relates to the Writing target or the active tab) or is *pinned* (one entry, fixed). The panel header shows which, with a one-click toggle.

**Layouts.** A layout is the serialized region tree with each view's binding and size. Ship presets: **Write**, **Revise** (Writing plus a read-only split of another chapter, scene card, warnings), **Focus** (page only; chrome fades while typing), and **Plot** (4.4). The writer can save, rename, and delete their own layouts. Storage follows ADR 0015's pattern: versioned, validated, in `userData`, never in the project folder. Whether layouts are per user, per project, or a per-project override of a user default is an open question.

**Constraints.**

- The page never shrinks below a readable width. Panels collapse first.
- Every drag has a menu and keyboard equivalent ("Move to end dock", "Collapse", "Pin").
- The command palette (4.2) can open every view, switch layouts, and run every app menu command.

### 4.2 Reference that comes to the page

| Interaction | Behavior |
| --- | --- |
| Peek | Hovering (or Ctrl/Cmd+hovering, to be decided) a project link in the editor or a rendered panel shows a card. It uses the same rendering and live-draft rules as Reference (ADR 0014). |
| Pin | A pin on a peek or a Reference panel turns it into a sticky card in the card stack. |
| Entry card | A compact, read-only rendering of one entry: title, chosen frontmatter fields, and the first section. Cards collapse to one line, reorder by drag, and carry pin/unpin, open in Reference, and open in the editor. Field choice per entry kind is a per-user setting with sensible defaults. |
| Cast strip | Chips for every character and location the Writing chapter names in `pov`, `characters`, `location`, or body links. Click to peek, drag or click-pin to the card stack. This is "Appears in", inverted. |
| Scene card | For the Writing chapter: synopsis, status, POV, threads, and the outline lines that link to it. |
| Open beside | Alt+click (to be decided) opens a chapter in a read-only split beside the writable editor, instead of navigating. |
| Lock | A split's lock keeps its document when the writer navigates. |
| Command palette | Ctrl/Cmd+K: jump to any entry, open any view, switch layout or mode, run menu commands. |
| Focus | Chrome fades while typing and returns on pointer movement (extends the existing focus mode and `focus-dimming`). |

### 4.3 Editing rule: one writer

ADR 0015 holds. There is one writable editor and one autosaver. Splits, cards, peeks, Reference, and the board's text view of chapters are read-only renderings that show the live draft when the same file is open for editing.

"Open beside" is therefore a read-only split, with a **Write here** action that makes it the writable document through the existing navigation queue. If the plan concludes that two writable editors are needed, propose a superseding ADR with the full recovery and autosave design. Do not assume it.

### 4.4 Plotting mode

Writing and plotting are two modes over the same files.

| | Writing mode | Plotting mode |
| --- | --- | --- |
| Center stage | Writable editor, optional read-only splits | Plot board, or the outline's Markdown in the writable editor (toggle) |
| Writer's outline | Read-only reference that highlights the Writing chapter's beats | Editable: on the board, or as text, never both at once |
| Chapter prose | Editable | Read-only peek |
| Chapter properties | Editable in Properties | Editable from a beat card (synopsis, status, threads) through the existing property commands |
| Layout | Write, Revise, Focus | Plot, saved separately |

Switching modes goes through the navigation queue: it flushes and checks drafts exactly as switching documents does.

**Outline grammar.** The board reads a small, predictable subset of the outline body and leaves every other byte alone:

- a `##` heading starts a column (act, part, or sequence)
- a top-level bullet is a beat card; nested bullets are its notes
- a `[[chapter]]` or Markdown link to a chapter in a beat shows that chapter's status, POV, and word count on the card
- an optional thread marker on a beat (a tag, or an inline `thread::` field, which Obsidian's Dataview also reads) colors the card; the exact syntax is open
- anything else is a plain card or plain text, preserved byte for byte

The board is a **projection** of the outline file. It holds no state the file can't express.

**Board edits are structural commands in the main process:** move beat, move column, add beat, retitle beat, edit notes. They live in a pure domain with source ranges, change only the affected lines, and are proven byte-identical on untouched content across the fixtures (the same discipline as ADR 0004). The renderer never rewrites the outline file.

**Two boards.** The **beat board** (columns from headings) comes first. The **thread grid** (threads × chapters) is derived from chapter frontmatter, not the outline. It is a later, separate view that can reuse the timeline's reading-order grid.

**Capture a beat (experimental, behind a setting, off by default).** The only outline write allowed in writing mode. A command opens a one-line box; Enter appends a bullet to the Inbox section at the end of the chosen outline, creating the section if missing. It never edits or moves existing beats. The board shows Inbox as its last column. Whether a capture records the chapter it came from is an open question.

### 4.5 Book language and file vocabulary

Everything is translated. What differs is who reads the word:

| Kind of word | Examples | Language | Stored in |
| --- | --- | --- | --- |
| Interface | Menus, panel titles, field labels ("Point of view") | Interface language (ADR 0016) | App catalogs |
| Words the app writes into the book | Seeded statuses, default template headings, the Inbox heading, default titles | **Book language** | The Markdown files |
| Schema the app reads | Frontmatter keys, `type` values, `settings` keys | Canonical in files; always translated on screen | The Markdown files |

**Book language.** A new optional `settings.language` in `novel.md`. Initializing a project writes it from the current interface language, and that is the only vocabulary-related key the app writes on its own. A project without it is treated as English, so existing books are unchanged. It also supplies the default writing direction for new files, subject to the user's independent direction preference (ADR 0016, I5a).

ADR 0016's rule that switching the *interface* language never writes project files still holds. Book language is a property of the project, chosen at initialization or changed explicitly.

**File vocabulary.** Words the app recognizes in files couple behavior to content. That coupling is the point, so it is kept small, explicit, and forgiving:

- **Defaults live in the app.** A registry in the main process holds each recognized word per language. Today that is only `outline_inbox`. Each entry is documented in `file-format.md`. A test fails if code matches file text outside the registry.
- **Overrides are optional.** `novel.md` carries `settings.vocabulary` (for example `outline_inbox: רעיונות`) only when the writer wants a different word.
- **Resolution.** For reading, try the override, then the book language's default, then English, then any language's word or retired alias. For writing, use the first that resolves.
- **Retired words.** If a release changes a default, the old word stays as a read-only alias.
- **Degrade, never destroy.** A recognized heading renamed outside the app becomes ordinary content. The app offers to create a new one rather than writing a duplicate silently.
- **Prefer structure over words.** The outline grammar works by syntax (headings, bullets, links). Adding a recognized word needs a stated reason.

Seeded book-language words (statuses in a new `novel.md`, default template headings) come from the same registry or catalog, keyed by book language, not interface language. The planner should decide whether these belong in the vocabulary registry (recognized) or a separate seed catalog (write-only).

**Later, not in this plan:** a visual settings editor for `novel.md` (language, vocabulary overrides, statuses, folders) that writes through the surgical frontmatter editor and ADR 0007's list editing.

### 4.6 Localization and RTL requirements for all new work

- Every app-owned string is a banana-i18n message with an `en`, `he`, and `qqq` entry. Follow `src/i18n/README.md`. No bare strings in templates.
- User content inside messages (names, titles, layout names) is isolated with the existing helpers. Isolation characters never reach saved content.
- Layout model, storage, and CSS speak logical directions only. Splitter, drag, and drop-zone math reads the computed direction, reusing the I4b approach.
- Arrow-key navigation in tab sets, the card stack, the palette, and the board follows visual direction.
- Counts and numbers use the existing plural and number formatting; generated lists use the existing display collation (I3o).
- The board's column order follows inline direction: in Hebrew the first column is on the right. Beat order within a column is document order.

### 4.7 Accessibility

Panels and cards are landmarks or regions with translated names. Every pointer interaction has a keyboard path. Peek cards are reachable without hover (focus a link, then a shortcut). Drag and drop on the board has keyboard move commands. Focus is never lost when a panel collapses or a layout switches.

## 5. Architecture constraints

The renderer rewrite must hold the same discipline the main process already has. A proposed shape, open to the planner's refinement:

| Location | Contents | Rule to add to dependency-cruiser |
| --- | --- | --- |
| `src/renderer/src/workbench/model/` | Pure layout tree: regions, sections, splits, bindings; operations (split, dock, move, collapse, pin, lock); validation and versioned migration; presets as data | Imports nothing from Vue, Pinia, the DOM, or features |
| `src/renderer/src/workbench/views/` | View registry and view descriptors | Features register; the shell reads |
| `src/renderer/src/workbench/shell/` | Vue components rendering the model; the only place a layout library may appear | Features never import the shell |
| `src/renderer/src/features/*` | Each feature exposes one or more views; pure helpers stay | Features don't import each other's components |
| `src/main/contexts/…` outline structure | Outline grammar parsing, structural edit commands, capture | Pure domain, unit-tested, byte-exact round trips |
| `src/main/…` file vocabulary | Registry and resolution | Domain code receives resolved words; never reads the interface locale |

Questions the plan must answer:

- **Outline home.** Outlines are currently created through the codex API (`createOutline`). Do outline structure and board commands belong in the codex context, a new `outline` (or `plotting`) context, or a cross-context command? Justify against "contexts never import each other".
- **Vocabulary home.** Workspace owns `novel.md` settings. How does a resolved vocabulary reach the outline commands without one context importing another: through the composition root, an application-level input, or the shared kernel? Keep the kernel small.
- **Contract changes.** New API methods for board commands, card data (or reuse of Reference reads), vocabulary, and book language. Version the contract as before.

## 6. Dependencies

`AGENTS.md` requires approval before adding a dependency. A layout library is optional. The constrained model may be simple enough to render with CSS grid and logical properties.

If the plan proposes `dockview-vue` (MIT, zero dependencies, Vue 3, JSON serialization), run a time-boxed spike first:

- Under `dir="rtl"`, do drag direction, splitter deltas, tab order, and drop zones mirror correctly?
- Can it be confined to the center stage behind `workbench/shell/`?
- What does it add to bundle size?
- Does it handle keyboard operation without a paid tier?

Report the results and ask before adopting it. Drag and drop for the board follows the same rule: prefer the platform's DnD with keyboard equivalents, as the binder already does.

## 7. Known conflicts to resolve

1. **`file-format.md` says the app never parses the outline's structure or changes it.** Plotting mode changes that. The plan must propose the amended "Outlines" section (grammar, what the app may change, byte-preservation guarantees, the Inbox section) and an ADR.
2. **`file-format.md` says the app never edits `novel.md` on its own.** Initialization writes `settings.language`, which is consistent, since initialization is an explicit act. Confirm that no other path writes `settings.vocabulary` or `settings.language` without an explicit user action.
3. **The one-writer rule (ADR 0015) versus side-by-side chapters.** This brief keeps one writer. Read-only splits must follow ADR 0014's live-draft rules.
4. **The layout store and document-tabs storage.** The workbench layout must integrate with or migrate the existing `plotdevice.layout`, panel widths, tab persistence, and Reference session state, without losing a user's current arrangement.
5. **The top-level `MainView` switch (write, overview, timeline, interactions).** It becomes center-stage views and layouts. Existing menu commands and accelerators keep working.

## 8. Suggested phasing

The plan may reorder or split these. Each phase fits one agent session and ends with lint, typecheck, tests, and dependency rules green, in the style of `docs/roadmap.md`.

1. **W1 Layout model.** Pure model, operations, validation, versioned storage, presets as data, tests in both directions. ADR: workbench layout model.
2. **W2 Shell on existing features.** Regions, splitters, collapse, layout switcher. The Write preset reproduces today's app exactly: tabs, Writing target, Reference, Properties, outline width. Old shell kept behind a switch.
3. **W3 Views.** Binder, codex list, Properties, Reference, outline, timeline, interactions, overview, warnings register as views. Presets work with existing features only. `MainView` folded in.
4. **W4 Reference to the page.** Peek, entry cards, card stack, cast strip, scene card, read-only open-beside with lock, command palette, focus fade.
5. **W5 Retire the old shell.** Remove the old layout components and migrate stored layout keys.
6. **L1 Book language and file vocabulary.** `settings.language`, registry, resolution, overrides, seeded book-language words at initialization, `file-format.md` update. ADR: book language and file vocabulary.
7. **P1 Outline grammar.** Pure parser with source ranges and structural edit commands; fixture outlines (including hostile ones) round-trip byte-identical. ADR and `file-format.md` amendment.
8. **P2 Plotting mode, read-only board.** Mode switch, Plot preset, beat board as projection, outline editable as text in plotting mode only. Capture a beat behind its experimental setting.
9. **P3 Move on the board.** Drag and keyboard moves of beats and columns; only moved lines change.
10. **P4 Edit on the board.** Add and retitle beats, edit notes, edit chapter synopsis and status from a card.

L1 can run any time before P2. W4 and P2 are independent once W3 lands.

## 9. Testing and qualification

- Layout model: unit tests for every operation, validation, migration, and LTR/RTL mirroring.
- Outline commands: fixture-based, byte-identical round trips on everything outside the edited range, including CRLF, BOM, YAML comments, mixed-direction text, and outlines that don't match the grammar.
- Vocabulary: resolution order, overrides, retired aliases, missing `settings.language`.
- Localization: new strings covered by the existing localization test patterns (`*-localization.test.ts`); complete `he` and `qqq` coverage.
- RTL: extend ADR 0016's qualification checklist with the new geometry: docks, splits, card stack, board columns, drag and drop.
- Safety: tests proving that mode switches, layout switches, and Write here go through the navigation queue and never drop a draft or bypass recovery.

## 10. Open questions

1. Layout storage: per user, per project, or a per-project override of a user default?
2. Peek trigger: plain hover, modifier hover, or focus plus shortcut only?
3. Card field defaults per entry kind, and whether field choice should ever live in project templates (schema-like, Obsidian-visible) rather than `userData`.
4. Thread marker syntax on beats: tag, Dataview inline field, or link to a thread note?
5. Which outline the board opens when a project has several, and whether that choice is part of the layout.
6. Capture a beat: record the source chapter, and is the Inbox always in the outline the board shows?
7. Seeded book-language words: part of the recognized vocabulary registry or a separate write-only seed catalog?
8. Scene card and board are chapter-level until scenes exist. Confirm.
9. Localized frontmatter keys: future opt-in, or never?

## 11. What the planning session must produce

Before writing any implementation code:

1. **A phased plan** added to `docs/roadmap.md` in its existing style (checkbox items, "Done when"), refining section 8.
2. **ADR drafts** in `docs/adr/` for at least:
   - the workbench layout model and its storage
   - the outline grammar and structural edits (amends the "Outlines" section of `file-format.md`)
   - book language and file vocabulary
   - any change to ADR 0014/0015 that the design needs
3. **A proposed diff to `docs/file-format.md`** for outlines and `settings.language`/`settings.vocabulary`.
4. **Bounded-context placement** for outline structure and vocabulary, with the dependency-cruiser rules to add.
5. **Ambiguities and questions**, each with the planner's recommended answer, so the owner can approve or correct quickly.
6. **Dependency requests**, if any, with spike results.

Then stop and wait for approval.
