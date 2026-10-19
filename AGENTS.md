# Plot Device

A local desktop app for writing a novel. It works on a folder of plain markdown files that stays fully usable without the app (Obsidian, git, any text editor). The app is a lens on that folder: an editor, plus views that make the story visible (binder, outline, timeline, characters, interactions).

## App identity

The display name is **Plot Device**. Everywhere a technical token is needed, it is **`plotdevice`**: lowercase, no space, no hyphen.

Set these in Phase 0 and never change them. The settings folder and the Windows installer identity depend on them, so a rename would orphan user settings and break upgrades.

| Setting | Value |
|---|---|
| `productName` (window title, menus, installer) | `Plot Device` |
| `package.json` `name`, repo name | `plotdevice` |
| Linux `executableName` | `plotdevice` |
| `appId` | `tech.moriel.plotdevice` |
| Settings folder (`userData`) | `plotdevice` under the OS app-data directory (see below) |
| Preload global / API interface | `window.plotDevice` / `PlotDeviceApi` (camelCase per TypeScript convention) |

Electron would otherwise name the settings folder after `productName` (`Plot Device`, with a space). Override it in `src/main/index.ts` before `app` is ready:

```ts
app.setPath('userData', join(app.getPath('appData'), 'plotdevice'))
```

Read these before changing code:

- `docs/file-format.md` is the contract for the files on disk. It outranks everything else.
- `docs/architecture.md` describes the layers, bounded contexts, and dependency rules.
- `docs/roadmap.md` lists the phases. Work on one phase at a time.
- `docs/adr/` holds short decision records. Add one when you make a decision a future developer would question.

## Non-negotiables

1. **The folder is the source of truth.** No database, no hidden app files in the project folder. All derived data (indexes, word counts, the timeline) can be rebuilt from the files. Per-user UI state (window size, recent projects) lives in Electron's `userData` directory, never in the novel folder.
2. **Never damage the user's files.**
   - Preserve unknown frontmatter keys, key order, YAML comments, the body, and line endings.
   - Change only the keys the app owns.
   - Write atomically (`write-file-atomic`).
   - If a file can't be parsed, show a warning and leave the file untouched.
3. **Domain code is pure.** `domain/` imports nothing from Electron, Node, Vue, or any infrastructure library. `dependency-cruiser` enforces this, and lint must pass.
4. **The renderer never touches the filesystem.** It only talks to the main process through the typed API in `src/contract/`.
5. **Linux and Windows both work.**
   - Use `node:path` for all filesystem paths in infrastructure. Store project-relative paths (`ProjectPath`) with forward slashes. Domain code never imports `node:path`.
   - Validate file names (Windows-forbidden characters, reserved names, and characters that break wikilinks).
   - Expect case-insensitive file systems.

## Stack

- Electron, scaffolded with electron-vite and packaged with electron-builder.
- Vue 3 (`<script setup lang="ts">`, Composition API) and Pinia.
- TypeScript in strict mode, with `noUncheckedIndexedAccess`. No `any`; use `unknown` and narrow.
- CodeMirror 6 for the editor.
- `yaml` (Document API, which preserves formatting) for frontmatter, and `zod` to validate parsed data and IPC payloads.
- `chokidar` for file watching.
- Vitest for tests, ESLint with typescript-eslint and eslint-plugin-vue, Prettier, and dependency-cruiser.

Check with me before adding a dependency that isn't on this list.

## Code style

- Write clear code first. A function name should say what it does, so a comment only needs to say *why*.
- Use TSDoc on exported domain and application symbols: one or two sentences, no restating the signature.
- Each bounded context has a `README.md` of at most 15 lines covering its purpose, main concepts, and what it must not know about.
- Use small files with one concept per file. Use named exports, no default exports (Vue SFCs excepted).
- Return `Result<T, E>` (in `shared-kernel`) for expected failures such as invalid input or a missing file. Throw only for bugs.
- Use the domain language in code. Use `Part`, `Chapter`, `Thread`, `StoryDate`, `Character`, not `Item`, `Node`, or `Data`.
- Vue components only present. Logic belongs in composables (UI logic) or behind the API (domain logic).

## Testing

- Domain and application code: unit tests next to the source (`*.test.ts`). Write them first for new domain rules.
- Infrastructure: tests run against a copy of `fixtures/sample-novel/` in a temp directory.
- Every bug fix includes a test that would have caught it.
- Round-trip test: reading and then writing any fixture file without changes must produce identical bytes.

## Commands

```bash
npm run dev          # run the app with hot reload
npm run test         # vitest
npm run lint         # eslint + dependency-cruiser
npm run typecheck    # vue-tsc --noEmit
npm run build:linux  # AppImage + deb
npm run build:win    # NSIS installer (normally built in CI)
```

Before saying a task is done, run `npm run lint && npm run typecheck && npm run test`.

## Working style (all agents)

- Start each phase with a written plan, including the files you'll touch, and wait for approval before changing code.
- Keep changes scoped to the current phase. Note anything else you spot in `docs/roadmap.md` under "Later".
- When you finish a phase, update the relevant context README and tick the phase in the roadmap.
