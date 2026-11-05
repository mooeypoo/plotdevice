# Milestone 20: Ready for writers

Status: **Built** (2026-11-05). Approved with the owner's answers below and `fflate` for zips. See [Results](#results). Direction from the "Change of order" section of `roadmap-16-approachable-studio-and-timelines.md`, with the owner's decisions on backups, restore points and installers (2026-11-05).

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

**Each book has its own backups,** in a folder the author chooses for that book. One book can be backed up to Dropbox and another to a USB drive. When choosing, the folder chosen for the last book is offered first.

**Each backup is one zip file:** "The Salt Orchard backup 2026-11-05 14.30.zip", in local time. ("14.30" because Windows can't use ":" in names.) A second backup in the same minute adds " 2". A zip is one tidy file per backup, which a sync folder uploads easily and any computer can open.

**Turning them on.** The first time the author closes a book that has some content (some writing, and at least two pages under World), a calm notice offers it once:

> **Keep a copy of this book somewhere safe?** Plot Device can save a backup of the book once a day, into a folder you choose.
>
> **Choose a folder…** · **Not now**
>
> You can turn backups on or off at any time from the book menu, under **Backups…**.

"Not now" doesn't ask again for that book.

**"Backups…" in the book menu** holds everything about this book's backups, and says:

- **What it does:** "Once a day, if you've changed anything, Plot Device saves a backup of the whole book into this folder, as one zip file named with the book's title, the date and the time."
- **Where to keep it:** "To keep a copy off this computer, choose a folder that already syncs online, such as your Google Drive, Dropbox, OneDrive or Obsidian Sync folder. Plot Device doesn't upload anything itself." Folders it finds on the computer are offered by name ("Google Drive", "Dropbox"), with **Choose another folder…** for anything else, including a USB drive.
- **What it doesn't do:** "Plot Device never deletes these backups. They will add up over time, so check the space in that folder now and then, or turn on a clean-up below."
- **The last backup:** "Last backup: today at 14.30", with **Open the folder** and **Back up now**.
- **Clean-up, only if the author turns it on** (off at first):
  - the choices are "Remove backups older than [6] months" or "Keep only the newest [30] backups";
  - it applies only to backups the app made automatically, never to the newest one, and never to a "Back up now" one;
  - when it removes any, the app says so in a notice ("2 old backups of The Salt Orchard were removed").

**In the book menu**, besides **Backups…**:

- **Back up now**, which saves a zip in the book's backup folder. If the book has no backup folder yet, it asks for one first. "Match folder names" uses the same thing.
- **Restore from a backup…**.
- A quiet line under the book's name: "Backed up today at 14.30", or "No backups yet".

**When something is wrong,** the author is told, never silently skipped:

- "The backup folder for The Salt Orchard can't be found. Is the drive connected?" with **Choose a folder…**;
- "The last backup couldn't be saved: there's no space left in that folder."

### Restore from a backup

- **A list of the backups in the book's backup folder,** newest first, with their dates. It includes "Back up now" backups, and any other backup of this book found there, matched by the book's id in its `project.md`.
- **Choosing one shows what's different** before anything changes: "4 chapters and 2 pages are different, and 1 chapter is new since then."
- **Then the author chooses how:**
  - **Open it as a separate copy:** the backup becomes a book of its own, beside this one, named "The Salt Orchard (2026-11-05 14.30)". The current book isn't touched. This is the safest choice.
  - **Replace this book with it:** a plain warning comes first.
    > This replaces what's in The Salt Orchard now with the backup from 5 November at 14.30. Before it does, Plot Device saves a backup of the book as it is now, so you can go back to it from this same list. The backup you're restoring stays where it is too.
    >
    > **Replace** · **Cancel**
- Either way, nothing is deleted: the backup stays, and replacing first saves the current book as a backup ("The Salt Orchard before restoring 2026-11-05 14.30.zip").

### A book to try

- **"Try a sample book"** on the start screen opens "The Salt Orchard", in the interface's language.
- It's a copy in the app's own data, so it can be explored, changed and broken. It's marked "Sample" in the top bar and in Recent projects.
- **"Start the sample over"** in its book menu brings back the original sample, after asking, without making it sound alarming:
  > **Start the sample over?** This erases everything in the sample book, including what you wrote and any pages and outlines you added or changed, and puts back the original sample. Your other books stay exactly as they are.
  >
  > **Start over** · **Cancel**

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
- the English is rewritten now, so it can be relied on as the source when translating. The Hebrew messages it affects go on the review list for the owner's translation round.

### On a Mac (CI only)

- **CI builds the Mac app**, unsigned, on `macos-latest`. The unit, end-to-end and packaged-app tests run there too.
- **Nothing is offered for download.** The release workflow is unchanged until signing is decided.
- **The guide doesn't mention the Mac** yet.

### Writer sessions

- **A session guide** in English and Hebrew (`docs/research/writer-sessions.md`): the nine tasks from `UX_SPEC.md`, plus backups and the sample book.
- **What to watch for, and a short form to fill in after each session.**
- **You run the sessions,** and the findings come back as issues.

## Decisions (proposed)

1. **Backup settings belong to each book,** kept in the app's own data by the book's id (never in the book's folder): the folder, the clean-up rule, whether the offer was shown. The folder chosen last is the default the next time a folder is chosen.
2. **A backup is a zip of the book's folder,** written under a temporary name and renamed when complete, so a half-written zip never looks like a backup. Writing and reading zips needs a library: **`fflate`** is proposed (MIT, no dependencies, about 30 KB, used in the main process only). It goes into the third-party licence list like the others.
3. **"Once a day"** means that at the first moment after 24 hours since the last automatic backup when the book has changed, the app saves a backup:
   - while the book is open, checked every hour;
   - or when the book closes;
   - or at the next opening, if the app was closed in between.
   "Changed" compares a fingerprint of the book's files (names and revisions) with the one recorded at the last backup.
4. **"Some content", for the offer:** at least one chapter with writing and at least two pages under World, checked when the book closes.
5. **The app keeps a record** of the automatic backups it made (`backups.json` in app data): book id, path, time and fingerprint. Clean-up only ever removes paths in this record, and checks that each is still a backup of the same book (its `project.md` id) before removing it.
6. **Restore:**
   - **As a separate copy,** the zip is unpacked into a new folder beside the book, never over anything, and then opened. The copy keeps the book's id, which the app already handles for two copies of one book.
   - **Replacing** is a journalled operation (ADR 0005, a new `restore-backup` operation). The "before restoring" backup is saved first. Then each file is written from the backup, and files that weren't in the backup are removed only because that backup already holds them. The open session reloads afterwards.
7. **Finding sync folders:** known locations for each system (Google Drive, Dropbox, OneDrive, iCloud Drive on a Mac, Obsidian vaults the author has opened), offered only when they exist. Nothing is read from those services beyond the folder existing.
8. **The sample book ships as an extra resource** and is copied into app data on first use. "Start over" replaces that copy after asking. It never goes in Documents.
9. **The "?" links are a small component** with a message key for its accessible name ("Help: Kinds of pages") and a guide path, opened in the browser like the other guide links.
10. **The Mac in CI:** a `mac` section in `electron-builder.yml` (dmg, `identity: null`) and `macos-latest` in the CI matrix. The release workflow is unchanged.

## Files

- **Domain:**
  - new `backups/backup-schedule.ts`: whether a backup is due, the fingerprint, the names;
  - new `backups/backup-cleanup.ts`: which recorded backups an opted-in rule removes, never the newest.
- **Application:**
  - ports for the backup folder and the backup record;
  - new `backups/backup-session.ts`: schedule, run, clean up, restore, last status.
- **Storage:** restoring a book, through the journal.
- **fs-node:** `copy-book.ts` becomes `backup-book.ts` (zips with `fflate`, local time in names, temporary name then rename, unpacking); finding sync folders; the backup record and per-book settings files.
- **Contracts:** per-book backup settings and status views; restore requests, previews and the two ways to restore.
- **Desktop:** the backup IPC; the hourly check and the check on closing; the sample book as an extra resource; `electron-builder.yml` (mac).
- **Interface:**
  - new `BackupsDialog.vue` ("Backups…"), `BackupOffer.vue`, `RestoreDialog.vue` and `HelpLink.vue`;
  - `TopBar.vue` (Backups…, Back up now, Restore, the backup line, Start the sample over);
  - `MatchFolders.vue` (Back up now, as a zip);
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
- **Zips:**
  - never into the book itself, and never over anything;
  - a zip that fails halfway leaves nothing that looks like a backup;
  - unpacking a backup gives the book back byte for byte, Hebrew names and BOMs included.
- **Per book:** two books back up to two different folders; the last folder chosen is offered first.
- **The offer:** shown once, on closing a book with writing and at least two World pages; never for an empty book; never again after "Not now".
- **Clean-up:**
  - removes nothing unless a rule is on;
  - removes only recorded automatic backups of that book, never the newest one and never a "Back up now" copy;
  - skips a recorded path that's gone or that holds another book;
  - tells the author what it removed.
- **Restore:**
  - the preview lists exactly the files that differ;
  - "as a separate copy" never touches the current book or writes over anything;
  - "replace" saves the "before restoring" backup first, and restoring from it gives back the book byte for byte;
  - a crash halfway through replacing recovers from the journal.
- **Missing folder:** a backup folder that's gone, or full, gives the right message and no partial copy.
- **Sample book:** opens in both languages, shows as a sample, and "Start over", after confirming, restores it byte for byte.
- **Help links:** every "?" opens a guide page that exists, in English and Hebrew (checked against the site's pages).
- **End to end:**
  - turn backups on from the offer;
  - write, and see a backup after a simulated day;
  - restore it both ways, and undo a replace from the "before restoring" backup;
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

## Owner's answers (2026-11-05)

1. **The offer** comes when the author closes a book that has some content (some writing and a couple of World pages), and says where to turn backups on later.
2. **Each book chooses its own backup folder,** with the last folder chosen offered first. The folder holds the book's backups as zip files.
3. **Restore asks:** open the backup as a separate copy, or replace the book, with a plain warning that says a backup of the current book is saved first and the restored backup stays.
4. **The sample book is changeable,** with "Start over" behind an "are you sure?" that explains plainly what it does.
5. **The English is rewritten now,** to be a reliable source for translating; the Hebrew follows in the owner's translation round.

## Results

### What the author can do

- **Keep backups of each book.**
  - **Where:** in a folder they choose for it ("Backups…" in the book menu), with Google Drive, Dropbox, OneDrive or iCloud Drive offered by name when found.
  - **When:** once a day, if the book changed, as one zip named with the title, date and time.
  - **Deleting:** nothing is deleted unless the author turns on a clean-up, and then only daily backups the app made, never the newest. A notice says what was removed.
- **Be offered backups once,** when leaving a book with some writing and pages: closing the window, or opening another book.
- **See and save backups:** "Backed up ‹date›" under the book's title in its menu, and **Back up now** at any time.
- **Restore,** after seeing what differs:
  - as a separate copy, which opens from the notice;
  - or in place, after a plain warning, with the book as it was saved first as a "before restoring" backup.
- **Try a sample book** from the start screen, change anything, and **Start the sample over…** after a clear confirmation.
- **A "?" beside the things that need explaining,** opening the guide in the interface's language.
- **Read plainer English everywhere:** 57 messages rewritten, so errors say what happened and what to do next.
- **Run on a Mac:** CI builds and tests the Mac app, unsigned.

### Changed from the plan while building

- **Newer files are kept when restoring in place.** A chapter added since the backup stays, outside the contents, instead of being removed. The journal needs no "delete" step, and restoring never deletes anything.
- **Backup settings belong to the book's folder, not just its id.** A copy opened from a backup has the same id but is a book of its own, so it starts with no backups. The cost: a book moved to another folder is asked again.
- **The restore list matches backups by name** ("‹Book› backup …", "‹Book› before restoring …") and by the app's own record. It doesn't open every zip to read its id, which would be slow with many backups. A backup made under an earlier title shows only if the app recorded making it.
- **Obsidian isn't detected,** because that would mean reading its settings file. The explanation still names Obsidian Sync.
- **The guide's old "Backups" page** described earlier versions. That moved into "Earlier versions", and "Backups" now describes backups: one name per concept.
- **The "?" links** are on Backups, Kinds of pages, Match folder names, Versions, Tidy tags, the outline guide and the plain-text setting. Export has none, because nothing on screen stays open to put it beside.
- **"Make a backup now" in Match folder names** became **Back up now**: the same zip, in the book's backup folder.

### Found and fixed by the tests

- **A backup's text lost its leading BOM** when read back, so restoring would have changed the file. It's kept now.
- **A restored copy shared the original's backup settings** (see above).
- **The sample book would have been offered backups** whenever the author left it. It never is now.
- **On a Mac, three end-to-end tests pressed Ctrl+Z,** but undo there is ⌘Z. The tests now use the platform's key.

### Tests

- **Domain:** when a backup is due, fingerprints, names (local time, Hebrew, characters Windows refuses), clean-up rules and copy names.
- **Zips:** byte-for-byte round trips with BOMs and Hebrew names; nothing written outside the new folder ("../" in a zip); never over a file; a missing folder.
- **Restore in place:** byte-identical, brings back removed files, keeps newer ones, and recovers from a crash halfway.
- **The backup session on real folders:** the offer, the daily schedule, clean-up only when on, a missing folder, list, preview, and both ways to restore.
- **IPC:** only folders the host offered; only backups it listed; the offer's answer.
- **End to end:**
  - turning backups on;
  - the menu note;
  - restoring in place and back again;
  - a separate copy that opens from the notice;
  - the offer on switching books and on closing the window;
  - the sample book and starting it over.
- **CI on macos-latest,** beside Ubuntu and Windows.

### Known limitations

- **Backup file names use the English words** "backup" and "before restoring" in every language. This is on the Hebrew review list.
- **Restoring in place** puts back the book's Markdown files. Other files in the book folder, such as images, are left as they are (a copy restores everything).
- **The writer sessions** are for the owner to run, with `docs/research/writer-sessions.md`.
- **Signing, Apple's developer programme and updates that install themselves** are still for later.

