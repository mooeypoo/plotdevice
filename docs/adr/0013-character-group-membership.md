# 0013: Discover overlapping character groups from membership

## Decision

Store optional `groups` as text or a list of names in each character's frontmatter.
Discover group names from those files; do not add a central registry to `novel.md`.
Compare trimmed names after NFC normalization and case-folding. Keep the first
spelling for display without rewriting other files.

Groups are character organization, not general tags. Preserve `tags` and groups
on non-character entries as unknown metadata. Malformed memberships remain
read-only with an inspector explanation; never coerce them on a write.

## Consequences

A character may belong to multiple groups. Grouped navigation can repeat a file's
row, while filtered All navigation and the shown count deduplicate files.
No character is copied, reclassified, or removed. Ungrouped is a separate section,
not a reserved group name. Empty groups disappear; persistent empty groups or
group descriptions would require a separate future decision.

Collapse, mode, and filter state belong in per-user preferences keyed by project,
not in the novel. Existing version-1 preferences gain empty character choices
without losing typography, outline width, or binder collapse state.
