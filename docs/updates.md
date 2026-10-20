# Updates, on your terms

Plot Device is preparing its first public release. There is no published stable
version, in-app update checker, or public version feed yet.

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
up to date. This feature and its endpoint are not implemented yet.

## Privacy

Writing and organizing your novel are local operations. No account or manuscript
upload is required. The documentation's search runs locally in your browser.
Fonts are served with the site; there is no third-party analytics integration.

Visiting this site or GitHub Releases sends ordinary request metadata, including
your IP address, to GitHub. The planned manual version check will do the same, but
will not send novel text, project paths, project names, or a user identifier.
See [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
