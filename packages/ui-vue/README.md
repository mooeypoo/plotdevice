# ui-vue

The interface: welcome screen, navigator, writing view, conflict dialog, focus mode and settings,
in English and Hebrew, light and dark.

- **Stores (Pinia):** the open project and save statuses (`project`), settings and translation (`settings`), layout (`view`).
- **Composables hold the logic**; components only present. `use-chapter-writing` owns the one editor:
  autosave after a pause, sending text on blur, chapter switch and close, quiet reloads, conflicts.
- **Colours** come only from `theme/tokens.ts` through `--color-*` variables, and every palette must pass
  `paletteProblems` (WCAG AA). Logical CSS properties keep right-to-left layouts correct.
- Talks to the host only through `PlotDeviceApi`. Never imports `application`, `domain`, file access, Node or Electron.
