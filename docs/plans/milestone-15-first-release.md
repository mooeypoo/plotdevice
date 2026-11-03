# Milestone 15: The first release, update notices, and issue forms

Status: **Built** (2026-11-03) on branch `milestone-15/first-release`, steps 1–5 of the work order; results are under "Results". The release itself (step 6) happens after this is merged. The owner's answers are under "Decisions".

## Goal

Publish Plot Device 0.3.0 for Linux, and make sure everyone who installs it can find out about the next one.

1. **Update notices:** the app checks, at most once a day, whether a newer version is out, and says so quietly. This ships **in** 0.3.0, because a copy without it can never be told about an update.
2. **One command to prepare a release:** `pnpm release <version>` checks that everything is ready, sets the version everywhere, writes the changelog from the commits, and opens a pull request. You review and edit the changelog in that pull request before anything is published.
3. **Issue forms** on GitHub for problems and ideas, linked from the app.
4. **The first release**, 0.3.0, for Linux (AppImage and `.deb`).

**Out of scope:**

- Windows releases. CI keeps building and testing the Windows installer so it doesn't break, but releases don't include it until the Windows beta.
- Installing updates automatically. The app says a new version is out and links to it; the author downloads it.
- A "Run workflow" button on GitHub for releasing. The local command comes first; the button is under "Later".
- macOS.

## Decisions (owner, 2026-11-02)

