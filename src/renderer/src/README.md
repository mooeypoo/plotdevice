# Renderer

**Purpose.** Presents the novel through Vue components, Pinia stores, and UI composables.

**Main concepts.** `app/` owns project navigation, layout, shared editor state, and user preferences.
`features/` contains the binder, editor, inspector, outline, reference, timeline, codex, and interactions views.
References read beside the draft without replacing it or changing Properties; reading panels share inert Markdown.
The Writing appearance controls set prose size/width without changing markdown or editor history.
The preferences store keeps typography and per-project collapsed binder parts in `userData` browser storage.
Invalid or unavailable preferences storage is reported without blocking writing.
Recovery banners keep outside changes authoritative until the writer chooses disk text, a separate copy,
or confirmed replacement; failures retain the draft and actions temporarily freeze editing.

**Must not know about.** Node, Electron, filesystem access, domain classes, or concrete adapters.
All project reads and writes go through the typed `window.plotDevice` API in `src/contract/`.
