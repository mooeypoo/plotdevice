# Milestone 20: Ready for writers

Status: **Proposed** (2026-11-05), waiting for the owner's approval. Direction from the "Change of order" section of `roadmap-16-approachable-studio-and-timelines.md`, with the owner's decisions on backups, restore points and installers (2026-11-05).

## Goal

Make what's already built safe and easy for writers who are wary of technology, before the next big features. That means:

- the book is backed up where they choose, and nothing they own is deleted without asking;
- there's a book to try without risking their own;
- help is one click away where they might get stuck;
- every message speaks plainly;
- the app is known to work on a Mac.

**Out of scope** (owner, 2026-11-05):

- **Uploading backups to cloud services directly.** Backups are local; syncing them is left to the author's own sync folder.
- **Changes to restore points.** A count-based limit the author can adjust is a later feature.
- **Signed installers, Apple's developer programme, updates that install themselves.** These need paid accounts, and are revisited later.
- **Import and export, and timelines.** Each gets its own research first.

## What I found in the code

- **Restore points (Milestone 6)** keep earlier versions of each file in the app's own data folder, and thin them by age. They're the author's "Versions". Nothing in this milestone changes them.
- **"Make a backup now" (Milestone 18)** is `copyBook` in `fs-node`. It copies the whole book to "‹Book› backup 2026-11-05" in a folder the author chooses, never over anything. It's only offered inside "Match folder names". The date in the name is in UTC, so a backup made late in the evening can carry tomorrow's date.
- **Settings** has the language, the theme, "Check for updates" and an Advanced group (plain text by default). It has no per-book settings, and nothing about backups.
- **App data** already keeps small JSON records (recent projects, updates, preferences) through `createAppDataFile`. A record of the backups the app made fits the same pattern.
- **The sample books** (`samples/the-salt-orchard`, `samples/מטע-המלח`, about 100 KB each) are used for screenshots and tests, but the app doesn't ship them.
- **Help** is one item in the ☰ menu that opens the guide's front page, plus the "Moving them in →" link on the start screen. Nothing points to a specific guide page from where the author is.
- **CI** builds and tests on Ubuntu and Windows, including end-to-end tests on the packaged app. There's no Mac job and no Mac section in `electron-builder.yml`.
- **Every interface message now has a translator's note** (`qqq.json`), which makes a wording pass practical: each message says where it shows.

## What the author will see

### Backups

**Turning them on.** After the author has written on two different days, a calm notice offers it once:

> **Keep a copy of your book somewhere safe?** Plot Device can copy your book into a folder you choose, once a day.
>
> **Choose a folder…** · **Not now**

"Not now" never asks again. Backups can be turned on, off or moved at any time in **Settings → Backups**, which says:

- **What it does:** "Once a day, if you've changed anything, Plot Device copies your whole book into this folder. Each copy is a folder named with the book's title, the date and the time."
- **Where to keep it:** "To keep a copy off this computer, choose a folder that already syncs online, such as your Google Drive, Dropbox, OneDrive or Obsidian Sync folder. Plot Device doesn't upload anything itself." Folders it finds on the computer are offered by name ("Google Drive", "Dropbox"), with **Choose another folder…** for anything else, including a USB drive.
- **What it doesn't do:** "Plot Device never deletes these copies. They will add up over time, so check the space in that folder now and then, or turn on a clean-up below."
- **The last backup:** "Last backup: today at 14.30", with **Open the folder** and **Back up now**.

**Clean-up, only if the author turns it on** (off at first):

- "Remove backups older than [6] months", or "Keep only the newest [30] backups".
- It applies only to copies the app made automatically, never to the newest one, and never to a "Back up now" copy.
- When it removes any, the app says so in a notice ("2 old backups were removed from Dropbox/Plot Device backups").

