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
chmod +x dist/plotdevice-0.1.0.AppImage && ./dist/plotdevice-0.1.0.AppImage
sudo apt install ./dist/plotdevice_0.1.0_amd64.deb      # remove with: sudo apt remove plotdevice
```

CI builds both installers on `v*` tags, or on demand: GitHub → Actions → CI → "Run workflow".

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

### "Cannot read properties of undefined (reading 'setPath')"

The shell has `ELECTRON_RUN_AS_NODE=1` set (VS Code's extension host passes it to child processes), so Electron starts as plain Node. Unset it:

```bash
env -u ELECTRON_RUN_AS_NODE npm run dev
```

### The AppImage says `libfuse.so.2` is missing

Install `libfuse2t64`, or run it with `--appimage-extract-and-run`.
