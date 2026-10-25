# Milestone 1: Walking skeleton

Status: **Complete** (2026-10-25), on branch `milestone-1/walking-skeleton`. Results are at the end of this document.

## Goal

An app that does almost nothing for authors, but where every layer of the architecture is real, connected and checked automatically. Every later feature then goes into a structure that already works.

It opens a window. The interface can switch between English and Hebrew (flipping right-to-left), and between system, light and dark themes. It remembers both choices after a restart. Behind that small feature, the whole path is real:

```
UI → typed IPC → application use case → preferences port → file adapter → disk
```

The path is sandboxed, validated, tested on Linux and Windows CI, and fenced by architecture rules that fail when broken.

**Not in this milestone:** projects, chapters, the editor, outlines, Markdown parsing, and packaging/installers. Those start at Gate 2.

## What will exist

| Package | Contents | First real behaviour (and its tests) |
|---|---|---|
| `packages/shared` | `Result`, branded IDs | `Result` helpers |
| `packages/domain` | Text-direction rules (ADR 0004) | `firstStrongDirection`, `naturalDirection` with Hebrew, English, mixed, numbers and punctuation |
| `packages/application` | Ports (`PreferencesStore`, `Clock`); use cases `getAppInfo`, `getPreferences`, `setPreferences` | Use cases tested with an in-memory store |
| `packages/contracts` | Zod schemas and the `PlotDeviceApi` type for the three calls | Valid and invalid payloads |
| `packages/presentation` | Appearance view model: `system`, `light` or `dark` plus the OS preference → the effective theme; locale → `lang` and `dir` | Pure tests |
| `packages/i18n` | `translate(key, params, locale)` over banana-i18n; `en.json` and `he.json` (gender-neutral Hebrew) | Plurals, parameters, fallback to English; a test that both catalogs have the same keys |
| `packages/fs-node` | The atomic writer from ADR 0005, reimplemented properly; a JSON preferences store in the app-data folder | Real temp-folder tests: atomic write, read-only file, a corrupt preferences file (falls back to defaults and is kept as `.bak`, never silently lost) |
| `packages/ui-vue` | Design tokens (`DESIGN_SYSTEM.md`), a minimal app shell, language and theme switches | Contrast test on every token pair; component test that switching doesn't remount |
| `apps/desktop` | Electron main (composition root), preload (`window.plotDevice`), renderer bootstrap | IPC handlers reject invalid payloads and foreign senders |
| `tooling/` | Shared TypeScript config, ESLint, dependency-cruiser rules, violation fixtures | Architecture test: each forbidden import is detected |

`markdown`, `storage` and `editor-codemirror` are created when Gate 2 or 3 first needs them, not as empty shells now.

## Files (top level)

```
package.json  pnpm-workspace.yaml  .nvmrc  .editorconfig  .prettierrc.json
tsconfig.base.json  tsconfig.json  eslint.config.js  .dependency-cruiser.cjs
.github/workflows/ci.yml
docs/development.md       setup, Node and pnpm, the Ubuntu sandbox fix, ELECTRON_RUN_AS_NODE
apps/desktop/…            electron.vite.config.ts, src/main, src/preload, src/renderer
packages/<name>/…         package.json, tsconfig.json, README.md (≤ 15 lines), src/, tests next to source
tooling/arch-fixtures/…   deliberate violations, one per rule
```

## Dependencies (each tied to a need)

| Package | Version line | Why |
|---|---|---|
| electron | 45 | Desktop host (stack) |
| electron-vite, vite, @vitejs/plugin-vue | 6, 8, 6 | Build (stack); electron-vite 6 supports Vite 8 |
| vue | 3.5 | UI (stack) |
| zod | 4 | IPC and preferences validation (stack) |
| banana-i18n | 2.4 | Banana-format messages with plurals and gender (`AGENTS.md`). Wikimedia's library; stable, last release Dec 2024 |
| typescript | **6.0.x (pinned)** | `vue-tsc` doesn't support TypeScript 7 yet (Spike B) |
| vue-tsc, vitest, eslint, typescript-eslint, eslint-plugin-vue, prettier, dependency-cruiser | current | Checks (stack) |
| @playwright/test | 1.64 | **New, needs approval.** The end-to-end tests that drive the real Electron app |

**Not added:** Pinia (not needed until there is shared UI state), `write-file-atomic` (replaced, per ADR 0005), electron-builder (packaging milestone).

**Tooling:** Node **24 LTS**, the same Node that Electron 45 bundles, and pnpm 12. Your machine has Node 22, so `nvm install 24` once.

## Security settings (proven in the end-to-end tests)

