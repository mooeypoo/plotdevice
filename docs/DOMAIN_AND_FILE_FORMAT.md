# Plot Device — Domain and Markdown File Format
Version: 0.3 draft — versioned schema details are provisional until spike and ADR review.

## Domain vocabulary
- Project: identity, display metadata, language and manifest version.
- Manuscript: ordered chapters, optionally grouped into parts.
- Chapter: mandatory writing unit, one `.md` file; not inherently composed of named scenes.
- Part: optional ordered chapter grouping, may have name and description.
- Outline: named hierarchical document persisted as Markdown, independent from manuscript hierarchy.
- OutlineSection: heading-derived section of an outline.
- OutlineItem: hierarchical bullet item. Display as card/detail depending on view, not inherently a scene.
- Character / Place / Note: human readable Markdown reference documents with optional metadata.
- Links: explicit typed references by stable IDs where needed; never inferred from display title alone.

## Authoritative information
- Manuscript order: `project.md` manifest; do not infer from file names.
- Chapter prose: `manuscript/*.md` body.
- Outlines: `outlines/*.md` bodies.
- Character/place/note text: dedicated Markdown files.
- Personal theme and locale: OS app data, not project content.
- Layout and pinned items: nonauthoritative app state (`.plot-device/` or OS app data).
- Search indexes, caches and thumbnails: disposable, never authoritative.

## Proposed files
```
Novel Title/
  project.md
  manuscript/
    the-invitation.md
    the-letter.md
  outlines/
    main-story.md
    mayas-arc.md
  characters/
    maya.md
  places/
    family-house.md
  notes/
    loose-ideas.md
  assets/
  .plot-device/
    workspace.json
```

## Provisional `project.md`
```
---
type: project
schemaVersion: 1
id: prj-unique-id
title: The Glass Orchard
language: en
manuscript:
  - id: chapter-a
  - id: chapter-b
---
# The Glass Orchard

## Manuscript

1. [The Invitation](manuscript/the-invitation.md)
2. [The Letter](manuscript/the-letter.md)
```
- A chapter's `id` and path must be resolvable; choose one canonical mapping (manifest records path, or index derives path from frontmatter) and document it before implementation. **The example above intentionally omits a finalized path mapping.**
- Use explicit `kind: part` / `kind: chapter` nodes if optional part nesting is needed; avoid ambiguous ad-hoc YAML shapes.
- Human-readable TOC may be generated under a guarded/managed region, or in a separate `CONTENTS.md`; choose via ADR, never rewrite author's prose outside managed region.

## Provisional chapter
```
---
type: chapter
id: chapter-a
title: The Invitation
---
The letter arrived on a Tuesday.

* * *

Three hours later, Daniel called.
```
- `* * *` is thematic break, **not** a semantic scene identity.
- Don't rewrite files merely to sync chapter display titles except through an intentional rename/title edit.
- Author-owned unknown frontmatter keys and unsupported Markdown segments must be preserved or flagged as not safely editable.

## Provisional outline
```
# Main Story

## Beginning

- The letter arrives
  - No return address
  - Maya recognizes the handwriting
- Daniel returns
  - He needs Maya's help

## Ending

- The family secret is revealed
```
- In default Board: H2 -> columns, first-level list item -> card, descendants -> details.
- Do not conflate board card with manuscript chapter/scene.
- Unknown Markdown blocks: retain; if structural editing cannot round-trip safely, restrict operation with helpful explanation.
- Stable outline item identity is **open**. Position-only IDs are unacceptable for long-lived external links. Evaluate embedded comments, extended attributes or minimally invasive ID encoding with fixtures and Markdown parsers; do not invent a fragile solution mid-feature.

## Advanced filename synchronization (deferred)
- Stable entity IDs independent of title, position and file path.
- Explicit rename source file: validate/collision-check, update canonical path registry, affected managed Markdown links and manifest, log transaction and provide recovery.
- Optional numbered filename sync: preview all renamed files and references, then perform recoverable batch operation. Not on every drag.
- No implicit renames on title change unless user opts in.

## External editing policy
- Normal use is within app; closed-project external edits reread on next open.
- On save compare observed file revision/hash; if changed, stop and offer reload, save copy or comparison/recovery. Never silently overwrite.
- Missing/renamed files: show broken-link list and manual relink workflow; no aggressive guessing.
- Atomic writes where supported; safe temp files/recovery; backup policy documented and tested.
- No concurrent live merging or automatic detection of semantic file edits in v1.

## Parse/serialize contract
- Parse Markdown with source spans and preserve unrelated blocks, whitespace and unrecognized metadata wherever possible.
- Board operations mutate only supported outline constructs; nonrepresentable Markdown requires a warning and non-destructive fallback.
- UTF-8; deterministic line ending policy avoiding irrelevant churn; stable serialization fixture tests.
- Avoid unsafe HTML rendering; sanitize project content for display.
- Every schema change requires migration, backup and fixtures.
