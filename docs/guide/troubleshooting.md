# When something gets in the way

## The Linux app will not start

On Ubuntu 24.04 and later, prefer the `.deb`: it installs the required application
sandbox profile. AppImages and local development builds need their own setup.
Follow the [sandbox troubleshooting instructions](../development.md#troubleshooting).
Do not use `--no-sandbox` or turn security restrictions off system-wide.

If an AppImage reports missing `libfuse.so.2`, the development guide also covers
FUSE and the extraction-based launch option.

## A file is missing from the manuscript

Check the unordered tray and the Codex's untyped entries. Frontmatter `type`,
`part`, and `order` decide classification and placement, not the folder name.
Open **Needs attention** for invalid YAML, ambiguous links, or unusable keys.

An unparseable file is not repaired automatically. Make a backup before editing
its YAML manually. The [file format](../file-format.md) includes valid examples.

## A chapter is not saving

Read the status and any outside-change notice. Saving may be paused until a conflict
is resolved. Keep the draft open, inspect the file in another editor if necessary,
and consider **Save recovered copy** rather than overwriting an uncertain original.

## Windows blocks the installer

The installer is currently unsigned. Only download it from the project's official
release page. Do not disable antivirus or bypass an organization's device policy.
The [download guide](../download.md#windows) explains the current limitation.

## Report a problem

Use [GitHub Issues](https://github.com/mooeypoo/plotdevice/issues), once public access
is available. Include the app version from **Help → About Plot Device**, your OS
version, installer type, steps, expected result, and actual result.

Use a small disposable project and remove identifying information from screenshots.
Do not attach credentials, settings containing private paths, or your real novel.
Do not post suspected security vulnerabilities or sensitive details publicly;
a dedicated private reporting route is still being prepared for launch.
