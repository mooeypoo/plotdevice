# ui-vue

The interface: welcome screen, the Write workspace (navigator, writing view, conflict dialog, focus
mode), the Story workspace (outlines as Board, List and Cards; the manuscript outline), and settings,
in English and Hebrew, light and dark.

- **Stores (Pinia):** the open project and save statuses (`project`), outlines (`story`), settings and
  translation (`settings`), layout and workspace (`view`).
- **Composables hold the logic**; components only present. `use-chapter-writing` owns the one editor;
  `use-outline-actions` holds every outline action (menus, keyboard moves, drag and drop, editing).
- **Working names** such as "Story" appear only in the message catalogs; code uses internal IDs.
- **Colours** come only from `theme/tokens.ts` through `--color-*` variables, and every palette must pass
  `paletteProblems` (WCAG AA). Logical CSS properties keep right-to-left layouts correct.
- Talks to the host only through `PlotDeviceApi`. Never imports `application`, `domain`, file access, Node or Electron.