**Names:** "The Salt Orchard backup 2026-11-05 14.30", in local time. ("14.30" because Windows can't use ":" in names.) A second copy in the same minute adds " 2".

**In the book menu:**

- **Back up now**, the same as "Make a backup now", moved here from "Match folder names", where it also stays;
- **Restore from a backup…**;
- a quiet line under the book's name, "Backed up today at 14.30", or "Not backed up yet" while backups are off.

**When something is wrong,** the author is told, never silently skipped:

- "Your backup folder can't be found. Is the drive connected?" with **Choose a folder…**;
- "The last backup couldn't be made: there's no space left in that folder."

### Restore from a backup

- **A list of the backups found in the backup folder,** newest first, with their dates. That includes "Back up now" copies and any copy of this book in that folder, matched by the book's id in its `project.md`.
- **Choosing one shows what would change** before anything does: "4 chapters and 2 pages are different, 1 chapter is new since then."
- **Restore** first backs up the book as it is now ("‹Book› before restoring 2026-11-05 14.30"), then puts the backup's files back. Restoring is therefore always reversible: the "before restoring" copy is in the list.

### A book to try

- **"Try a sample book"** on the start screen opens "The Salt Orchard", in the interface's language.
- It's a copy in the app's own data, so it can be explored, changed and broken. It's marked "Sample" in the top bar and in Recent projects.
- **"Start the sample over"** in its book menu brings back the original.

### Help where it's needed

- **A small "?"** beside the controls that need explaining, opening the right guide page in the interface's language:
  - Kinds of pages;
  - Match folder names;
  - Versions;
  - Plain text;
  - Tidy tags;
  - Export;
  - Backups;
  - the outline guide.
- **The ☰ menu's "Help and documentation"** stays as it is.

### Plain wording

A pass over every message, using the translator notes:

- errors say what happened, that nothing was lost (when true), and what to do next;
- no word an author wouldn't use ("file system", "revision", "parse", "journal");
- the English is changed here, and the Hebrew changes go on the review list for the owner.

### On a Mac (CI only)

- **CI builds the Mac app**, unsigned, on `macos-latest`. The unit, end-to-end and packaged-app tests run there too.
- **Nothing is offered for download.** The release workflow is unchanged until signing is decided.
- **The guide doesn't mention the Mac** yet.

### Writer sessions

- **A session guide** in English and Hebrew (`docs/research/writer-sessions.md`): the nine tasks from `UX_SPEC.md`, plus backups and the sample book.
- **What to watch for, and a short form to fill in after each session.**
- **You run the sessions,** and the findings come back as issues.

## Decisions (proposed)

1. **Backup settings are app-wide:** one folder for all books, a subfolder per book: "Plot Device backups/The Salt Orchard/…". When the folder is chosen, the app suggests creating "Plot Device backups" inside it, so backups don't scatter among the author's own files.
2. **"Once a day"** means that at the first moment after 24 hours since the last automatic backup when the book has changed, the app makes a copy:
   - while the book is open, checked every hour;
   - or when the book closes;
   - or at the next opening, if the app was closed in between.
   "Changed" compares a fingerprint of the book's files (names and revisions) with the one recorded at the last backup.
3. **The app keeps a record** of the automatic backups it made, in app data (`backups.json`): book id, path, time and fingerprint. Clean-up only ever removes paths in this record, and checks that each one is still a book folder with the same id before removing it.
4. **Copies reuse `copyBook`,** extended with the time, local-time names and a progress-free background run. A copy is written under a temporary name and renamed when complete, so a half-made copy never looks like a backup.
5. **Restore** is a journalled operation (ADR 0005, a new `restore-backup` operation):
   - the "before restoring" copy comes first;
   - then each file is written from the backup;
   - files that weren't in the backup are moved into the "before restoring" copy rather than deleted;
   - the open session reloads afterwards.
6. **Finding sync folders:** known locations for each system (Google Drive, Dropbox, OneDrive, iCloud Drive on a Mac, Obsidian vaults the author has opened). They're offered only when they exist. Nothing is read from those services or their settings beyond the folder existing.
7. **The sample book ships as an extra resource** and is copied into app data on first use. "Start over" replaces that copy after asking. It never goes in Documents.
8. **The "?" links are a small component** with a message key for its accessible name ("Help: Kinds of pages") and a guide path, opened in the browser like the other guide links.
9. **The Mac in CI:** a `mac` section in `electron-builder.yml` (dmg, `identity: null`) and `macos-latest` in the CI matrix. The release workflow is unchanged.

## Files

- **Domain:**
  - new `backups/backup-schedule.ts`: whether a backup is due, the fingerprint, the names;
  - new `backups/backup-cleanup.ts`: which recorded backups an opted-in rule removes, never the newest.
- **Application:**
  - ports for the backup folder and the backup record;
  - new `backups/backup-session.ts`: schedule, run, clean up, restore, last status.
- **Storage:** restoring a book, through the journal.
- **fs-node:** `copy-book.ts` (time in names, temporary name then rename); finding sync folders; the backup record file.
- **Contracts:** backup settings and status views; restore requests and previews; preferences (the backup folder, clean-up rules, whether the offer was shown).
- **Desktop:** the backup IPC; the hourly check and the check on closing; the sample book as an extra resource; `electron-builder.yml` (mac).
- **Interface:**
  - `SettingsDialog.vue` (Backups);
  - new `BackupOffer.vue`, `RestoreDialog.vue` and `HelpLink.vue`;
  - `TopBar.vue` (Back up now, Restore, the backup line);
  - `WelcomeView.vue` (Try a sample book);
  - the "?" beside the controls listed above.
- **Words:** `en.json`, `he.json` and `qqq.json`: backups, restore, the sample, help links, the wording pass.
- **CI:** `.github/workflows/ci.yml` (macos-latest).
- **Guide:** a new page, "Backups and restoring", in English and Hebrew; the sample book in "Your first book"; screenshots.
- **Docs:** `docs/research/writer-sessions.md` (new, English and Hebrew), `UX_SPEC.md`, `DOMAIN_AND_FILE_FORMAT.md` (backups never in the book folder), an ADR 0005 note (restore), the Hebrew review list, Results.

## Tests

Stated before coding. Backups and restore are test-first.

- **Schedule:**
  - due after 24 hours only if the book changed;
  - not due twice in a day;
  - due at the next opening after the app was closed;
  - the fingerprint changes when a file changes, and not when nothing did.
- **Names:**
  - local time, with " 2" for a second copy in the same minute;
  - Hebrew titles;
  - names Windows can't use are never produced.
- **Copies:**
  - never into the book itself, and never over anything;
  - a copy that fails halfway leaves no folder that looks like a backup.
- **Clean-up:**
  - removes nothing unless a rule is on;
  - removes only recorded automatic backups of that book, never the newest one and never a "Back up now" copy;
  - skips a recorded path that's gone or that holds another book;
  - tells the author what it removed.
- **Restore:**
  - the preview lists exactly the files that differ;
  - the "before restoring" copy is made first, and restoring from it gives back the book byte for byte;
  - a crash halfway recovers from the journal;
  - files not in the backup end up in the "before restoring" copy, never deleted.
- **Missing folder:** a backup folder that's gone, or full, gives the right message and no partial copy.
- **Sample book:** opens in both languages, shows as a sample, and "Start over" restores it byte for byte.
- **Help links:** every "?" opens a guide page that exists, in English and Hebrew (checked against the site's pages).
- **End to end:**
  - turn backups on from the offer;
  - write, and see a backup after a simulated day;
  - restore it and undo that restore;
  - the sample book;
  - a "?" link;
  - Hebrew throughout.
- **Mac:** the existing suites pass in CI on `macos-latest`.

## Work order

1. The Mac in CI, first, since it can surface problems in everything else.
2. Backups: schedule, copies, the record and clean-up (domain and fs-node, test-first); then Settings, the offer and the book menu.
3. Restore, through the journal, test-first.
4. The sample book.
5. Help links and the wording pass.
6. The session guide, the user guide, screenshots, Results.

## Open questions

1. **When to offer backups:** after the author has written on two different days (recommended), or the first time they close a book they've written in.
2. **The backup folder:** one for all books, each in its own subfolder (recommended), or chosen separately for each book.
3. **Restore puts the backup's files back in place,** after copying the current book aside (recommended). Or it never touches the current book, and opens the backup as a separate copy, which is safer but leaves two books with the same title.
4. **The sample book is changeable,** with "Start over" (recommended), or read-only.
5. **The wording pass changes English messages now** and lists Hebrew changes for your review (recommended). Or both wait for your translation round.
