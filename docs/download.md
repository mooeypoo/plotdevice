# A place to begin

<script setup>
import { data as release } from './release.data'
</script>

The first Plot Device release is being prepared for **Linux x64 only**. Windows
code is checked in CI, but its installer has not been validated on a real Windows
machine or VM. No Windows installer will be distributed for this candidate.
The development version is not a downloadable release. Only complete, published
stable releases are listed below.

<div class="release-downloads">
  <p v-if="release.source === 'preview'"><strong>Offline site preview.</strong> Release discovery was not run. This page makes no claim about the currently published version.</p>
  <template v-else-if="release.stable">
    <p><strong>Latest stable: {{ release.stable.version }}</strong> · Published {{ release.stable.publishedAt.slice(0, 10) }} · <a :href="release.stable.releaseUrl">Read this release's notes</a></p>
    <ul>
      <li v-for="asset in release.stable.downloads" :key="asset.name">
        <a :href="asset.url">{{ asset.name }}</a>
      </li>
    </ul>
  </template>
  <p v-else><strong>No stable release has been published yet.</strong> Preview/beta releases, when available, are listed separately on GitHub and are not recommended here as stable.</p>
</div>

Installers and preview releases appear on
[GitHub Releases](https://github.com/mooeypoo/plotdevice/releases), with release
notes, build metadata, and a `SHA256SUMS` file. There is no macOS or ARM build planned
for the first release. The release pipeline currently targets x64.

## Choose your installer

| Platform | Package | What to expect |
| --- | --- | --- |
| Ubuntu / Debian | `.deb` | Recommended on Ubuntu; includes the app sandbox setup |
| Other Linux | `.AppImage` | A single executable file; may need FUSE or sandbox setup |
| Windows | Not distributed yet | Installer qualification is pending; CI success is not installation testing |

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

Windows distribution is deferred until the actual installer can be tested.
Contributors can build from source, but this is not a supported Windows release.
Signing policy is also unresolved. Do not download unofficial Windows installers
or disable antivirus or system-wide security settings to run a development build.

## Check a download

Download `SHA256SUMS`, `release-metadata.json`, and the installers into one folder.
On Linux:

```bash
sha256sum --check SHA256SUMS
```

If you downloaded only your platform's installer, other entries will be reported
missing; its own checksum must still match. A checksum catches
corruption; it does not independently establish the publisher's identity.

## Run from source

Contributors can follow [Development](development.md). Source is publicly available;
installer availability is determined by the published releases, not branch versions.

Already installed? Read [updates and upgrades](updates.md). Ready to write?
[Open your first project](guide/start.md).
