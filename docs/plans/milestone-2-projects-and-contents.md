# Milestone 2: Projects and the reading order (Gate 2)

Status: **Complete** (2026-10-25), on branch `milestone-2/projects-and-contents`. Results are at the end of this document.

## Goal

The core can create a project, read and change its reading order and parts, read and save chapter text, and rename a chapter file safely. Everything is stored exactly as `DOMAIN_AND_FILE_FORMAT.md` 0.4 describes, and is proven by tests on real folders.

There is no interface in this milestone (owner decision). Screens arrive with the editor in Milestone 3, on top of these use cases.

**What the core can do at the end:**
1. **Create a project.** Given a location, a title and a language, it writes `project.md`, `CONTENTS.md` and `manuscript/` in a new folder named after the title.
2. **Open a project:**
   - read the details and the contents (parts and chapters, numbered per the project setting)
   - find chapter files the contents doesn't list ("Not in the book yet")
   - find contents entries whose file is missing ("Missing")
   - find contents link text that no longer matches a chapter's title
   - finish any rename that was interrupted by a crash
3. **Change the book:**
   - add a chapter (its file is named from its title) or a part
   - rename either
   - move a chapter, including into or out of a part
   - remove a chapter from the book (the file stays)
   - add an unlisted chapter to the book
4. **Read and save a chapter's text,** revision-checked: a chapter changed outside the app is never overwritten.
5. **Rename a chapter's file (explicit, owner request):**
   - the new name is checked for Windows-unsafe characters, reserved names and collisions
   - the file is renamed, its line in `CONTENTS.md` updated, and every link to it in the project rewritten: inline links, reference links and `[[wikilinks]]`, in chapters, outlines and notes
   - it runs through the crash-safe journal from ADR 0005, so an interruption is finished on the next open
6. **Relink a chapter that was renamed outside the app:** if a missing chapter's `id` turns up in an unlisted file, the core suggests the match; the author confirms, and only then is anything changed.

## What gets built

| Package | New |
|---|---|
| `shared` | `ProjectPath`: forward-slash project paths with Windows-safe validation (reserved names, forbidden characters, NFC and case-insensitive collisions) |
| `domain/project` | Project details and their rules |
| `domain/manuscript` | The book's structure: chapters, optional parts, order, numbering (`continuous`, `per-part`, `none`), file names from titles. Operations: add, move, rename, remove, add to book, rename file. Invariants: a file appears once, parts don't nest, names aren't empty |
| `markdown` (new) | Pure text codecs (ADR 0003): split frontmatter; read and patch it by splicing; parse and edit `CONTENTS.md` by splicing; rewrite links to a renamed file; write new `project.md`, `CONTENTS.md` and chapter files |
| `storage` (new) | Project repository over the `FileStore` and `JournalStore` ports: revision-checked writes queued per file, discovery of unlisted and missing chapters, the rename journal with recovery (ADR 0005) |
| `application` | Use cases for everything above. Ports: `FileStore`, `JournalStore`, `IdGenerator` |
| `fs-node` | `FileStore` (atomic writes, stale-write checks, symlink-escape refusal, stale temp-file cleanup) and `JournalStore` (in the OS app-data folder) |

No changes to `contracts`, `ui-vue` or `apps/desktop` in this milestone.

## Decisions applied

1. **New chapter file names come from the title,** and are never renamed automatically:
   - Latin letters are lowercased and spaces become hyphens: "The Crossing" → `the-crossing.md`.
   - Hebrew is kept as is: "המעבר" → `המעבר.md`.
   - Characters Windows forbids are removed.
   - Collisions, including case and Unicode variants, get `-2`, `-3`, and so on.

   **The author can rename a file explicitly** (point 5 above).
2. **A new project gets a folder named after its title,** inside a location the author picks, never inside an existing project.
3. **A title change writes the chapter file first, then its line in `CONTENTS.md`.** If interrupted, the next open reports the outdated link text and offers the update. File renames, which can break links, always go through the journal.
4. **IDs** (ADR 0008): short random IDs with a type prefix (`ch-k3f9q2`), from the `IdGenerator` port, checked for duplicates when a project opens.
5. **No file watching yet.** That arrives with the editor.
6. **Link rewriting is conservative:**
   - A `[[wikilink]]` is rewritten only when it unambiguously means the renamed file: its name is unique in the project, or it gives the full path.
   - Text inside code is never touched.
   - The rename reports how many links it updated, and in which files.

## Dependencies (approved)

- `yaml`
- `micromark`
- `mdast-util-from-markdown`
- `@types/mdast` (types only)

## Docs

