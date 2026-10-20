# ADR 0008: Recover drafts explicitly without undoing intentional outside changes

**Status:** accepted

## Context

An outside edit, move, or deletion may be intentional. Automatically restoring the editor's text
would undo that work. Creating a fresh entry from only the draft body loses metadata; rebuilding
frontmatter from inspector fields loses comments, unknown keys, and formatting.

## Decision

- Extend ADR 0006's text comparison: clean outside edits still load with a notice. Once a conflict
  or missing-file decision is pending, later changes or reappearance never resume autosave.
- Offer Use disk version (read without writing), Save recovered copy, and, only for a readable
  conflicting source, Replace disk text with explicit confirmation and a freshly read version.
  Replacement preserves current disk frontmatter and never requests unconditional overwrite.
  Missing-file dismissal closes the draft without recreating the source.
- Keep exact bytes from successful markdown reads/writes in a project-session recovery adapter.
  Capture pins a known path/version behind an opaque token, not renderer-provided metadata.
  A recent cache holds at most 64 snapshots or 64 MiB (one larger snapshot is allowed); up to eight
  pinned versions survive cache eviction and asynchronous captures. Nothing is persisted secretly.
- Copies combine captured frontmatter with the current body using the existing BOM/line-ending
  helpers. Inspector writes refresh the baseline. Keep placement metadata, including order,
  rather than silently renumbering other chapters; existing warnings report duplicates.
- Choose a Windows-safe, project-wide case-insensitively unique sibling name. Atomically write
  a temporary sibling with `write-file-atomic`, then publish with an exclusive hard link. If the
  destination appears meanwhile, retry a different name; never overwrite it. Missing, escaping,
  or newly nested-project parent folders fail explicitly. Unsupported hard links also fail
  explicitly rather than falling back to a potentially destructive publication.
- Recover edited templates as ordinary notes at the project root, preserving other metadata;
  never replace the active template or hide the copy inside the excluded template folder.
- Serialize decisions and temporarily make CodeMirror read-only without remounting it. Keep
  the draft on failure and block navigation/closing during recovery. A published copy's path
  survives failed listing/opening so retry reuses it; an edited draft gets another separate copy.

## Consequences

- Recovery cannot silently undo outside work, and failures remain visible beside the draft.
- Metadata and formatting remain recoverable even if the original is deleted or moved.
- Existing writes still use optimistic checks, not an operating-system compare-and-swap or a
  cross-process lock. A separate recovered copy is the non-destructive choice.
- Snapshots are session-local, not persistent crash recovery, revision history, or automatic backups.
