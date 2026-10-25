# Spike C findings: manifest preservation, safe writes, revisions and recovery

Date: 2026-10-25 · Branch: `spike/file-writes` · Code: `spikes/file-writes/` (throwaway, not for merging) · Plan: `docs/plans/phase-0-architecture-proposal.md` §9

## Verdict

**The design holds.** It combines revision-checked atomic writes, a per-file autosave queue, splice-only manifest edits, and a journal for multi-file renames. Every Spike C criterion passes on Linux. Windows behaviour is simulated, not yet run on Windows.

Two recommendations change the dependency plan:
- **Use a small custom atomic writer instead of `write-file-atomic`.** About 60 lines, no dependency.
- **Edit YAML by splicing**, never by re-serializing with the `yaml` Document API.

## Results

`pnpm test`: **6 files, 77 tests, all passing**, about 8 s (Linux, Node 22.22, ext4). `pnpm typecheck`: clean.

| Criterion (§9) | Result |
|---|---|
| Manifest reorder keeps comments, unknown keys, key order and every other byte | **Pass.** An exhaustive sweep moves every entry to every valid destination in 5 manifest fixtures (block, CRLF, hand-formatted with blank lines and folded text, `{ }` entries, long values). Each move matches the data model, the body is untouched, and CRLF stays CRLF. |
| Move a chapter between parts | **Pass**, including emptying a part and refilling it, which restores the original bytes. |
| Stale writes refused (SHA-256 revision) | **Pass.** Refused both before the write and when an external edit lands while the new bytes are being written. |
| Serialized and coalesced autosaves | **Pass.** 100 rapid saves become about 20 writes, with at most 1 in flight. They're written in typing order, never older after newer, each write expects the previous write's revision, and the last version wins. |
| External edit between queued writes | **Pass.** The next write is refused as stale, the status becomes `conflict` holding the author's newest text, and further typing is kept but not written. |
| "Saved" only for durable revisions | **Pass.** Every "saved" status carries a revision the store confirmed. A failure injected just before the rename gives `failed`, never `saved`, with the original intact and no temp file. |
| Crash safety | **Pass.** 12 real SIGKILLs during 2 MB writes, for each writer: the file was always the old or new version, never partial. |
| Windows: file held open by another program | **Simulated** (EBUSY/EPERM injected). Retries succeed. A file that stays locked gives a `locked` error with the original intact and nothing left behind. Real Windows runs are pending. |
| Symlinks | **Pass.** Writes go through a symlink to its target and keep the link. A symlink that leads out of the project is refused (`outside-project`). |
| Read-only files | **Pass (custom writer).** Refused, file untouched. |
| Path rules | **Pass.** Windows reserved names, trailing dot or space, forbidden characters, `..`, absolute paths and backslashes are rejected. Collisions are detected across case, NFC/NFD (`Noël`), and Hebrew niqqud entered in a different mark order. |
| Rename journal: interrupted at every step | **Pass.** Killed at 9 points (before the commit point, after it, and before and after every file write). Recovery gives byte-identical results to an uninterrupted rename, and running recovery twice does nothing more. |
| Recovery when a file was edited after the crash | **Pass.** It stops with `needs-attention`, names the file, overwrites nothing, and keeps the journal. |
| Own-write detection for the watcher | **Pass.** Classified by revision: our write, someone else's, or deleted. Restoring our exact bytes counts as ours. |

## Findings

1. **The `yaml` library's Document API changes untouched YAML.** Without any edits, `toString()`:
   - converted CRLF to LF
   - re-wrapped folded text
   - changed `[draft, "second pass"]` to `[ draft, "second pass" ]`
   - changed 15 lines of long values

   **Decision:** manifest edits are splices on the YAML source, the same approach as ADR 0003. The YAML parser is used only for structure and offsets. Splicing passed every check above.
