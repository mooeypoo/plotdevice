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
| `pnpm demo` | Run the app on a fresh copy of the demo novel (`pnpm demo he` for the Hebrew one); the copy is in a temporary folder, so the repository never changes |
| `pnpm build` | Production build into `apps/desktop/out/` |
| `pnpm lint` | ESLint (TypeScript and Vue), and Prettier's check that the code is formatted |
| `pnpm format` | Formats the code with Prettier (fixtures, samples and docs are left as written) |
| `pnpm typecheck` | `tsc -b` for the pure packages, `vue-tsc` for the Vue packages |
| `pnpm test` | Unit and integration tests (Vitest) |
| `pnpm arch` | Architecture rules: the real code must pass, every deliberate violation must be caught |
| `pnpm perf` | Performance limits on a generated 150-chapter book, run alone so other tests don't skew the timings |
| `pnpm e2e` | Build, then drive the real app with Playwright |
| `pnpm e2e:packaged` | Drive the packaged app (run `pnpm --filter @plotdevice/desktop package:dir` first) |
| `pnpm check` | lint, typecheck, test, arch, perf and build: run before saying a task is done |

## Installers and releases

- `pnpm --filter @plotdevice/desktop package` builds the installers into `apps/desktop/dist/`: an AppImage and a
  `.deb` on Linux, an NSIS installer on Windows (build each on its own system). `package:dir` builds only the
  unpacked app, which is quicker and is what `pnpm e2e:packaged` tests.
- The release identity is fixed (ADR 0001): app id `tech.moriel.plotdevice`, executable `plotdevice`, settings
  folder `plotdevice`. Never change it: Windows upgrades and authors' settings depend on it.
- **To release** (Milestone 15), on an up-to-date `main` whose CI passed:
  1. `pnpm release 0.4.0 --dry-run` shows the notes and anything that isn't ready, changing nothing.
  2. `pnpm release 0.4.0` sets the version (`apps/desktop/package.json`, the Linux metadata), writes the new
     `CHANGELOG.md` section from the `feat:`, `fix:` and `perf:` commits since the last tag, and opens a pull request.
  3. In that pull request, write the summary (replacing the `<!-- Summary … -->` line) and edit the notes for
     authors. CI stays red until the summary is written. The script's bullets are the raw commit lines, so
     rewrite them (0.3.0 in `CHANGELOG.md` is the example):
     - **Summary:** two to four sentences for authors: what this version means for their writing.
     - **Each bullet:** a bold name, then what an author can now do, in the app's own words. Where it helps
       someone who reads files or code, end with an italic *Technical: …* sentence: the files, fields or
       behaviour behind it. Say plainly what changed; don't hide the technical detail, just put it second.
     - **Combine and cut:** merge commits about the same feature into one bullet. Leave out what no author or
       contributor would notice (tests, CI, internal refactors), and fixes to things that were never released.
     - **Good to know** (optional, last): platforms, known limits, anything to do before updating.
     - Run `node tooling/release-notes.mjs check <version>` before pushing. The same notes become the GitHub
       release and the Linux "What's new", where links and emphasis turn into plain text.
  4. Merging tags the merge commit (`tag-release.yml`), and `release.yml` builds the AppImage, the `.deb` and the
     Windows installer and attaches them, with the notes, `SHA256SUMS` and `latest.json`, to a **draft** release.
  5. Try the draft's files, then publish it. Don't mark it "Pre-release".
- **Update notices** read `latest.json` from `https://github.com/mooeypoo/plotdevice/releases/latest/download/latest.json`,
  which GitHub sends to the newest published release. Publishing a release is what tells earlier copies about it.
  Development builds don't check on their own; `PLOTDEVICE_TEST_UPDATE_URL` points an unpackaged build at a local
  server instead.
- Windows is an early beta from 0.3.0: tested in CI, including installing and removing it, but not yet on real
  computers. Say so in each release's "Good to know", never by marking the release "Pre-release". The installer
  isn't signed yet, so SmartScreen warns ("Windows protected your PC"; "More info", then "Run anyway").

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

## The demo novels

`samples/` holds two invented demo novels: *The Salt Orchard* in English and *מטע המלח* in Hebrew. They have parts, chapters (one not yet in the book), characters, places, notes, and an outline whose cards link to them, so every feature can be tried and shown. Use `pnpm demo` to try them. A test opens each one and fails on any broken link, so keep it passing when editing them. `tests/fixtures/` is different: its bytes are test data, and must never be edited by trying the app.
