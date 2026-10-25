# Phase 0 results

Phase 0 was three isolated, throwaway spikes (plan: `docs/plans/phase-0-architecture-proposal.md` §9). All three are done; their decisions are accepted ADRs. Spike code stays on its own branch and is never merged.

| Spike | Question | Answer | ADR | Code |
|---|---|---|---|---|
| A. Outline round-trip ([findings](outline.md)) | Can outlines be edited structurally without regenerating the Markdown? | Yes: parse for structure and offsets only, edit by splicing. 259 tests, 995 exhaustive moves, 20 seeded random walks. | [0003](../adr/0003-markdown-fidelity-and-outline-mapping.md) | `spike/outline-roundtrip` |
| B. Editor ([findings](editor.md), [testing guide](editor-testing-guide.md)) | Tiptap or CodeMirror 6? | CodeMirror 6, with live preview and Pandoc direction markers written only when needed. 98 automated checks plus owner testing. | [0004](../adr/0004-chapter-editor.md) | `spike/editor` |
| C. Safe writes ([findings](file-writes.md)) | Can saves be atomic, conflict-safe and recoverable? | Yes: revision-checked writes with a custom atomic writer, a per-file autosave queue, splice-only manifest edits, and a journal for multi-file renames. 77 tests, including real SIGKILLs. | [0005](../adr/0005-persistence-safety.md) | `spike/file-writes` |

## What the spikes changed for the next milestone

- **Dependencies:**
  - Removed: `write-file-atomic` (a small in-house writer replaces it).
  - Added: CodeMirror 6, and micromark / mdast-util-from-markdown with GFM.
  - **Pinned:** TypeScript 6.x for Vue packages, since `vue-tsc` doesn't support TypeScript 7 yet.
- **Rules:**
  - Never re-serialize author Markdown or YAML.
  - Offsets are UTF-16 code units, with bytes only at the I/O boundary.
  - Parse outlines once per revision, per `##` section.
  - Two stale checks per write.
  - "Saved" means a confirmed revision is durably on disk.
- **Required work in later milestones:**
  - **Write (Gate 3):**
    - Enter and Shift+Enter paragraph behaviour.
    - Formatting commands.
    - HTML-to-Markdown paste.
    - The Write milestone's acceptance criteria for autosave.
  - **Story (Gate 4):**
    - `###` groups inside columns.
    - "Kept as written" tiles.
  - **Rename source file:** relinking for reference links, `[[wikilinks]]`, and links inside chapters.
- **Dev environment:**
  - Unset `ELECTRON_RUN_AS_NODE`, which VS Code sets.
  - Ubuntu's AppArmor blocks Chromium's sandbox; it needs documenting in `docs/development.md`.

## Are more spikes needed?

**No spike blocks the next milestone (the walking skeleton).** What remains is verification, not unknown design:

| Item | Why it isn't a spike now | When |
|---|---|---|
| Windows: atomic writes under file locks, case-only renames, editor keyboard and IME | The design is known and coded; it only needs running on Windows | Deferred until the owner has a Windows machine; CI on `windows-latest` with the skeleton |
| Screen readers (Orca, NVDA) with the CodeMirror live preview | A manual check, about 15 minutes | Before the Write milestone ships |
| How Obsidian, GitHub and Pandoc render the direction markers | A manual check with `tests/fixtures/chapters/direction-markers.md` | Before the file-format docs are written |
| HTML-to-Markdown paste (Word and Google Docs quirks) | Moderately risky, but small and self-contained | **Optional mini-spike** at the start of Gate 3, or test-first inside it |

## Decisions still open (not spikes)

These are needed before Gate 2:
- **Project format ADR:**
  - manifest shape and the chapter id↔file mapping
  - the human-readable table of contents (`CONTENTS.md` or a managed section of `project.md`)
  - part numbering
  - file discovery
  - documenting the direction markers in `DOMAIN_AND_FILE_FORMAT.md`
- **License:** the owner's decision.
