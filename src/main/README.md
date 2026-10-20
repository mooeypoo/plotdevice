# Main-process app shell

**Purpose.** Owns Electron startup, the native window and menu, and desktop launch arguments.

**Main concepts.** [app-menu.ts](app-menu.ts) sends typed layout commands through the preload.
[window-state.ts](window-state.ts) validates settings and checks current display overlap;
[remember-window.ts](remember-window.ts) waits for the renderer's close guard, then awaits an atomic settings write before closing.
Normal bounds and maximized state live only in `userData/window-state.json`, never in a novel folder.
[composition-root.ts](composition-root.ts) wires settings adapters and the contexts' use cases.

**Must not know about.** Novel-specific rules or frontmatter editing; these belong to the contexts and infrastructure.
