# ADR 0011: Kinds of pages per project

Status: **Accepted** (owner, 2026-11-04, roadmap decisions D3, D4 and D5) · Amends ADR 0006 · Built in Milestone 18

## In short

Today every project has the same three kinds of pages: Characters, Places and Notes. A novel fits that; a D&D campaign doesn't. It needs NPCs, Locations, Factions, Items and Lore, and calls its chapters sessions.

From Milestone 18, **the author decides what kinds of pages the book has**, from a settings screen, never from a file. The kinds are written in `project.md`, readable by anyone. Without them, a project works exactly as today.

```yaml
---
title: The Sunken Crown
language: en
kinds:
  - folder: characters
    one: NPC
    many: NPCs
  - folder: factions
    one: Faction
    many: Factions
manuscriptUnit:
  one: Session
  many: Sessions
---
```

## Decision

1. **Kinds live in `project.md`** as an optional `kinds` list, in sidebar order. Each kind is a folder (`folder`) and the names the app shows (`one`, `many`), in any language, exactly as typed. Without the key, the kinds are `characters`, `places` and `notes`, with the app's English and Hebrew names.
2. **A kind is identified by its folder.** There is no separate id key. Per-user state that refers to a kind (such as the shelf's chosen tags) is keyed by folder.
3. **All kinds behave the same** (D4): title, other names, description, details, relationships, tags. No kind has fields or views of its own. This is what keeps kinds cheap to add.
4. **`manuscriptUnit` renames "chapter" in the interface only** ("New session", "Session 3"). Files, `CONTENTS.md` and export don't change.
5. **Removing a kind never deletes anything.** Its entry goes; its folder and pages stay, and show in World's "Not sorted yet" tray, where they can be opened, linked and given a kind again. Folders of pages that the project doesn't list show there too, with **Make this a kind…**.
6. **Renaming a kind never renames its folder** (D5). Links never break behind the author's back.
7. **Folder names are matched only when the author asks:** **Match folder names…** previews each rename and the links it updates, refuses what would collide or can't work on Windows, asks for a backup first, and runs as one recoverable operation with an undo (ADR 0005, note of 2026-11-04).
8. **A new kind's folder** is chosen when the kind is added: from its plural name, made safe for every system by the existing path checks, and shown so the author can change it before it is created.
9. **Nothing assumes three kinds.** The app, the project check and the guide for AI assistants (Milestone 13) read the kinds from `project.md`. A folder they don't recognise is reported as unsorted pages, not as a mistake.

## Rejected

| Option | Why not |
|---|---|
| Kinds in a separate file (`kinds.md`, `.plotdevice/`) | Another file to keep in step; `project.md` already holds the project's details |
| An `id` key per kind | Another thing to explain; the folder already identifies it, and the rename helper updates it |
| Renaming the folder with the kind | Breaks links in other apps and in git without warning; surprising for a "just a label" change |
| Kind-specific fields (an NPC's stats, a place's map) | Every kind would need its own forms and tests; the format would stop being simple |

## Older versions

- The new keys are optional and older versions keep keys they don't know, so **`schemaVersion` stays 1** and nothing is migrated (owner, 2026-11-04). The release that brings kinds says so in its notes.
- An older version shows only the three default folders. Pages in other folders, or in folders renamed by **Match folder names…**, are not shown there, but they are never lost or changed.

## Engineering notes

- **`ReferenceKind` becomes data.** Today `'character' | 'place' | 'note'` (`packages/domain/src/references/references.ts`, mirrored in `contracts`), used in about 11 files. It becomes a kind read from the project, with the three built-ins as defaults. Built-in names stay i18n keys; custom names are author text, isolated like any other user string.
- **Frontmatter writes** are targeted patches of the `kinds` and `manuscriptUnit` keys, keeping key order, comments and the body (ADR 0005, point 5).
- **The rename helper** is planned test-first: the preview lists exactly the links that will change; collisions, Windows reserved names and case-only renames are refused with a reason; a failure halfway rolls back from the journal; undo restores names and links byte-identical.
- **Spec impact:** `DOMAIN_AND_FILE_FORMAT.md` (version 0.5), `UX_SPEC.md` (World, "What your world has").

## Consequences

- Templates (Milestone 19) are possible: a template is mostly a `kinds` list and a manuscript unit.
- Timeline lanes (Milestone 21) work for any kind, because they work on links, not on kinds.
- The guide for AI assistants and the project check change with Milestone 18.