2. **`write-file-atomic` falls short in five ways:**
   1. After a kill it leaves *visible* temp files next to the chapter (`chapter.md.1021463253`).
   2. It silently replaces read-only files.
   3. It doesn't fsync the directory, so the rename itself may not survive a power cut.
   4. It doesn't retry Windows sharing violations.
   5. It has no hook just before the rename, so the stale check can only run before the whole write.

   It does follow symlinks, keep mode and owner, and serialize same-file writes in one process. **Recommendation:** a small custom writer that does all of these:
   - writes a hidden temp file next to the real target
   - fsyncs the file
   - keeps the file's mode
   - refuses read-only files
   - re-checks the revision just before the rename
   - retries the rename on Windows locks (6 attempts, about 630 ms)
   - fsyncs the directory
   - cleans up stale temp files when a project opens

   **`write-file-atomic` would then come off the dependency list.**
3. **A stale check before the write isn't enough.** An external save during the write would be overwritten. The store checks again after the new bytes are durable in the temp file, just before the rename. That shrinks the window to microseconds. It can't close completely without OS file locks, which editors like Obsidian don't use.
4. **Writes within the app also race.** Two writes with the same expected revision both pass the check unless the store serializes per file. With serialization, one wins and the other is refused as stale.
5. **The save queue needs a restart guard.** Content that arrives after the write loop ends, but before its cleanup runs, would never be written. The cleanup now restarts the loop when something is pending. This came from code review; no test reproduces the timing.
6. **Crashes leave temp files** with either writer: 9 of 12 kills did. The custom writer's are hidden dot-files, and `removeStaleTempFiles` deletes any older than a minute when the project opens. The age threshold avoids deleting a write in progress from another window.
7. **The journal lives outside the project and holds full contents.** The new content of every file is copied into the journal before the commit point (`journal.json`). So recovery never needs a rename across file systems, and app data can sit on a different disk from the project. Each step is idempotent and can tell its own state from file revisions alone (pending, done, or changed by someone else). Recovery finishes the rename; it doesn't need rollback.
8. **Symlink policy.** Writes through symlinks that stay inside the project are allowed. Writes that would escape it are refused, so a shared project can't overwrite files elsewhere on the author's disk. Reads outside the project aren't blocked in this spike. **Recommendation:** allow them, with a warning.

## Where backups and the journal live (Q6)

**Recommendation: OS app data, keyed by project id.**
- **For:** nothing appears in the author's folder, nothing syncs to Dropbox or gets committed to git, and the journal never depends on the project's file system.
- **Against:** if the project moves to another machine after a crash, the journal stays behind. The worst case is a manifest pointing at a missing or renamed file, which the planned missing-chapter recovery (scenario I) already handles.
- **`.plotdevice/` in the project** is not needed for this.

## Limits of this spike

- **Not run on Windows or macOS.** Windows locks, case-insensitive renames (handled through an intermediate name) and directory fsync being skipped on Windows are coded but unverified. Running on `windows-latest` CI comes with the walking skeleton.
- **Power-loss durability** (fsync ordering) can't be tested here. The writer follows the standard recipe: write, fsync file, rename, fsync directory.
- **The custom writer doesn't restore file ownership.** That only matters when one user writes another user's files.
- **Relinking scope:**
  - It rewrites inline Markdown links in outlines and notes.
  - It doesn't rewrite reference-style links (`[x]: path`), `[[wikilinks]]` (which change when a file name changes), or links inside chapters.
  - Production should cover all of these before "Rename source file" ships.
- **Not tested:** network drives, OneDrive or iCloud placeholder files, and very large projects.
- **The manifest shape is provisional:** entries are maps, and a part has `chapters:`. Inline `[...]` lists are refused, not edited. The final shape belongs to the project-format ADR.
- **Versions:** yaml 2.9.1, write-file-atomic 8.0.0 (comparison only), TypeScript 7.0.2, Vitest 5.0.5, Node 22.22.
