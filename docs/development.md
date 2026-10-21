# Development

How to run, test, and build Plot Device locally. Project rules are in `AGENTS.md`.

## Requirements

- Node 22.22.2 or newer (CI uses Node 24, matching Electron's bundled Node). `.nvmrc` pins 24.
- Linux or Windows. macOS isn't a target.

```bash
npm install
```

## Run

```bash
npm run dev            # the app with hot reload
```

Before calling any change done:

```bash
npm run lint && npm run typecheck && npm run test
```

## Build for testing

| Command | Output | Use it for |
|---|---|---|
| `npm run build:unpack` | `dist/linux-unpacked/plotdevice` | A packaged app without an installer; quickest to rebuild |
| `npm run build:linux` | `dist/plotdevice-<version>.AppImage` and `dist/plotdevice_<version>_amd64.deb` | Testing the real installers |
| `npm run build:win` | `dist/plotdevice-<version>-setup.exe` | Windows installer (normally built in CI) |

```bash
chmod +x dist/plotdevice-0.1.0-beta.1.AppImage && ./dist/plotdevice-0.1.0-beta.1.AppImage
sudo apt install ./dist/plotdevice_0.1.0-beta.1_amd64.deb      # remove with: sudo apt remove plotdevice
```

CI packages Linux x64 on `v*` tags. Manual runs also package Windows for future
qualification: GitHub → Actions → CI → "Run workflow". Windows artifacts from
manual runs are not public release assets. Both OSes still run all code checks.

The deb installs `build/tech.moriel.plotdevice.metainfo.xml` under
`/usr/share/metainfo/`, linked to `plotdevice.desktop`, plus copyright/license
files under `/usr/share/doc/plotdevice/`. Its AppStream metadata alone is CC0;
the application remains GPL-3.0-or-later. When available, check it with
`appstreamcli validate --no-net build/tech.moriel.plotdevice.metainfo.xml`.
The release checklist keeps AppStream dates aligned with actual candidate notes.
Metadata is available to AppStream consumers, but Ubuntu App Center's local-deb
screen uses PackageKit details instead: publisher/date are not populated and
the APT backend reports license as unknown. Adding a release date will not fix
that screen. Native deb permissions remain unrestricted. The release checklist
links to the upstream implementations; this is not a failed metadata validation.

For release preparation, start with `npm run release:guide` and the
[release checklist](https://github.com/mooeypoo/plotdevice/blob/main/docs/releasing.md).
The [release plan](https://github.com/mooeypoo/plotdevice/blob/main/docs/release-plan.md) tracks the
approved phases and remaining work. Pushed annotated version tags with dated notes
assemble unpublished Linux-only GitHub release drafts after both platform checks
and Linux packaging; publication
and installer qualification remain manual. The first tagged rehearsal is pending.

To start the app with a project, as `plotdevice <folder>` does once installed, pass the folder to the unpacked build: `./dist/linux-unpacked/plotdevice <folder>`.

## Icons

The app's icons are drawn in two SVGs: `build/icon.svg` (48 px and up) and `build/icon-small.svg` (a simpler version for 16–32 px, where detail turns to mush). After changing either, render every icon the builds use:

```bash
env -u ELECTRON_RUN_AS_NODE npm run icons
```

It writes `build/icons/<size>x<size>.png` (Linux), `build/icon.ico` (Windows, small design at 16–32 px), and `build/icon.png` and `resources/icon.png` (512 px). Electron itself renders them (`tools/render-icons.mjs`), so there's no image library to install. Commit the rendered files.

## Testing on Windows

CI typechecks, compiles, and unit-tests on Windows; manual runs can package it,
but Windows distribution is deferred until the installer is tested by a person. Follow
[the Windows test guide](https://github.com/mooeypoo/plotdevice/blob/main/docs/testing-windows.md).

## Test data

Never test against `fixtures/sample-novel/` directly: tests depend on its exact bytes. Copy it first:

```bash
cp -r fixtures/sample-novel ~/sample-novel
```

The app keeps its recent-project settings in `~/.config/plotdevice/` on Linux and
`%APPDATA%\plotdevice\` on Windows. An unreadable/invalid `recent-projects.json`
now produces a visible warning; invalid settings remain at the original path.
A usable novel still opens if remembering it fails. To recover, close the app,
back up the settings file, and repair it or move it aside deliberately before
reopening. A missing file starts an empty list; no novel files are affected.

## Documentation

```bash
npm run docs:dev       # local authoring
npm run docs:build     # production build plus publication-boundary and link checks
npm run docs:preview   # inspect /plotdevice/ on the printed local URL
```

These commands are offline previews: no release API requests and no public version
feed. `npm run docs:build:published` uses the authenticated `gh` CLI to discover
published releases, verifies their metadata/checksums, and emits the raw
`/plotdevice/updates/v1/latest.json` endpoint alongside matching download links.
It does not publish, deploy, or create a release. Failed discovery aborts the build.
Generated state and build outputs are ignored by git. Do not commit them.

The site uses pinned VitePress `2.0.0-alpha.20`, approved to use the current Vite 8
toolchain instead of stable VitePress 1's older development-server dependencies.
Treat upgrades as deliberate changes: review advisories and release notes, rebuild,
and check search, mobile/keyboard navigation, and light/dark rendering.
The [decision record](https://github.com/mooeypoo/plotdevice/blob/main/docs/adr/0009-vitepress-manual-and-publication-boundary.md)
explains the trade-off.

CI checks the offline production site on Linux. The separate **Documentation**
workflow builds authenticated published-release data on manual runs, with deployment
off by default. Manual deployment requires the explicit `deploy` input, `main`,
a public repository, and Pages configured for GitHub Actions.

After launch approval, setting the repository variable
`PAGES_DEPLOYMENT_APPROVED=true` also enables automatic refresh on main pushes,
published/unpublished/edited/deleted releases, and daily reconciliation. Leave it unset during
private preparation. Neither setting the variable nor making the repository public
is performed by the workflow. A private repository cannot deploy through this gate.
Do not enable Pages or change visibility just to test a local build.

Deployment rechecks both release state and main's commit. If either changed during
the build, the job fails with a rerun instruction. The post-deploy check verifies
the raw JSON and anonymous download reachability with bounded retries for CDN lag.
These checks require a push/approved deployment; they are not local-preview guarantees.
If a future workflow publishes using `GITHUB_TOKEN`, explicitly dispatch the
Documentation workflow; that token's release event generally does not start it.

The expected project URL after approval is `https://mooeypoo.github.io/plotdevice/`.
It is not live yet. A push will be needed to run hosted CI and, later, deploy; it is
not needed for local preview. The local generator/feed are implemented, but their
first hosted run and public verification remain pending.

## Troubleshooting

### "The SUID sandbox helper binary was found, but is not configured correctly" (Ubuntu 24.04+)

Ubuntu blocks unprivileged user namespaces (`kernel.apparmor_restrict_unprivileged_userns = 1`), so Chromium falls back to its setuid helper, which npm installs without root ownership. Don't use `--no-sandbox`, and don't turn the restriction off system-wide. Instead, give this project's Electron binary an AppArmor profile, which survives `npm install`:

```bash
sudo tee /etc/apparmor.d/plotdevice-dev-electron > /dev/null <<'EOF'
abi <abi/4.0>,
include <tunables/global>

profile plotdevice-dev-electron /home/<you>/<path-to>/plotdevice/node_modules/electron/dist/electron flags=(unconfined) {
  userns,
  include if exists <local/plotdevice-dev-electron>
}
EOF
sudo apparmor_parser -r /etc/apparmor.d/plotdevice-dev-electron
```

Replace the path with the absolute path of your checkout. The unpacked build and the AppImage are different binaries and need their own profile line, or the quick fix below.

Quick alternative, which has to be repeated whenever npm reinstalls Electron:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

### The AppImage won't start on Ubuntu 24.04+

Same cause as above. The `.deb` needs nothing: electron-builder's install script adds an AppArmor profile for the installed app (`/etc/apparmor.d/plotdevice`), so prefer it on Ubuntu. An AppImage runs from a temporary mount and can't add a profile for itself, so give it one, once:

```bash
sudo tee /etc/apparmor.d/plotdevice-appimage > /dev/null <<'EOF'
abi <abi/4.0>,
include <tunables/global>

profile plotdevice-appimage /tmp/.mount_plotde*/plotdevice flags=(unconfined) {
  userns,
  include if exists <local/plotdevice-appimage>
}
EOF
sudo apparmor_parser -r /etc/apparmor.d/plotdevice-appimage
```

The AppImage mounts itself at `/tmp/.mount_` plus the first six letters of its file name and a random suffix, so the profile matches as long as the file's name starts with `plotdevice`.

### "Cannot read properties of undefined (reading 'setPath')"

The shell has `ELECTRON_RUN_AS_NODE=1` set (VS Code's extension host passes it to child processes), so Electron starts as plain Node. Unset it:

```bash
env -u ELECTRON_RUN_AS_NODE npm run dev
```

### The AppImage says `libfuse.so.2` is missing

Install `libfuse2t64`, or run it with `--appimage-extract-and-run`.
