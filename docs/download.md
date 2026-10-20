# A place to begin

Plot Device runs on Linux and Windows. **The first public release is being prepared;
no installer is published yet.** The development version is not a downloadable release.

When installers are available, they will appear on
[GitHub Releases](https://github.com/mooeypoo/plotdevice/releases), with release
notes, build metadata, and a `SHA256SUMS` file. There is no macOS or ARM build planned
for the first release. The release pipeline currently targets x64.

## Choose your installer

| Platform | Package | What to expect |
| --- | --- | --- |
| Ubuntu / Debian | `.deb` | Recommended on Ubuntu; includes the app sandbox setup |
| Other Linux | `.AppImage` | A single executable file; may need FUSE or sandbox setup |
| Windows | `-setup.exe` | A per-user installer; currently unsigned |

The supported OS-version matrix is still being qualified. Do not treat a successful
CI build as proof that every Linux distribution or Windows version is supported.

### Ubuntu and Debian

Download the version's `.deb`, then install the local file:

```bash
sudo apt install ./plotdevice_<version>_amd64.deb
```

Use the actual filename in place of `<version>`. The package does not add an apt
repository: future versions still need to be downloaded and installed manually.

### Other Linux

Make the downloaded AppImage executable, then run it:

```bash
chmod +x plotdevice-<version>.AppImage
./plotdevice-<version>.AppImage
```

On Ubuntu 24.04 and later, prefer the `.deb`. AppImages need a one-time
[sandbox configuration](development.md#the-appimage-won-t-start-on-ubuntu-24-04).
Never disable the application sandbox to make an installer work.

### Windows

Run `plotdevice-<version>-setup.exe`. The installer is not signed yet; Windows may
ask for confirmation. Only use files from the project's release page, and do not
disable antivirus or system-wide security settings. If Windows or a managed machine
blocks the installer, stop and ask your administrator rather than bypassing policy.

## Check a download

Download `SHA256SUMS`, `release-metadata.json`, and the installers into one folder.
On Linux:

```bash
sha256sum --check SHA256SUMS
```

If you downloaded only your platform's installer, other entries will be reported
missing; its own checksum must still match. On Windows, use PowerShell:

```powershell
Get-FileHash .\plotdevice-<version>-setup.exe -Algorithm SHA256
```

Compare the result with the matching line in `SHA256SUMS`. A checksum catches
corruption; it does not independently establish the publisher's identity.

## Run from source

While public installers are being prepared, contributors with repository access can
follow [Development](development.md). Source access will become public deliberately
at launch. A GitHub login is not intended to be required for the public downloads.

Already installed? Read [updates and upgrades](updates.md). Ready to write?
[Open your first project](guide/start.md).
