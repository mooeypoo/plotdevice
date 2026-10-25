# ui-vue

The Vue interface: design tokens (`theme/tokens.ts`, the single source for every colour), the app shell,
and composables that bind settings, language and theme to the document.

- Components present; logic lives in composables (UI) or behind the host API (everything else).
- Talks to the core only through `PlotDeviceApi` (contracts). Never imports application, domain,
  file access, Node or Electron.
- Colours only via `--color-*` variables; logical CSS properties for right-to-left layouts.
- Every palette must pass `paletteProblems` (WCAG AA), including future author themes.
