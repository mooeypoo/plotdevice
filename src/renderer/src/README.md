# Renderer

**Purpose.** Presents the novel through Vue components, Pinia stores, and UI composables.

**Main concepts.** `app/` owns project navigation, document tabs, the protected Writing target, and preferences.
`features/` contains the binder, editor, inspector, outline, reference, timeline, codex, and interactions views.
References read beside the draft without replacing it or changing Properties; reading panels share inert Markdown.
The Writing appearance controls set prose size/width without changing markdown or editor history.
Tabs preserve session undo, selection and scroll; only navigation metadata persists in `userData`, never drafts.
Settings/recents/folder failures use live localized notices preserving drafts; failed list reads retain the last list.
Bundled Banana catalogs translate onboarding, chrome/tabs/sidebar/binder/Codex, generated positions and recent dates; ADR 0016 tracks Hebrew/RTL.
Dates/warnings, placement and migrated action/query/link notices stay semantic; locale switches never reread/rewrite files.
Recovery keeps outside changes authoritative until an explicit choice; localized failures retain drafts and freeze editing.
**Must not know about.** Node, Electron, filesystem access, domain classes, or concrete adapters.
All project reads and writes go through the typed `window.plotDevice` API in `src/contract/`.
