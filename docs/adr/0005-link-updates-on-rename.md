# ADR 0005: Update only the links that resolve to the moved file, and verify every edit

**Status:** accepted

## Context
Renaming or moving a file must keep links to it working across the project (`docs/file-format.md`, "Links"). Links come in several forms (`[[Name]]`, `[[folder/Name]]`, `[[Name|shown]]`, `[[Name#Heading]]`, `![[Name]]`), sit in both frontmatter and prose, and names can be shared by several files (a character and a location both called Marrow). Changing a link the writer didn't mean, or reformatting a file, would damage it.

## Decision
- Resolve every link with the same link index the app reads with. Change a link only if it resolves to the moved file. In frontmatter, each key's expected type (`part` → part, `pov`/`characters` → character, `location` → location) breaks ties; prose links get no hint, so an ambiguous prose link stays as written.
- Keep the link's form: a name link gets the new name; a path-form link keeps the same number of trailing folders; shown text, heading, block, and embed are kept.
- Replace only the characters of each link: in the body, outside code; in frontmatter, inside each key's value (never in comments). Then re-parse the frontmatter and check that it equals the old values with only those links changed; otherwise the file is skipped.
- Plan every edit before moving anything. Move the file first, never over an existing file (a case-only rename goes through a temporary name). Then write each linking file atomically, but only if its bytes still match the plan. Skipped files are reported to the writer.

The code is `src/main/infrastructure/links/relocate-entry.ts`, with `markdown/link-rewriter.ts` and `markdown/frontmatter-link-rewriter.ts`.

## Consequences
- A rename never changes a byte outside the links it updates, and never guesses at an ambiguous prose link.
- Markdown links (`[text](file.md)`) aren't rewritten yet (see "Later" in the roadmap).
- Each rename reads every markdown file in the project. That's fine at novel scale; an index from the Phase 4 watcher can replace the scan later.
