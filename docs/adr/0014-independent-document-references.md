# ADR 0014: Consult references without replacing the draft

## Decision

Keep a read-only Reference selection independent of the main editor and its
Properties inspector. Codex characters, locations and notes open there by
default; explicit editor actions retain raw Markdown editing in the center.
Manuscript entries also have an explicit reference action. Project links inside
a reference stay in that reference; codex links from the editor or outline open
there, while manuscript links retain main-editor navigation.

Reuse the inert Markdown renderer from ADR 0012 for both Outline and Reference.
Both reading panels share the existing resizable reading width. Keep Outline's
selection separate. Reference selection and per-file scroll positions are
session-local and cleared when changing projects, never written to novel files.

When the referenced file is also being edited, render the current editor draft
and label it as such. Only the main editor saves or edits properties; the
reference neither flushes the draft nor adopts the editor's recovery decisions.
Discard obsolete asynchronous reads and show load errors without stale bodies.

## Why

Looking up a character must not evict the manuscript or change what Properties
describes. Reusing one rendering boundary and one writable editor avoids a
second autosaver, conflicting property versions, and different Markdown behavior.
Two-line character rows use the existing role/alias subtitle; this adds no
summary key or on-disk format changes.

Document tabs and a protected writing target are a separate, approved follow-up.
They must preserve editor history and recovery guarantees, not merely remember
file names in a tab strip.
