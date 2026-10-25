# Milestone 2: Projects and the reading order (Gate 2)

Status: **Proposed, awaiting owner approval.** No code yet.

## Goal

An author can create a project, see and arrange its chapters and parts, and close and reopen it. Everything is stored exactly as `DOMAIN_AND_FILE_FORMAT.md` 0.4 describes, so the same folder makes sense in Obsidian or a file browser.

Writing inside a chapter comes in Milestone 3 (Gate 3, with the CodeMirror editor). Gate 2 does include reading and saving a chapter's text in the core, tested, so the editor plugs straight into it.

**What an author can do at the end, in the app:**
1. Create a project: choose a folder, a title and a language. The app writes `project.md`, `CONTENTS.md` and `manuscript/`.
2. Open a project, or a recent one. The app shows the contents: parts and chapters, numbered per the project setting.
3. Add a chapter (its file is named from its title), add a part, rename either, and move chapters up or down and in or out of parts, using the keyboard or buttons. Drag-and-drop comes later.
4. Remove a chapter from the book. The file stays, and the chapter moves to **Not in the book yet**.
5. See chapter files that the contents doesn't list (**Not in the book yet**, with "Add to the book"), and contents entries whose file is missing (**Missing**, with "Remove from contents").
6. Close and reopen: everything is as it was. Edit `CONTENTS.md` in another app, reopen, and the new order shows.

## Proposal: include a minimal interface (**Decide**)

`IMPLEMENTATION_PLAN.md` describes Gate 2 as core and storage only. I recommend adding the small interface above anyway (**Recommended**), so you can try each behaviour yourself rather than only reading test results. It uses plain lists and buttons; the real Story and Write design comes in Gates 3 and 4.

## What gets built

| Package | New |
|---|---|
| `shared` | `ProjectPath`: forward-slash project-relative paths, with the Windows-safe validation from Spike C (reserved names, forbidden characters, NFC and case-insensitive collisions) |
| `domain/project` | Project details (title, author, language, chapter numbering, id, schema version) and their rules |
| `domain/manuscript` | The book's structure: chapters, optional parts, order. Operations: add, move, rename, remove, add to book. Invariants: a file appears once, parts don't nest, names aren't empty. Chapter numbering (`continuous`, `per-part`, `none`). Chapter file names from titles |
| `markdown` (new) | Pure text codecs following ADR 0003: split frontmatter, read and patch frontmatter values by splicing; parse `CONTENTS.md` with source ranges and edit it by splicing (the Spike A method, rebuilt properly); write new `project.md`, `CONTENTS.md` and chapter files |
| `storage` (new) | Repositories that open, create and change a project through a `FileStore` port: revision-checked, writes queued per file (ADR 0005); detects unlisted and missing chapters |
| `application` | Use cases: create, open, add, move, rename, remove, add-to-book, read and save chapter text. Ports: `FileStore`, `IdGenerator`, `FolderPicker`. Recent projects in the personal settings |
| `fs-node` | `FileStore` on the real file system, using the atomic writer, with stale-write checks and stale temp-file cleanup when a project opens |
| `contracts` | Project calls and their zod schemas |
| `ui-vue` | Welcome screen (new, open, recent), new-project form, contents view with the actions above, warnings in plain words |
| `apps/desktop` | Native folder picker; project calls over IPC |

## Decisions I'll apply unless you say otherwise

1. **New chapter file names come from the title,** and are never changed afterwards:
   - Latin letters are lowercased and spaces become hyphens: "The Crossing" → `the-crossing.md`.
   - Hebrew is kept as is: "המעבר" → `המעבר.md`.
   - Characters Windows forbids are removed.
   - Collisions (including case and Unicode variants) get `-2`, `-3`, and so on.
2. **A new project gets a folder named after its title** inside a location the author picks, never inside an existing project.
3. **Changing a chapter title writes two files:** the chapter's frontmatter, then its line in `CONTENTS.md`.
   - **Order matters:** the title is the authority, so the chapter file is written first.
   - **If the app stops in between:** on the next open it notices the outdated link text and offers to update it. Nothing is lost, because the title already lives in the chapter.
   - The full multi-file journal from ADR 0005 arrives with "Rename source file", where a half-done operation could break links.
4. **IDs** (ADR 0008, to be written): short random IDs with a type prefix (`ch-k3f9q2`, `prj-7d2k9q`), created through the `IdGenerator` port and checked for duplicates when a project opens.
5. **No file watching yet.** Changes made outside the app show on reopen or on a "Reload" button. Live watching (ADR 0005, "hints only") arrives with the editor in Gate 3, where it matters.

## Dependencies

All three were already used in the spikes and are covered by ADR 0003:

| Package | Why |
|---|---|
| `yaml` | Read frontmatter. Edits are splices, never re-serialization (ADR 0005) |
| `micromark`, `mdast-util-from-markdown` (+ `@types/mdast`) | Parse `CONTENTS.md` with source ranges (ADR 0003) |

**Approve?** No GFM extension is needed yet.

## Docs

- **ADR 0002, "Architecture and boundaries":** it records what Milestone 1 built and why.
- **ADR 0008, "IDs":** as in decision 4 above.
- **New architecture rules for `markdown` and `storage`,** each with a violation fixture:
  - `markdown` stays pure; no file access.
  - `storage` reaches files only through the port.
- Package READMEs for `markdown` and `storage`.

## Tests

The approach follows `AGENTS.md`, "Testing and quality requirements". Domain, markdown and storage are written test-first.

- **Domain:** every manuscript operation and its invariants; numbering in all three styles; file names from English, Hebrew, mixed and forbidden-character titles, with collisions.
- **Markdown:** a `CONTENTS.md` fixture set.
  - **Cases:** parts, a prologue and an epilogue, paths with spaces, Hebrew titles, CRLF, a BOM, extra paragraphs, and a broken list.
  - **Properties checked:** opening and saving without edits gives identical bytes; every edit commutes with the model and changes only its own lines (the Spike A method); frontmatter patches keep comments, unknown keys and CRLF.
- **Storage, on real temporary folders:**
  - Creating a project writes exactly the documented files.
  - Every operation writes the expected bytes; reopening gives the same result.
  - A `CONTENTS.md` changed outside the app is refused as stale, never overwritten.
  - Unlisted and missing chapters are found; Windows-unsafe or colliding names are refused.
- **Interface, end-to-end:** create a project in a temporary folder (the picker is replaced by a test hook), add chapters and a part, reorder them, restart, and check both the screen and the exact bytes of `CONTENTS.md`. Then reorder `CONTENTS.md` outside the app, reopen, and check the new order.
- **Fixtures:** `tests/fixtures/projects/salt-orchard/` is updated to the accepted format (`CONTENTS.md` instead of the spike's YAML manifest).

## Work order

1. Docs (ADR 0002, ADR 0008), the fixtures, and the new architecture rules.
2. `ProjectPath`, `domain/project` and `domain/manuscript`, test-first.
3. `markdown`: frontmatter, then `CONTENTS.md`, test-first.
4. `storage` with the `FileStore` port, plus `fs-node`'s `FileStore`.
5. Application use cases, then contracts and IPC.
6. The interface, then the end-to-end tests. Results get recorded here, as for Milestone 1.
