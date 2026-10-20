# Updates, on your terms

<script setup>
import { withBase } from 'vitepress'
import { data as release } from './release.data'
</script>

<p v-if="release.source === 'preview'"><strong>Offline site preview:</strong> no live release discovery or public version feed is included in this build.</p>
<template v-else>
  <p v-if="release.stable">Latest verified stable release: <a :href="release.stable.releaseUrl">{{ release.stable.version }}</a>.</p>
  <p v-else>No stable release has been published. The version feed explicitly reports no stable version.</p>
  <p>Release state checked at {{ release.generatedAt }}. <a :href="withBase('/updates/v1/latest.json')">Raw version-1 JSON feed</a>.</p>
</template>

The installed-app update checker is not implemented yet.

## Manual upgrades

When a new release is available:

1. Read its [release notes](releases.md), known issues, and compatibility information.
2. Back up your novel folder.
3. Let pending saves finish and resolve any outside-edit decision before closing.
4. Download the installer for your platform from
   [GitHub Releases](https://github.com/mooeypoo/plotdevice/releases).
5. Install it, or replace the old AppImage. Keep your novel folder and app settings.
6. Open the app, check **About Plot Device**, and reopen your project.

Installing a local `.deb` does not subscribe you to automatic apt updates.
An upgrade is not a file-format migration, nor does installing an older app
automatically undo changes to a novel.

## Planned version check

The MVP plan includes **Help → Check for Updates**. It will fetch a small,
versioned JSON document describing the published stable release, compare it to
the installed version, and offer to open the official release page in a browser.

It will not download/install an update, restart the app, or make background checks.
An unavailable or invalid response must say the check failed, not that you are
up to date.

## Machine-readable version feed

Published site builds expose `/plotdevice/updates/v1/latest.json`. The feed is
generated from GitHub's designated latest stable release, never the version in the
development branch. Drafts and prereleases do not replace stable releases.

The response has `schemaVersion: 1`, a `generatedAt` timestamp, and `stable`, which
is either `null` or an object with `version`, `tag`, `publishedAt`, and `releaseUrl`.
Preview builds deliberately do not emit this endpoint. It becomes public only
after Pages deployment is approved and verified.

This is an update-notification contract, not an automatic-installation feed.
Pages/CDN updates are eventually consistent; a recently published release may
take time to appear. Apps must distinguish network/schema errors from "up to date"
and must not suggest downgrades based on an older cached response.

## Privacy

Writing and organizing your novel are local operations. No account or manuscript
upload is required. The documentation's search runs locally in your browser.
Fonts are served with the site; there is no third-party analytics integration.

Visiting this site or GitHub Releases sends ordinary request metadata, including
your IP address, to GitHub. The planned manual version check will do the same, but
will not send novel text, project paths, project names, or a user identifier.
See [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
