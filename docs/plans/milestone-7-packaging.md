# Milestone 7: Installers and the release identity (Gate 6, second half)

Status: **Proposed, awaiting owner approval.** No code yet.

## Goal

Plot Device can be installed like any other app: an AppImage and a `.deb` for Linux, and an installer for Windows, built in CI and tested as installed. Authors get a real app with its icon, its name in menus, an About window with the licence and its credits, and a way to open a project folder from the file manager. This finishes Gate 6.

**What an author can do at the end:**
1. **Install Plot Device** on Linux (AppImage, or `.deb` on Ubuntu and Debian) or Windows (an installer with Start-menu and desktop shortcuts), and uninstall it cleanly. Uninstalling never touches the author's novels.
2. **Find it by name and icon** in the app menu, task bar and window list.
3. **Open a novel's folder** with "Open with Plot Device" from the file manager (Linux), or by passing it on the command line. The app opens that project.
4. **See what they're running:** an About window with the version, the licence, the note that the author's work is theirs, and the open-source components the app includes (GPL compliance).

**Out of scope:**
- macOS (no build or test machine).
- Code signing. Windows will show its "unknown publisher" warning until a certificate is bought, which is an owner decision for later.
- Automatic updates.
- Publishing to app stores.

## Decisions I recommend (**Decide** where marked)

1. **The release identity** (**Decide**): the same as the old app, so installing the new Plot Device **upgrades** the old one instead of sitting beside it with the same name:

   | | Value |
   |---|---|
   | App id | `tech.moriel.plotdevice` |
   | Name | Plot Device |
   | Executable and Linux package | `plotdevice` |
   | Settings folder | `plotdevice` in OS app data (development builds keep `plotdevice-dev`) |

   - **The old app's settings files are left alone.** Plot Device reads only its own files (`preferences.json`, `recent.json`, `journals/`, `backups/`); unreadable values fall back to defaults, and nothing is deleted.
   - **Old projects are not converted.** The rebuild doesn't migrate the old app's data model without a separate decision (AGENTS.md). If the old app's projects can't be opened, a converter is its own, later piece of work.

   (**Recommended**: the old app was never published, so this only matters on your own machine, and an upgrade is what you'd expect there.)
2. **The version** (**Decide**): `0.2.0`. It must be higher than the old `0.1.0-beta.1`, or the Windows installer treats it as a downgrade. (**Recommended**)
3. **Where builds happen** (**Decide**):
   - **Every push:** CI builds the Linux and Windows installers and keeps them as downloadable build artifacts.
   - **A tag such as `v0.2.0`:** creates a **draft** GitHub release with the installers attached. Nothing is published until you publish the draft yourself.

   (**Recommended**)
4. **The licence and credits:** the About window lists the open-source packages the app includes and their licences. The list is generated at build time from the installed packages, so it is never out of date.
5. **Opening a folder from the file manager** (Linux "Open with", or a command-line argument): the app opens that project, or says plainly that the folder isn't a Plot Device project. If the app is already running, the folder opens in the running app.

## Dependencies (**Decide**; MIT, compatible with GPL-3.0)

| Package | Why |
|---|---|
| `electron-builder` | Builds the AppImage, `.deb` and Windows installer. It was planned in Phase 0 (`apps/desktop`: electron-vite + electron-builder) |

The licence list uses `pnpm licenses list`, which pnpm already includes, so no package is needed for it.

## What gets built

| Where | New |
|---|---|
| `apps/desktop` | The electron-builder configuration (identity, icons, Linux desktop entry and AppStream metadata, the Windows installer); the release settings folder; opening a folder passed at launch, with a single running instance; the About window |
| `tooling` | Generating the licence list and the Windows `.ico` from the brand masters (`assets/brand`) |
| `.github/workflows` | Building installers on Linux and Windows; a draft release on tags |
| `ui-vue` | The About window, in English and Hebrew |

## Tests

- **Built app, end to end** (Playwright against the *packaged* app, Linux and Windows in CI):
  - It starts, under its own name and version.
  - Settings go to the `plotdevice` folder.
  - The security policy holds inside the packaged app (asar).
  - Writing and saving a chapter works.
  - A folder passed at launch opens.
- **Packages:**
  - The `.deb` installs and removes cleanly in CI (`dpkg -i`, then `dpkg -r`).
  - The desktop entry and AppStream metadata are valid (`desktop-file-validate`, `appstreamcli validate`).
  - The Windows installer installs silently, the app starts from its install folder, and it uninstalls (CI).
- **Upgrade from the old app:** a profile folder containing the old app's settings files opens without errors, the new files are created beside the old ones, and nothing is deleted.
- **The About window:** it shows the version, the licence and the credits list, named in both languages.
- **The licence list:** it is generated, non-empty, and includes Electron, Vue and CodeMirror.

## Work order

1. electron-builder configuration, the release identity and icons; a packaged smoke test on Linux.
2. Opening a folder at launch, with a single instance.
3. The About window and the generated licence list.
4. CI: installers on Linux and Windows, install and uninstall tests, draft releases on tags.
5. Packaged end-to-end tests, the upgrade check, docs (ADR 0001 identity note, development and release instructions) and results.
