# Milestone 26: the download page

**Status:** built 2026-11-09, on top of Milestone 25 (PR #56).

## Why

Every Download button on the site went to GitHub's releases page: long release notes, and five files
with names a writer can't be expected to tell apart (`.exe`, `.AppImage`, `.deb`, `latest.json`,
`SHA256SUMS`). Writers who aren't technical need one clear button for their computer.

## Decisions (owner, 2026-11-09)

1. **A download page on the site,** `/download/` and `/he/download/`. Every Download button on the site
   goes there, and so does the download link in the app's update notice.
2. **The page updates itself when a release is published,** not when the draft is made, so it never
   links to files that aren't public yet.
3. **Older versions are folded away** under "Previous versions". The section only appears once there is
   more than one release.
4. **No copies of the files without the version number** in their name. The page links each version's
   own files, so the GitHub release page doesn't list everything twice.

## How it works

1. The owner publishes a release on GitHub, as before.
2. The **Download page** workflow (`.github/workflows/site-releases.yml`) runs
   `tooling/site-releases.mjs`. It lists every published release and works out which file is for
   which computer from its name: `-setup.exe` is Windows, `.AppImage` and `.deb` are Linux, `.dmg` is
   Mac. Drafts and pre-releases are never listed.
3. It writes `apps/site/src/releases.json` and commits it to main as a `docs:` commit, so it stays out
   of the app's release notes.
4. Netlify sees the commit and rebuilds the site. No secrets are involved: the workflow's own token
   commits, and Netlify builds from Git as for any other change.

The list is rewritten from scratch every time, so an edited, unpublished or deleted release corrects
itself. "Run workflow" on the Actions page does the same by hand.

## The page

- **The newest version,** with its date and a "What's new" link to the release notes.
- **A card for each computer:**
  - **Windows:** one button, with a line about Windows' "More info → Run anyway" warning.
  - **Linux:** the AppImage ("works on any Linux") and the .deb ("for Ubuntu and Debian").
  - **Mac:** "Coming soon", with a link to the support page. Once a release has a `.dmg`, a button
    appears instead, with no page change needed.
- **The reader's own computer comes first,** marked "Your computer", going by what the browser
  reports. On a phone or tablet, a line says Plot Device is for computers. Without JavaScript, all three
  computers show in the same order, none marked.
- **After downloading:** a link to the guide's install page.
- **Previous versions:** folded away, one row per version with its files.
- A quiet line about supporting Plot Device.

## Also changed

- **The app's update notice** (`latest.json`) now links to `plotdevice.app/download/`, and the app may
  open plotdevice.app links. Copies of 0.3.0 can't open that link (their list of allowed sites is
  older). They can still open the release notes, which link to the files.
- **The guide's install page** points to the download page instead of GitHub.
- **The site footer** has a Download link.

## Tests

- `tooling/site-releases.test.ts`: which file is which, only published releases, newest first.
- The site tests check:
  - every Download button goes to the download page;
  - the newest files are on the right cards;
  - the reader's computer comes first on Linux and Windows;
  - the note shows on a phone;
  - without JavaScript, every computer shows;
  - accessibility, direction and phone width in both languages and both themes.
