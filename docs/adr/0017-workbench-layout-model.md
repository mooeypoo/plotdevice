# ADR 0017: A constrained workbench layout model in per-user storage

**Status:** accepted (2026-10-22, model and storage in W1). See `docs/plans/workbench-ui-plan.md`.

## Context

The project shell is fixed: binder and Codex on one side, Properties/Outline/Reference
on the other, one center view chosen by `MainView`. A writer can't keep the binder, two
characters and the outline visible at once. Layout state is spread across an unversioned
`plotdevice.layout` record (open panels, tabs, the remembered outline path, which is global
across projects), `plotdevice.lastEntry`, the versioned writing preferences (`outlineWidth`),
and the versioned document-tab metadata (ADR 0015). Free-form IDE docking would add a large
dependency and RTL risk for little gain.

## Decision

- Describe the shell with a **pure layout model** in `src/renderer/src/workbench/model/`:
  a center stage, `start` and `end` docks, a `bottom` shelf, and a card stack that is a
  section of either dock. Docks hold sections, stacked or as a tab set. The model names
  sides only `start`/`end`; it never stores `left`, `right`, or pixel offsets from a side.
- Every panel is a **registered view** (id, title message key, icon, accepted regions,
  supported bindings, lazy component). The shell renders views only through the registry.
- A view **follows** (the Writing target or the active document) or is **pinned** to one
  project path. Writing and Plotting are **modes**; each mode has its own active layout.
- Split the stored state in two:
  - **Layout shapes** (regions, views, collapse, sizes, saved names) are per user, in a
    versioned zod-validated `plotdevice.workbench` record in `userData` browser storage.
    Presets ship as data and can't be deleted; user layouts can be saved, renamed, deleted.
  - **Project bindings** (pinned cards, locked splits, the current outline, the active
    layout per mode) are per project, keyed by project root like document tabs, because
    they name project paths.
- Version 1 is derived once from the existing keys (`plotdevice.layout`, `outlineWidth`)
  so the Write preset reproduces the writer's current arrangement. Old keys stay readable
  until the old shell is retired, then are removed after a successful migration.
- Invalid or unavailable storage is reported with a translated notice, falls back to the
  presets, and never blocks writing (the same policy as writing preferences and tabs).
- Render with CSS grid, flex and logical properties. Splitter math reads the computed
  direction (generalizing `use-outline-width.ts`). The page keeps a minimum readable
  width; docks collapse before it shrinks. Every drag has a menu and keyboard equivalent.
- No layout library. Constrained regions make one unnecessary (see the plan's dependency
  section).

## Details settled in W1

- A dock has one inline size shared by its tabs, so Properties shares the end dock's
  width and becomes resizable (default still 320 px). The start dock defaults to 280 px.
- Bindings are `global`, `follow` or `pinned`; the view catalog lists which each view
  allows. Each view appears at most once per layout.
- Center splits stay in the layout while another view fills the center, and reappear
  with the document. At most two.
- When the page would fall below 280 px, the end dock shrinks to its minimum, then the
  start dock; then the end dock hides, then the start dock. Stored sizes never change.
- Each stored layout is validated on its own: an invalid one is dropped and reported,
  the others are kept. Storage is only rewritten when the shell saves.
- Model failures are semantic codes; the shell (W3) adds translated notices.

## Details settled in W3

- One arrangement serves both shells. The workbench store owns it; the classic panels read
  it through the layout store's facade (open sides, shown tabs, outline width), so switching
  shells keeps the arrangement. The old `plotdevice.layout` key is read only for derivation.
- Rows follow the root direction instead of computing sides; only splitter math reads the
  direction, through the model's `direction.ts`.
- Expand/Restore stays session-only. Planned views that no feature registers are skipped,
  and the switcher offers only layouts whose views all exist.
- While no project is open, bindings live only in the session.

## Details settled in W4

- The center view is part of the layout and persists with it. Asking for a view that a panel
  already shows brings that panel forward; the classic shell, which has no shelf, moves it
  to the main area instead.
- Menus offer only what the model accepts, computed by trying each operation
  (`placement-actions.ts`). Move labels name the physical side from the logical region.
- A closed view comes back where the shipped layouts keep it.
- Saving a layout makes it active; deleting the layout in use switches the project to Write
  first. Switching, resetting and deleting run through the navigation queue (ADR 0018).

## Details settled in W5b

- The center stage has an optional `above` slot for one view whose catalog accepts it (the
  cast strip). Older layouts without it still parse; it counts toward a view appearing once,
  and "Show" puts the cast back above the page.

## Consequences

- Switching interface language mirrors a saved layout without migration.
- Layouts never enter the novel folder, and they never carry document text or drafts.
- Pinned bindings to paths that disappear are pruned like document tabs; renames and app
  moves follow known paths.
- The existing `MainView` values become center-stage views; their menu commands and
  accelerators keep working.
- The model is unit-testable in Node, including LTR/RTL mirroring of every operation.