- **Renderer:** `contextIsolation`, `sandbox`, no `nodeIntegration`. Navigation and new windows are denied.
- **CSP:** `default-src 'self'`; scripts from `'self'` only; styles from `'self'` plus a nonce, with no `unsafe-inline`.
- **Preload:** exposes only `window.plotDevice`, three typed calls.
- **Main process:** every handler validates its input with Zod and checks the sender frame.

## Acceptance criteria

These are the checks that must pass, run on Linux and Windows CI:
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm arch` and `pnpm build` pass on `ubuntu-latest` and `windows-latest`.
- [ ] Every violation fixture fails the architecture check:
  - domain or application importing Node or Vue
  - UI importing application, domain or `fs-node`
  - preload importing anything except contracts and Electron
- [ ] `domain`, `application` and `contracts` compile without DOM or Node types.
- [ ] End-to-end tests on the real app (Linux in CI; Windows when practical):
  - [ ] **Language:** switching to Hebrew sets `lang="he"` and `dir="rtl"` without a reload.
  - [ ] **Theme:** switching to dark changes the theme without a reload.
  - [ ] **Persistence:** after a restart, both choices are still in effect.
  - [ ] **CSP:** no violations in the console.
- [ ] **Contrast:** every text and UI token pair meets WCAG AA, in light and dark.
- [ ] **Robust preferences:** a corrupt preferences file doesn't crash the app; the defaults are used and the bad file is kept.

**Testing approach:** test-first for `fs-node` and the domain rules. Tests for the UI shell are written alongside it (`AGENTS.md`, "Testing and quality requirements"). Results are reported with the exact commands and output.

## Decisions (resolved)

1. **Playwright:** approved.
2. **Colours:**
   - Light teal `#1F7A77` and secondary text `#5E6A75` approved.
   - Warning `#9C6430` and amber `#BB803F` were darkened on the same principle.
   - All are in `DESIGN_SYSTEM.md`, and all colours live in **one constants file**, so palettes (and, later, author-chosen themes) can be swapped without touching components.
3. **Package scope:** `@plotdevice/*`. npm scopes can't be nested, so `@mooeypoo/plotdevice/<package>` isn't possible. The packages are never published, so the scope only affects how imports read.

## Work order (one commit or small PR each)

1. Workspace, tooling and CI, with the architecture rules and their violation fixtures.
2. `shared`, `domain` (direction rules), `contracts`, `application`.
3. `fs-node` (atomic writer and preferences store), test-first.
4. `i18n`, `presentation`, `ui-vue` (tokens and shell).
5. `apps/desktop`: main, preload, renderer, security settings.
6. End-to-end tests, `docs/development.md`, a context README per package.

## Results

Every check passed on a **fresh clone**, running the same sequence as CI:

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm lint` | OK |
| `pnpm typecheck` | OK (`tsc -b`, plus `vue-tsc` and the end-to-end test config) |
| `pnpm test` | **86 tests pass** (unit and integration, including 8 real SIGKILLs during atomic writes) |
| `pnpm arch` | **17 checks pass**: the real code has no violations; all 14 rules catch their deliberate-violation fixtures, and a `.vue` file is checked too |
| `pnpm build` | OK; the built page carries the strict CSP |
| `pnpm exec playwright test` | **9 end-to-end tests pass** on the real app |

**Every acceptance criterion is met, except one:** the Windows column runs in CI on the first push and hasn't run yet.

**Bugs found along the way, each with a regression test that fails without its fix:**
- **Two quick settings changes raced in the main process,** and the second save undid the first (language reverted to English). Updates are now serialized in an application `PreferencesSession`, and the UI applies only the reply to its latest request. Found by a screenshot, not by the tests at first.
- **The footer showed Electron's version (45.0.0) instead of the app's.** The tests launched the main file instead of the app folder.
- **A settings change carrying `undefined` could erase a setting.** TypeScript caught it.
- **`frame-ancestors` is ignored in a `<meta>` CSP,** and Chromium warns about it. It's removed; the app refuses embedding anyway.

**Where the work differs from the plan:**
- **No `Clock` port and no `getAppInfo` use case.** Nothing needed them yet: app info is a host fact assembled in `main`. Ports are added when a use case needs one.
- **The "switching doesn't remount" check is an end-to-end test,** not a component test. A component test would have needed a DOM library, which isn't an approved dependency.
- **The architecture rules have 14 rules, not the handful listed.** The extra ones are type-only rules for application→contracts and fs-node→application, and a preload rule.
- **Electron 45 downloads its binary on first launch, not during install.** That replaces the Spike B note that blamed pnpm. CI downloads it explicitly before the end-to-end tests.
- **On Ubuntu 24.04+, the end-to-end tests detect the AppArmor restriction and add `--no-sandbox` locally.** CI lifts the restriction instead, so the sandbox stays on there.
