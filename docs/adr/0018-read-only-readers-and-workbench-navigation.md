# ADR 0018: Many read-only readers, one writer, one navigation queue

**Status:** proposed (2026-10-22), not yet approved. Amends ADR 0014 and ADR 0015;
supersedes neither. See `docs/plans/workbench-ui-plan.md`.

## Context

The workbench (ADR 0017) shows several documents at once: Reference, entry cards, peeks,
read-only splits beside the editor, and a board over the outline. ADR 0014 defines one
independent Reference selection. ADR 0015 keeps one writable editor and routes every
document change through its navigation queue. Today the outline panel "steps aside" when
its outline is open in the editor instead of showing the live draft, and the editor store
sets `layout.mainView` directly whenever it navigates.

## Decision

- Keep **one writable editor and one autosaver** (ADR 0015 unchanged). No second writer.
- Generalize Reference into **readers**: any number of read-only renderings, each with its
  own path, request generation, error and session-local scroll position. Every reader
  follows ADR 0014: inert rendering (ADR 0012), stale-load rejection, no flushing, no
  adoption of recovery decisions, and the editor's **live draft**, labelled, when the same
  file is open for editing. The outline view adopts the live-draft rule instead of
  stepping aside.
- **Open beside** creates a read-only split. **Lock** keeps its document on navigation.
  **Write here** on a split is the existing ADR 0015 action through the navigation queue.
- **Mode switches, layout switches and center-view changes run through the navigation
  queue.** They flush and check the draft exactly as a document switch does, and they are
  refused while recovery is pending. The editor store no longer imports the layout store:
  it reports "a document became active" through a port that the workbench subscribes to.
- **Outline writes from the board** (ADR 0020) first flush the editor. They are refused
  while the editor holds an unresolved draft of that outline. After a successful write,
  the editor adopts the new text and version for any open tab of that path, as it already
  does after Properties writes, so the app's own write never becomes a conflict.
- In Plotting mode the outline is editable on the board or as text in the editor, never
  both at once. Switching between them is a navigation.

## Consequences

- Peeks and cards never compete with the writer for versions, autosave or Properties.
- Reader positions and pins are session state; pins persist as project bindings (ADR 0017),
  never as drafts.
- Existing tab, Writing-target and recovery tests stay valid. New tests prove that mode
  switches, layout switches, Write here and board writes never drop a draft or bypass
  recovery.
