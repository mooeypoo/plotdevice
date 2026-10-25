# Milestone 6: Backups, renaming pages, and the compiled book (Gate 6, first half)

Status: **Approved** (owner, 2026-10-25), with the recommended backup timing, retention and compiled format.

## Goal

Gate 6 covers reliability and packaging. This milestone is the reliability half, plus the one MVP feature still missing: **basic compiled manuscript output** (PRD §9, scenario E). Packaging and installers follow in Milestone 7, so each can be reviewed on its own.

**What an author can do at the end:**
1. **Get earlier versions back.** The app keeps backups of the author's files automatically, outside the project folder. A "Versions" view lists a chapter's (or page's, or outline's) earlier versions by time. The author can read one, and restore it, or save it as a copy. Restoring is itself undoable: it backs up the version it replaces.
2. **Compile the book** into one Markdown file. Chapters come in reading order, with part and chapter headings and numbering per the project setting. Frontmatter and direction markers are handled so the result reads correctly in Pandoc. Moving a chapter changes the compiled order without renaming any file (scenario E).
3. **Rename a page's file** (character, place or note), updating every link to it. This reuses the chapter rename and its recovery journal (ADR 0005).
4. **Work on a large book** without slowdowns. The app is checked against a generated project of 150 chapters and 2,000 outline cards: opening the project, switching chapters, moving a chapter, and editing an outline each stay within agreed limits.

**Out of scope (Milestone 7):** installers (AppImage, deb, Windows), the production app identity, upgrade from the old app, and an About screen with licences.

## Decisions I recommend (**Decide** where marked)

1. **When backups are taken** (**Decide**): before the app first changes a file in a session, and then at most every 10 minutes while the author keeps editing it. A backup is the file exactly as it was on disk, byte for byte. Files changed by other apps aren't backed up until the app itself is about to change them. (**Recommended**)
2. **Where, and for how long** (**Decide**):
   - **Where:** in OS app data, per project (ADR 0005, point 9), never in the novel's folder.
   - **How long:** every backup from the last 24 hours, then one per day for 30 days, then one per week for a year. Older ones are removed.
   - **Size:** a typical chapter is about 20 KB, so a year of history for a 100-chapter book stays around 100 MB.

   (**Recommended**)
   ```
   ~/.config/plotdevice/backups/prj-7d2k9q/
     manuscript/the-crossing.md/2026-10-25T18-30-12.md
     manuscript/the-crossing.md/2026-10-25T19-02-44.md
   ```
3. **Restoring** writes the old version back with the same safety as any save. It is refused if the file changed since the author opened the version list, and the version being replaced is backed up first.
4. **The compiled book** (**Decide**):
   - **The format:** one Markdown file. Parts become `#` headings, chapters `##` headings, and chapter text follows unchanged, including direction markers, which Pandoc understands. Chapter frontmatter is left out.
   - **Where:** the author chooses with a save dialog, defaulting to outside the project folder, so the novel's folder isn't cluttered.
   - **Other formats:** none yet. Word and EPUB can come later through Pandoc, with the author's approval of that dependency.

   (**Recommended**)
   ```markdown
   # Part One: Arrival

   ## 1. The Crossing

   The ferry left Szeged an hour late. …
   ```
5. **Renaming a page's file** follows the chapter rule. The author asks for it explicitly; changing the title never renames the file.
6. **Performance limits** on the generated 150-chapter book (CI machines are slower, so CI allows twice these):

   | Action | Limit |
   |---|---|
   | Open the project | under 1.5 s |
   | Switch chapters | under 200 ms |
   | Move a chapter | under 300 ms |
   | Move a card on a 2,000-card outline | under 500 ms |

No new dependencies.

## What gets built

| Package | New |
|---|---|
| `domain` | Backup retention rules (which backups to keep); the compiled book's structure and headings |
| `application` | Backup port and service: back up before change, list, read, restore; compile; generalised file rename for pages |
| `fs-node` | Backups in app data, written atomically; pruning |
| `storage` | Compiling the manuscript from `CONTENTS.md` and chapter bodies; page file rename through the journal |
| `contracts`, `apps/desktop` | Versions, restore, compile (save dialog), rename page file |
| `ui-vue` | A "Versions" panel for chapters, pages and outlines; "Compile book…"; "Rename file…" on pages |
| `tests/fixtures` | A generated large project (a script, not committed bytes) |

## Tests

These follow `AGENTS.md`. Backups, restoring and compiling are written test-first.

- **Domain:** the retention rules at every boundary (24 hours, 30 days, a year, time zones); the compiled headings with each numbering setting, with and without parts, in English and Hebrew.
- **Backups** (real temporary folders):
  - A backup is byte-identical to the file it saves, including BOM and CRLF.
  - It is taken before the first change, and at most every 10 minutes after that.
  - Pruning keeps exactly what the rules say.
  - A crash while backing up never leaves a partial backup.
  - Restoring is refused after a change elsewhere, and backs up what it replaces.
- **Compile:**
  - Reading order and parts come from `CONTENTS.md`, and moving a chapter changes the order (scenario E).
  - Frontmatter is left out; direction markers and unknown Markdown are kept.
  - Missing chapters are reported, never silently skipped.
- **Page file rename:** links in outlines, chapters and other pages are updated. An interruption at each step is recovered on the next open.
- **Performance:** the limits above, measured on the generated project, in CI on Linux and Windows.
- **Desktop, end to end:**
  - **Scenario E:** move a chapter, compile, and the order changed with no file renamed.
  - **Restore:** an earlier version of a chapter is restored, and that restore is undone, through the Versions panel.
  - **Rename:** a page's file is renamed and a card's link to it still works.
  - **Accessibility:** every control is named, in both languages.

## Work order

1. Backup retention rules and the backup store, test-first; backing up before saves.
2. Versions: list, read and restore, with the panel.
3. The compiled book (scenario E).
4. Renaming page files through the journal.
5. The large generated project and performance limits; end-to-end scenarios, docs and results.