- **ADR 0002, "Architecture and boundaries":** records what Milestone 1 built.
- **ADR 0008, "IDs".**
- **Architecture rules for `markdown` and `storage`,** each with a violation fixture:
  - `markdown` stays pure; no file access.
  - `storage` reaches files only through ports.
- Package READMEs.

## Tests

Domain, markdown and storage are written test-first (`AGENTS.md`).

- **Domain:** every operation and invariant; numbering in all three styles; file names from English, Hebrew, mixed and forbidden-character titles, with collisions.
- **Markdown:** a `CONTENTS.md` fixture set.
  - **Cases:** parts, a prologue and an epilogue, paths with spaces, Hebrew, CRLF, a BOM, extra paragraphs, a broken list.
  - **Properties checked:** opening and saving without edits gives identical bytes; every edit commutes with the model and is local (the Spike A method); frontmatter patches keep comments, unknown keys and CRLF.
  - **Link rewriting:** inline, angle-bracket, reference, titled and fragment links; wikilinks with alias, heading and folder; similar names left alone; code left alone.
- **Storage, on real temporary folders:**
  - Creating a project writes exactly the documented bytes.
  - Every operation writes the expected bytes; reopening gives the same result.
  - A stale `CONTENTS.md` or chapter is refused.
  - Unlisted, missing and outdated-title chapters are found.
  - Unsafe or colliding names are refused.
  - **Rename journal:** killed at every step, with real child processes, then recovered.
- **Scenario tests** (the core half of `PRD.md` scenarios A, E, G, I):
  - create a project, add chapters, save chapter text, reopen, and find everything intact
  - reorder chapters without renaming any file
  - an external edit makes a save refuse rather than overwrite
  - a missing chapter is reported and nothing is changed

## Work order

1. Docs, fixtures and architecture rules.
2. `ProjectPath`, `domain/project` and `domain/manuscript`.
3. `markdown`: frontmatter, `CONTENTS.md`, link rewriting.
4. `fs-node` `FileStore` and `JournalStore`.
5. `storage`.
6. Application use cases and scenario tests; results recorded here.

## Results

| Check | Result |
|---|---|
| `pnpm lint` | OK |
| `pnpm typecheck` | OK |
| `pnpm test` | **255 tests pass**: domain, markdown, fs-node, storage and the earlier packages |
| `pnpm arch` | **20 checks pass**: the new `markdown` and `storage` rules catch their fixtures |
| `pnpm build` | OK |
| `pnpm e2e` | 10 end-to-end tests pass (Milestone 1's; unchanged) |

**What the tests prove:**
- **`CONTENTS.md`:** every chapter was moved to every possible position across 10 byte-exact fixtures (CRLF, a BOM, Hebrew, encoded paths, extra content). Each move matches the domain model and keeps every other line. Moving a chapter to where it already is changes nothing.
- **Storage, on real folders:**
  - Creating a project writes exactly the documented bytes.
  - Moving a chapter touches no chapter file (PRD scenario E).
  - A stale `CONTENTS.md` or chapter is refused, not overwritten (scenario G).
  - Missing chapters are reported, and relinked only on request (scenario I).
  - A chapter's text survives closing and reopening (scenario A, core half).
- **File renames:** a rename updates the file, `CONTENTS.md` and 7 links in two other files, and nothing else. An interruption at each of the 5 points is finished on the next open, with byte-identical results. An interruption followed by an outside edit is reported, and nothing is overwritten.
- **Mutation checks:** removing the stale-contents check, or disabling recovery, makes the corresponding tests fail.

**Where the work differs from the plan:**
- **No separate application use-case functions.** The `ProjectRepository` port is the application's boundary for persistence; wrapping each call in an identical function would add ceremony without logic. Use cases arrive in Milestone 3, with real orchestration: the open project, autosave, and conflict prompts.
- **Relink suggestions use an exact title as well as ids.** `CONTENTS.md` holds no ids, so a missing chapter's id isn't known without a cache. This is recorded in ADR 0006, and the author still confirms every suggestion.
- **The interrupted-rename tests stop the operation in-process**, at named checkpoints, instead of killing a real process. The same journal design survived real SIGKILLs in Spike C, and the in-process version keeps the test suite fast and runnable on Windows.
- **Integration tests live in `packages/storage/test/`** with their own Node-typed config. The package source stays Node-free, which both the architecture rules and the compiler check.

**Later (noted, not in this milestone):**
- A cache of known chapter ids in app data, for id-based relinks after outside renames.
- Live file watching, with the editor (Milestone 3).
- Relinking reference-style links inside `CONTENTS.md` itself; it currently holds only inline links.
- A first look at `ubuntu-latest` moving to Ubuntu 26 in CI (the AppArmor step may change).
