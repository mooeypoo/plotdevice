# ADR 0015: One writer, with a protected Writing target

## Decision

Keep one writable editor and autosaver. Its navigation queue flushes and checks
the current draft before adopting another document or removing tabs. Failed
reads, conflicts, missing files and failed saves retain the current draft.
Project exit waits for navigation; window exit is cancelled while it runs.

The first opened manuscript establishes Writing. Subsequent manuscript text
edits move the automatic target; reading and codex edits do not. Pinning Writing
locks that target. **Write here** explicitly chooses and pins another manuscript.
Writing cannot be closed until another manuscript is chosen; other pinned tabs
must be unpinned before closing. A recovered Writing copy inherits its target
and pin state without replacing the original file.

Maintain one reusable preview tab. Keeping, pinning, double-clicking or editing
promotes it; new documents and recovered copies are kept. Opening an existing
tab activates it without reading over its draft. Writing appears first, and
keyboard cycling follows that displayed order. Reference remains independent
(ADR 0014), for quick rendered lookups without editor navigation.

Cache immutable CodeMirror states and reading positions by session tab identity.
On remount, reuse history and selection only if the freshly read text matches;
reconfigure callbacks for the new editor instance. App moves retain identity.
Discard cached state when a tab or project closes. Restoring focus must not
scroll the reader away from the remembered position.

Persist only versioned, validated, project-scoped paths, order, pins, preview,
active document and Writing target in `userData` browser storage. Prune missing
paths on restoration and inactive paths after project refresh, never evicting an
active missing draft. There are no new novel-folder files or format changes.
Tab restoration is not crash recovery: drafts, undo, selection and scroll are
session-only, and reopened documents are read from disk.

## Why

A writer can keep a chapter protected while comparing other chapters or editing
codex pages, then return with one action from any main view. A single preview
limits tab clutter. Keeping only one writable surface preserves existing file
version, recovery and Properties ownership rules without competing writers.
