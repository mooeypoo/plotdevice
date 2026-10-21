# Renderer

**Purpose.** Presents the novel through Vue components, Pinia stores, and UI composables.

**Main concepts.** `app/` owns project navigation, document tabs, the protected Writing target, and preferences.
`features/` contains the binder, editor, inspector, outline, reference, timeline, codex, and interactions views.
References read beside the draft without replacing it or changing Properties; reading panels share inert Markdown.
The Writing appearance controls set prose size/width without changing markdown or editor history.
Tabs preserve session undo, selection and scroll; only navigation metadata persists in `userData`, never drafts.
Invalid or unavailable preferences storage is reported without blocking writing.
Interface language uses typed IPC and bundled Banana catalogs; ADR 0016 tracks incomplete Hebrew/RTL support.
Dates/warnings and migrated action/query/link notices stay semantic; locale switches never reread or rewrite files.
Recovery keeps outside changes authoritative until an explicit choice; localized failures retain drafts and freeze editing.
**Must not know about.** Node, Electron, filesystem access, domain classes, or concrete adapters.
All project reads and writes go through the typed `window.plotDevice` API in `src/contract/`.
