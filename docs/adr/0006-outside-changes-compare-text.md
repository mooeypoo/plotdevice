# ADR 0006: Recognize the app's own writes by content, and compare the open entry by text

**Status:** accepted

## Context
The project folder is edited by other programs while the app is open (Obsidian, git, sync tools). The app must notice their changes, never report its own saves back to itself, and never overwrite an outside edit. Two easy approaches fail: ignoring every event for a short time after a save drops a real outside edit made in that window, and treating every version change of the open file as a conflict makes Obsidian's harmless rewrites (CRLF to LF, a frontmatter tweak) interrupt the writer.

## Decision
- Every write and move goes through the atomic writer or `moveFile`, which record a SHA-256 of the bytes (or "moved away") before touching the disk. The watcher ignores an event only while the file still holds exactly those bytes, for at most 10 seconds. Any other content is an outside change.
- For the open entry, the renderer compares the body text on disk (line endings normalized) with what the editor last saved, not the file's version:
  - same text: update the version only, keeping any unsaved typing;
  - new text and no unsaved typing: load it, with a short notice;
  - new text and unsaved typing: the existing conflict banner (keep mine / load the file's version);
  - file gone: keep the text, stop autosave, offer to save it as a new entry or discard it.

## Consequences
- A real outside edit right after an app save is still seen (tested).
- Line-ending conversions and frontmatter-only edits never interrupt writing; body saves keep the new frontmatter because they replace only the body.
- If another program writes byte-identical content within 10 seconds of the app, that write isn't reported, which is harmless because nothing changed.
