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

CI builds both installers on `v*` tags, or on demand: GitHub → Actions → CI → "Run workflow".

For release preparation, start with `npm run release:guide` and the
[release checklist](releasing.md). The [release plan](release-plan.md) tracks the
approved phases and remaining work. Pushed annotated version tags with dated notes
assemble unpublished GitHub release drafts after both platform builds; publication
and installer qualification remain manual. The first tagged rehearsal is pending.

To start the app with a project, as `plotdevice <folder>` does once installed, pass the folder to the unpacked build: `./dist/linux-unpacked/plotdevice <folder>`.

## Icons

The app's icons are drawn in two SVGs: `build/icon.svg` (48 px and up) and `build/icon-small.svg` (a simpler version for 16–32 px, where detail turns to mush). After changing either, render every icon the builds use:

```bash
env -u ELECTRON_RUN_AS_NODE npm run icons
```

It writes `build/icons/<size>x<size>.png` (Linux), `build/icon.ico` (Windows, small design at 16–32 px), and `build/icon.png` and `resources/icon.png` (512 px). Electron itself renders them (`tools/render-icons.mjs`), so there's no image library to install. Commit the rendered files.

## Testing on Windows

CI builds and unit-tests on Windows, but the installer needs a person: follow [testing-windows.md](testing-windows.md).

## Test data

Never test against `fixtures/sample-novel/` directly: tests depend on its exact bytes. Copy it first:

```bash
cp -r fixtures/sample-novel ~/sample-novel
```

The app keeps its own settings (the recents list) in `~/.config/plotdevice/` on Linux and `%APPDATA%\plotdevice\` on Windows. Delete `recent-projects.json` there to start fresh.

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