1. **Version numbers:** plain numbers, no "beta" in them: `0.3.0`, `0.4.0`, and `1.0.0` when it's stable. Releases are **not** marked "Pre-release" on GitHub (this matters for update notices, below).
2. **Linux only** for now.
3. **Update notices before the first release**, at an address that never changes, even if the documentation site moves.
4. **The changelog is written from the commits**, the way [eslint-config-wikimedia](https://github.com/wikimedia/eslint-config-wikimedia) does it, and checked before a version is published.
5. **Start with a local command**; a GitHub button later.
6. **Issue forms** for problems and for ideas, reachable from the app.
7. **The recommendations in "Open decisions" are accepted:**
   - `latest.json` is attached to each GitHub release, with no own domain for now;
   - the automatic check is on by default, with a switch in Settings;
   - the issue forms are in English, saying Hebrew is welcome;
   - 0.3.0 is released from `main`, after this milestone is built.
8. **Each version's changelog has a short summary** written by a person, above the generated bullet points.
9. **The About window gets a "buy me a coffee" line.**

## Update notices

### What the author sees

Nothing, unless there's a newer version. Then a quiet line in the top bar (the app has no status bar):

```
Plot Device 0.4.0 is out.  What's new · Download
```

- **What's new** opens the release notes and **Download** opens the install page, both in the browser and in the interface's language.
- It can be dismissed, and stays dismissed for that version.
- **Check for updates**, a button in the About window under the version number, checks now and says either "You have the newest version" or the line above. If the check fails, it says "Couldn't check for updates. Check your internet connection, or try again later."
- **Settings** has **Check for updates automatically** (on by default; see **Decide 2**).

It never interrupts writing: no dialog, no sound, nothing over the page.

**The name:** inside the app, "version" already means a saved version of a chapter (Milestone 6). This feature is always called **updates**, in the interface and in the code (`update-check`, not `version-check`).

### The address

The app asks one fixed address for a small file, `latest.json`. Where that file lives (**Decide 1**):

| Option | Address | Changes if… |
|---|---|---|
| **A file attached to each GitHub release** | `https://github.com/mooeypoo/plotdevice/releases/latest/download/latest.json` | the repository leaves GitHub. Renaming it is fine, because GitHub redirects. **Recommended** |
| A hidden page on the documentation site | `https://mooeypoo.github.io/plotdevice/latest.json` | the site moves or gets its own domain. This is the problem you raised |
| A domain you own, redirecting to the first option | for example `https://plotdevice.moriel.tech/latest.json` | never, while you keep the domain. It needs a DNS record and a redirect set up once |

**Why the first option:** GitHub's `releases/latest` address always points to the newest **published** release. Each release carries its own `latest.json`, so the file "updates" itself at the moment you click Publish. Not before (a draft is invisible to it), and with no second step to forget. It doesn't depend on the documentation site at all. Releases must not be marked "Pre-release", because `latest` skips those; that matches Decision 1.

If you want insurance against ever leaving GitHub, the third option can be added on top: the app asks your domain, and your domain redirects to GitHub. You could switch hosts later by changing only the redirect.

### The file

Written by the release workflow, never by hand:

```json
{
  "format": 1,
  "version": "0.4.0",
  "date": "2026-11-20",
  "notes": "https://github.com/mooeypoo/plotdevice/releases/tag/v0.4.0",
  "download": {
    "en": "https://mooeypoo.github.io/plotdevice/start/install/",
    "he": "https://mooeypoo.github.io/plotdevice/he/start/install/"
  }
}
```

- `format` lets a later app understand a changed file, and an older app ignore what it can't read.
- The links live in the file, not the app, so the documentation site can move without breaking copies already installed: the next `latest.json` points to the new place.
- The app's own words ("Plot Device 0.4.0 is out") are in the app, in both languages. The file has no text to show.

### Privacy and safety

- **Nothing about the author is sent.** It's a plain request with no identifier, no version number in the address and no cookies. GitHub sees the computer's IP address, as with any web page. The Settings line and the guide's privacy section say so.
- **Offline is normal:** a failed automatic check is silent, and is tried again the next day.
- The request is made by the app's main process, not the window. It is HTTPS only, has a short timeout and a size limit, and follows redirects only to GitHub's own hosts.
- The file is checked against a schema. Anything unexpected is ignored, never shown. Links are opened only if they're on the project's GitHub or the documentation site (the existing external-link rules).
- The automatic check is off in development (`pnpm dev`) and in tests. Tests use a local server, through a test-only setting that the packaged app ignores.
- Copies built from source, the AppImage and the `.deb` all get the notice. The notice only links, so it works however Plot Device was installed.

## Preparing a release

### `pnpm release 0.3.0` (`tooling/release.mjs`)

It runs locally and stops with a plain explanation at the first problem.

1. **Checks:**
   - on `main`, nothing uncommitted, up to date with GitHub;
   - the version is a plain `x.y.z`, higher than the last tag;
   - CI passed on this commit (`gh run list`);
   - there's at least one change since the last tag.
2. **Sets the version:** `apps/desktop/package.json`, and a new `<release>` entry in the Linux metadata (`tech.moriel.plotdevice.metainfo.xml`) with the date.
3. **Writes the changelog:** adds a section to the top of `CHANGELOG.md` (see below).
4. **Opens a pull request** from `release/v0.3.0`, titled "Release 0.3.0".

**The check before publishing (Decision 4)** happens in that pull request. You read the new changelog section and edit it there: reword a line for authors, merge two lines, drop one. Merging the pull request means "these notes are right".

### The changelog, from the commits

Like eslint-config-wikimedia's `git log HEAD --no-merges --not --tags`, with one difference. Their readers are developers, so every commit goes in. Ours are authors, so the script keeps only what changes the app for them:

| Commit starts with | In the changelog |
|---|---|
| `feat:` | **New** |
| `fix:` | **Fixed** |
| `perf:` | **Faster** |
| `docs:`, `test:`, `ci:`, `build:`, `style:`, `dev:`, `refactor:`, anything else | left out |

The prefix is removed and the first letter capitalised. For example, these commits:

```
feat: the start screen offers "Already have notes or a draft? Moving them in →"
fix: the Hebrew start screen says העבירו אותן למערכת
docs: Milestone 13 plan, approved
```

become:

```markdown
## 0.4.0 — 2026-11-20

Moving an existing book in is now one step from the start screen, and the Hebrew
start screen reads more naturally.

### New
- The start screen offers "Already have notes or a draft? Moving them in →"

### Fixed
- The Hebrew start screen says העבירו אותן למערכת
```

**The summary (Decision 8):**

- The script puts a placeholder where the summary goes: `<!-- Summary: two or three sentences, for authors -->`. You write the summary in the release pull request.
- The bullet points are complete but dry. The summary says what the version means for someone writing a book.
- Nothing is released while the version's notes have **any** `<!-- comment -->` left (the placeholder, a half-edited placeholder or any other comment), or no summary at all. The release pull request's CI, the tagging workflow and the release workflow each check this.
- A group (New, Fixed, Faster) can also get a one-line introduction of its own, but doesn't need one.

Two consequences:

- **Commit messages become release notes.** A `feat:` or `fix:` line should make sense to an author. Most already do. `AGENTS.md` and `development.md` will say so, and CI will check that each commit has a known prefix, so nothing falls out of the changelog by accident.
- **The first release is different.** With no earlier tag, "since the last release" is the whole history: about 80 `feat:`/`fix:` lines, many about features that changed again later. For 0.3.0 only, the script writes those lines into the pull request for reference, and the changelog section is a short summary of what Plot Device does, which I'll draft and you'll edit. From 0.4.0 on, it's fully generated.

**The same notes, everywhere:** the release workflow copies the version's changelog section into the GitHub release notes and into the Linux metadata, so "What's new" in Ubuntu's Software app shows it too.

### What happens after you merge

1. A small workflow sees the merged "Release 0.3.0" pull request and tags the merge commit `v0.3.0`. You never type a tag.
2. `release.yml` (changed):
   - Linux only, for now;
   - fails early if the tag and `package.json` disagree;
   - takes the release notes from the changelog;
   - attaches the AppImage, the `.deb`, a `SHA256SUMS` file, and `latest.json`;
   - leaves it as a **draft**, as today.
3. You download the AppImage or `.deb` from the draft, try it, and click **Publish**. At that moment `latest.json` goes live, and earlier copies start seeing the notice.

## Issue forms

`.github/ISSUE_TEMPLATE/`:

- **`problem.yml`, "Something isn't working":**
  - what happened;
  - what you expected;
  - steps to make it happen again;
  - Plot Device version (shown in About);
  - system: Linux distribution, or Windows;
  - the book's language: English, Hebrew, or both;
  - screenshots.

  At the top: "Please don't attach your book. A small invented example is just as useful, and your writing stays private." This matches the site's "Report a problem" page.
- **`idea.yml`, "An idea or a request":**
  - what you're trying to do;
  - how you do it today;
  - your idea (optional).

  The form asks about the writing problem first, the solution second.
- **`config.yml`:** turns off blank issues, and links to the guide's Questions page.

**From the app:** the ⋯ menu, next to "Help and documentation" and "About", gets two new items:

- **Report a problem…** opens the problem form with the version and system already filled in. GitHub forms accept these in the address, so the author doesn't have to look them up.
- **Suggest an idea…** opens the idea form.

They open in the browser. The site's "Report a problem" page links to both forms.

## Buy me a coffee, in the About window

One line, after "Everything you write with Plot Device is yours…" and before the credits, with the link `https://buymeacoffee.com/mooeypoo` on the linked words. The wording (owner, 2026-11-02):

> Plot twist: this app runs on coffee. ☕ If Plot Device helps you write, you can [buy me one](https://buymeacoffee.com/mooeypoo). I'll put it toward the next chapter… of the code.

> טוויסט בעלילה: האפליקציה הזאת רצה על קפה. ☕ אם Plot Device עוזרת בכתיבה, אפשר [לקנות לי כוס קפה](https://buymeacoffee.com/mooeypoo), והיא תלך לפרק הבא… של הקוד.

It doesn't call the app "free" (see the 2026-10-26 decision); the GPL notice above it stays as it is. Its address is added to the links the app may open.

The forms are in English, with a line saying reports in Hebrew are welcome (**Decide 3**).

## Files

- **Application:** an `UpdateCheck` port (`latest(): Result<LatestRelease>`), and the pure comparison "is this version newer, and not dismissed?", with tests.
- **Contracts:** the `latest.json` schema; channels for "check now" and "dismiss".
- **Desktop:**
  - `update-check.ts`: fetches through Electron's `net`, with the address, timeout, size limit and allowed hosts;
  - the once-a-day timer;
  - `buymeacoffee.com` and the issue-form addresses added to the allowed external links.
- **UI:**
  - the status-bar line and the Settings switch;
  - "Check for updates" and the coffee line in `AboutDialog.vue`;
  - "Report a problem…" and "Suggest an idea…" in the ⋯ menu (`TopBar.vue`).
- **Words:** `en.json`, `he.json`.
- **Tooling:**
  - `tooling/release.mjs`;
  - `tooling/changelog.mjs`, which turns commits into a section and reads a version's section back out, with tests;
  - a commit-prefix check for CI.
- **Workflows:** `release.yml` (changed), `tag-release.yml` (new), `ci.yml` (commit-prefix check).
- **GitHub:** `.github/ISSUE_TEMPLATE/problem.yml`, `idea.yml`, `config.yml`.
- **Repository:** `CHANGELOG.md` (new), `package.json` (`release` script).
- **Site:**
  - the install page: Linux only for now, a sentence about update notices, and Windows "coming soon";
  - the privacy wording;
  - "Report a problem" links to the forms.

  English and Hebrew.
- **Docs:** `development.md` (releasing, commit messages), `AGENTS.md` (commit messages are release notes), `UX_SPEC.md` (the update line, the menu items), and this plan.

## Tests

- **Application:**
  - version comparison: `0.10.0` is newer than `0.9.0`, and equal versions aren't newer;
  - a dismissed version stays quiet, and a newer one shows again;
  - an unreadable file or an unknown `format` is ignored.
- **Desktop, against a local server:**
  - a newer version, the same version and an older version;
  - a timeout, a 404, a huge response and invalid JSON;
  - a redirect to a host that isn't allowed is refused;
  - nothing identifying is in the request.
- **End to end:**
  - the status-bar line appears for a newer version, opens the right link per language, and stays dismissed;
  - About → Check for updates, for "newest" and for "couldn't check";
  - the Settings switch stops the automatic check;
  - ⋯ → Report a problem… opens the form address with version and system filled in; Suggest an idea… opens the idea form;
  - the coffee link in About opens in the browser, in English and Hebrew.
- **Tooling:**
  - commits become the right sections, and other prefixes are left out;
  - reading a version's section back out;
  - the release script refuses a dirty tree, a lower version, the wrong branch, and a commit where CI failed (with `git` and `gh` faked);
  - tagging refuses a changelog whose summary is still the placeholder.
- **Workflows:** a dry run of the release on a fork or a throwaway tag (`v0.0.1-test`), then deleted. This checks the notes, the attached files and that `latest.json` is valid.
- **Commands:** `pnpm check`, `pnpm site:build`, `pnpm site:test`, the end-to-end suite.

## Work order

1. The changelog and release tooling, test-first; `CHANGELOG.md` with the 0.3.0 summary.
2. The update check: application, contracts, desktop, then the UI and Settings.
3. The release workflows: Linux only, notes, checksums, `latest.json`, tagging on merge; the throwaway-tag dry run.
4. The issue forms, the two ⋯ menu items, and the coffee line in About.
5. The site and docs.
6. After the above is merged: `pnpm release 0.3.0`. You review the pull request and write the summary, merge, try the draft, and publish.

## Results

### What the author can do

- See **Update available** in the top bar, before ☰, when a newer version is out. It opens a small panel: "Plot Device 0.4.0 is out.", **What's new**, **Download** (the install page in the interface's language) and **Not now**, which stops mentioning that version, after restarts too.
- **Check for updates** in About, which answers "You have the newest version.", "Plot Device 0.4.0 is out. What's new · Download", or "Couldn't check for updates…".
- Turn off **Check for updates automatically** in Settings, with a line saying what's sent (nothing about them).
- **Report a problem…** and **Suggest an idea…** in ☰, opening the GitHub forms; the problem form has the version and system filled in.
- Read the coffee line in About, in English and Hebrew.

### What the owner can do

- `pnpm release 0.4.0 --dry-run`, then `pnpm release 0.4.0`, as described in `docs/development.md`. The release pull request stays red in CI until its summary is written; merging it tags the release and builds the draft.

### Changed from the plan while building

- **The update line is in the top bar**, before ☰: the app has no status bar. It's a quiet button that opens a panel, so the links and "Not now" don't crowd the bar.
- **"Check for updates" is in About**, not a menu; the ☰ menu gained only the two GitHub forms.
- **A failed automatic check tries again at the next startup**, or within six hours if the app stays open, rather than the next day. GitHub is still asked at most once a day once it has answered.
- **The first release's notes start where this implementation starts** (`133ae0a`, 2026-10-25): the repository also holds the old app's history. They are generated like any other release's (26 lines, to edit in the pull request), with no special summary-only case.
- **`latest.json` is checked in the main process**, which fetches it; the application layer may use contract types only (an architecture rule caught this), so it keeps the last answer and checks it by shape.
- **The fetch uses Node's own `fetch`**, with redirects followed by hand so each one is checked against GitHub's hosts. It doesn't use the system's proxy settings (see "Known limitations").
- **The Hebrew "Report a problem" page wasn't updated**: the owner has edits to it in progress. `pnpm site:translations` lists it.

### Tests

- **Tooling** (`pnpm arch`): the changelog section from commits (grouping, prefixes removed, repeats once), inserting and reading sections, the summary placeholder, commit prefixes, version order, `latest.json`, the Linux metadata; the release script's refusals (wrong branch, uncommitted changes, behind GitHub, not newer, CI failed, running or missing, nothing changed).
- **Contracts and application:** the `latest.json` schema (unknown format, beta versions, non-HTTPS and `javascript:` links refused); update checks once a day across restarts, a clock set backwards, offline, turned off, dismissing, "Check for updates"; the new setting read leniently.
- **Desktop, against a local server:** redirects to an allowed host followed and others refused, plain HTTP refused, too many redirects, 404, not JSON, unknown format, a huge answer with and without a length, a server that never answers, nothing listening; no cookie or authorisation sent. The IPC handlers, and the new links allowed (the project's GitHub pages and the coffee page, not look-alikes).
- **End to end** (`apps/desktop/e2e/updates.e2e.ts`): the top-bar notice and its links per language, "Not now" across a restart and a later version shown, nothing for the current version or offline, the Settings switch stopping the automatic check while About still checks, the two forms' addresses, and the coffee line in both languages.
- **By hand:** the release helper run end to end against a test changelog (notes, `latest.json`, the metadata passing `appstreamcli validate`); screenshots of the notice, menu, About and Settings in light English and dark Hebrew.
- **Commands:**
  - `pnpm lint`, `pnpm typecheck`: pass.
  - `pnpm test`: 995 passed. `pnpm arch`: 140 passed. `pnpm perf`: 4 passed. `pnpm build`: passes.
  - `pnpm exec playwright test`: 79 passed.
  - `pnpm --filter @plotdevice/desktop package:dir && pnpm e2e:packaged`: 3 passed, 1 skipped (CI only).
  - `pnpm site:build`: passes, all internal links valid.
- **Not run yet:** the workflows themselves (`release.yml`, `tag-release.yml`, the commit check). They run on GitHub; the plan's dry run on a throwaway tag is still to do once this is merged.

### Known limitations

- The update check doesn't use a system proxy; behind one, it fails quietly.
- The issue forms add the labels `problem` and `idea`, which don't exist on the repository yet; GitHub leaves them off until they're created.
- The Hebrew "Report a problem" page doesn't mention the new menu items yet.

## Later

- **A "Release" button** on GitHub (a workflow you start from the Actions tab), doing what `pnpm release` does.
- **Windows releases**, when the Windows beta starts; signing the installer, so Windows stops warning about an unknown publisher.
- **A "What's new" page** on the documentation site, in English and Hebrew, built from `CHANGELOG.md`.
- **Installing updates from inside the app**, for the AppImage and Windows. This needs signed builds and more care; notices come first.
