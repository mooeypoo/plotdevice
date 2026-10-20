# Plot Device

A desktop app for writing a novel in a folder of plain markdown files. The folder stays yours: it works in Obsidian, git, or any text editor, with or without the app. Plot Device is a lens on it: an editor, plus views that make the story visible (the binder, an outline beside the draft, an overview, a timeline, and who appears with whom).

It runs on Linux and Windows, and works in Hebrew as well as English.

## Install

Download the latest build from the project's releases (or build it yourself, below).

| System | File | Install |
|---|---|---|
| Ubuntu, Debian | `plotdevice_<version>_amd64.deb` | `sudo apt install ./plotdevice_<version>_amd64.deb` |
| Other Linux | `plotdevice-<version>.AppImage` | `chmod +x plotdevice-<version>.AppImage`, then run it |
| Windows | `plotdevice-<version>-setup.exe` | Run it. The installer isn't signed yet, so Windows may warn: choose "More info", then "Run anyway". |

**On Ubuntu 24.04 and later, use the `.deb`.** It sets up the permission the app's sandbox needs (an AppArmor profile). An AppImage can't do that for itself, so on those versions it won't start until you add the profile once; see "The AppImage won't start on Ubuntu 24.04+" in [docs/development.md](docs/development.md#troubleshooting).

## Open a novel

- From the app: **Open folder…**, then choose the folder. A folder without a `novel.md` is offered as a new project.
- From a terminal: `plotdevice ~/novels/salt-orchard`. If Plot Device is already running, the folder opens there.
- On Linux, from your file manager: right-click a folder, **Open With → Plot Device**.

The files' format is documented in [docs/file-format.md](docs/file-format.md).

## Develop

See [docs/development.md](docs/development.md) to run, test, and build it, and [AGENTS.md](AGENTS.md) for the project's rules.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
