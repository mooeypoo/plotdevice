# ADR 0017: A constrained workbench layout model in per-user storage

**Status:** proposed (2026-10-22), not yet approved. See `docs/plans/workbench-ui-plan.md`.

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

## Consequences

- Switching interface language mirrors a saved layout without migration.
- Layouts never enter the novel folder, and they never carry document text or drafts.
- Pinned bindings to paths that disappear are pruned like document tabs; renames and app
  moves follow known paths.
- The existing `MainView` values become center-stage views; their menu commands and
  accelerators keep working.
- The model is unit-testable in Node, including LTR/RTL mirroring of every operation.
