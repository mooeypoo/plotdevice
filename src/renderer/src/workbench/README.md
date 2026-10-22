# Workbench

**Purpose.** The arrangement around the page: which views sit in which region, how big, and in which mode (ADR 0017).

**Main concepts.** `Layout` (center stage with read-only `Split`s, `start`/`end` docks, `bottom` shelf), `Section` (a placed view with a `global`/`follow`/`pinned` binding), `Mode` (`writing`/`plotting`), the view catalog, presets (Write, Revise, Plot), saved layouts, per-project bindings.
`model/` is pure: validation, operations returning a layout or a semantic refusal, direction-aware splitter math, width fitting, legacy derivation.
`storage/` keeps per-user layouts (`plotdevice.workbench`) and per-project bindings (`plotdevice.workbenchProjects`) in `userData` browser storage, never in the novel folder.
Layouts name sides only logically, so they mirror with the interface language without being rewritten.
`views/` registers each existing view's title key, icon token and self-contained component; shells render views only from here. The new shell (W3) follows.

**Must not know about.** The model knows no Vue, Pinia, DOM, features, stores, project files or translated text (it returns codes; the shell chooses words). Only `views/` imports feature components, and features never import the shell.
