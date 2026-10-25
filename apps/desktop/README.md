# desktop

The Electron host for Linux and Windows. `src/main` is the composition root: it wires the file adapters
to the application use cases and serves them over IPC. `src/preload` exposes `window.plotDevice`, and
`src/renderer` mounts the Vue interface.

- Sandboxed renderer, context isolation, strict CSP, no navigation, no new windows, no permissions.
- Every IPC request is checked for its sender and validated with zod (`src/main/ipc.ts`).
- Development settings live in `plotdevice-dev` in the OS app-data folder, apart from releases.
- Commands: `pnpm dev` (hot reload), `pnpm build`, `pnpm start` (run the build).
