# Development

## Setup

1. **Node 24 LTS** (the version Electron 45 bundles): `nvm install 24 && nvm use` (reads `.nvmrc`).
2. **pnpm 12**: `corepack enable` picks the version pinned in `package.json`. Use pnpm, never npm:
   npm cannot read pnpm's `node_modules` and fails with "Cannot read properties of null".
3. `pnpm install`. Electron 45 downloads its binary (about 100 MB) the first time it is launched, not during install.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run the app with hot reload |
| `pnpm build` | Production build into `apps/desktop/out/` |
| `pnpm lint` | ESLint (TypeScript and Vue) |
| `pnpm typecheck` | `tsc -b` for the pure packages, `vue-tsc` for the Vue packages |
| `pnpm test` | Unit and integration tests (Vitest) |
| `pnpm arch` | Architecture rules: the real code must pass, every deliberate violation must be caught |
| `pnpm e2e` | Build, then drive the real app with Playwright |
| `pnpm check` | lint, typecheck, test, arch and build: run before saying a task is done |

## Troubleshooting

- **Electron behaves like plain Node, or nothing opens, from a VS Code terminal or extension.** VS Code's
  extension host sets `ELECTRON_RUN_AS_NODE=1`. Run `unset ELECTRON_RUN_AS_NODE`, or use another terminal.
  The end-to-end tests clear it themselves.
- **"The SUID sandbox helper binary was found, but is not configured correctly" on Ubuntu 24.04 and later.**
  Ubuntu restricts the user namespaces Chromium's sandbox needs. Either allow them
  (`sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`; resets at reboot), or run the app without
  the sandbox for local development only: `pnpm dev:no-sandbox`. The end-to-end tests detect the restriction and add
  `--no-sandbox`; CI lifts the restriction instead, so the sandbox stays on there.
- **Electron's binary is missing** (`node_modules/electron/dist` doesn't exist): that's normal until the
  first launch, which downloads it. To download it ahead of time (for example, before going offline), run
  `node -e "require('electron')"` in `apps/desktop`.

## Where things go

- Layers and their rules: `docs/ARCHITECTURE.md` and `.dependency-cruiser.cjs`. Each package has a short
  `README.md` saying what it is for and what it must not know about.
- A new architecture rule needs a deliberate-violation fixture in `tooling/arch-fixtures/<rule-name>/`,
  or `pnpm arch` fails.
- Development settings live in `plotdevice-dev` in the OS app-data folder (on Linux,
  `~/.config/plotdevice-dev/preferences.json`).
