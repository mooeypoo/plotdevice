# Renderer

**Purpose.** Presents the novel through Vue components, Pinia stores, and UI composables.

**Main concepts.** `app/` owns project navigation, document tabs, the protected Writing target, and preferences.
`features/` contains the binder, editor, inspector, outline, reference, timeline, codex, and interactions views.
Outline/Reference panels localize reading chrome while preserving authored content and inert Markdown.
The Writing appearance controls set prose size/width without changing markdown or editor history.
Tabs preserve session undo, selection and scroll; only navigation metadata persists in `userData`, never drafts.
Settings/recents/folder failures use live localized notices preserving drafts; failed list reads retain the last list. Auto/LTR/RTL prose direction is a per-user preference independent of interface language and project files.
Bundled Banana catalogs translate onboarding, chrome/tabs/sidebar/binder, Project Overview summaries/counts, right-panel controls, Codex lists/profile/relationships, Properties/Outline/Template inspectors, Overview, Timeline and Interactions, synopsis/rename controls, generated positions and recent dates; generated lists collate by UI locale. Binder, timeline, matrix and Codex rows flow logically; panel resizing follows RTL pointer/keyboard direction, directional toolbar icons mirror, and CodeMirror copy follows the UI language. ADR 0016 tracks remaining Hebrew/RTL qualification.
Dates/warnings, placement and migrated action/query/link notices stay semantic; locale switches never reread/rewrite files.
Recovery keeps outside changes authoritative; failures retain/freeze drafts, and close warnings follow UI language without file writes.
**Must not know about.** Node, Electron, filesystem access, domain classes, or concrete adapters.
All project reads and writes go through the typed `window.plotDevice` API in `src/contract/`.
