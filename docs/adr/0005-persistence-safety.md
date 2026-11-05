# ADR 0005: Persistence safety

Status: **Accepted** (owner, 2026-10-25) · Date: 2026-10-25 · Evidence: `docs/spikes/file-writes.md`

## Context

Writing must never silently overwrite the author's text, whether the competing edit comes from another app or from the app's own overlapping autosaves (`PRD.md` G4, scenario G). Writes must survive crashes. Multi-file operations such as renaming a chapter file must be recoverable. "Saved" must mean saved.

## Decision

1. **Revisions.** A file's revision is the SHA-256 of its bytes. Every write carries the revision it expects (`null` to create).
2. **Two stale checks.** The store refuses a stale write before writing, and again just before the rename, when the new bytes are already durable in the temp file. Writes to one file are serialized inside the process.
3. **Atomic writes use a small in-house writer**, not `write-file-atomic`. It:
   - writes a hidden temp file next to the real target, following symlinks
   - fsyncs the temp file and keeps the file's mode
   - refuses read-only files
   - renames with retries on EBUSY/EPERM/EACCES (Windows)
   - fsyncs the directory (except on Windows)

   Stale temp files are removed when a project opens.
4. **Autosave goes through a per-file queue:**
   - At most one write in flight.
   - Newer content replaces unwritten older content and is never written before it.
   - Each write expects the revision the previous write produced.
   - On a stale or failed write, saving stops, and the newest text is kept for recovery.
   - The status reads "saved" only for a revision the store confirmed.
5. **The manifest is edited by splicing the YAML source**, never by re-serializing it. Unsupported layouts, such as inline `[...]` lists, are refused rather than rewritten.
6. **Multi-file operations go through a journal in OS app data**, keyed by project:
   - The full new contents are written first, then `journal.json` as the commit point, then each step in order.
   - Each step can tell from revisions alone whether it is pending, done, or changed by someone else.
   - On startup, recovery finishes interrupted operations. If anything changed in between, it stops and reports.
7. **Paths.**
   - New paths are validated with Windows rules on every OS.
   - Collisions are checked case-insensitively after NFC normalization.
   - Writes through symlinks that leave the project are refused.
8. **The file watcher only hints.** Changes are classified by revision (the app's own write, an external edit, or a deletion), not by timing.
9. **Backups and journals live in OS app data, not in the project.** A `.plotdevice/` folder is not needed for persistence.

## Consequences

- `write-file-atomic` comes off the dependency list. In return, the custom writer must be verified on Windows (locks, case-only renames, skipped directory fsync) before the Write milestone. That verification is deferred until the owner has access to a Windows machine.
- A small race remains between the last check and the rename. Closing it would need OS locks that other editors don't honour.
- If a project moves to another machine after a crash, its journal stays behind. Missing-file handling (scenario I) covers that case.
- **Open:** before "Rename source file" ships, relinking must also cover reference-style links, `[[wikilinks]]`, and links inside chapters.

## Note (2026-11-04): renaming folders of kinds

From roadmap decision D5 and ADR 0011.

- **Match folder names…** (Milestone 18) is a multi-file operation like "Rename source file": the folder renames, the link updates and the `kinds` patch to `project.md` go through the journal (point 6) as one operation, with an undo.
- **The open item above applies to it.** Before it ships, relinking covers reference-style links, `[[wikilinks]]` and links inside chapters, as well as inline links in outlines, pages and `CONTENTS.md`.
- **"Make a backup now"** in that helper, and the backups to a folder the author chooses (Milestone 22), are copies of the book in a place the author picks. They are separate from the recovery copies and journals of point 9, which stay in OS app data and are never in the project.

## Note (2026-11-05): restoring a backup in place

"Replace this book" (Milestone 20) is a journalled operation, `restore-backup`.
- **Write steps only:** one per Markdown file that differs from the backup, and one per file the backup has that the book no longer has. A write step's `before` may now be `null`, meaning a file that doesn't exist yet.
- **Newer files stay:** files the book has and the backup doesn't are left as they are. A chapter added since the backup stays, outside the contents, so restoring never deletes anything.
- **Undoable:** the book as it was is saved as a "before restoring" backup first, so the restore can itself be undone from the same list.

