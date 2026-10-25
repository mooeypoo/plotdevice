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
