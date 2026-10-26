# Milestone 8: A demo novel, one code format, and Write remembers where you were

Status: **In progress**, on branch `milestone-8/demo-formatting-scroll`. Approved by the owner on 2026-10-26.

## Goal

Three small things before the look-and-feel rethink:

1. **A demo novel worth showing.** The Salt Orchard grows characters, places, notes and an outline whose cards link to them, so every feature can be tried and shown on a real-looking project. A Hebrew demo sits beside it. Both are invented; neither is the owner's novel.
2. **One code format, enforced.** Prettier formats the code; the lint step and CI fail on unformatted code.
3. **Write remembers where you were scrolled, per chapter.** Switching chapters, or reopening the project, returns each chapter to the paragraph that was at the top of the page, with the cursor where it was.

**Out of scope:** typography settings (later), the look-and-feel rethink (next), Windows, code signing and releasing.

## Decisions

1. **Where the demos live:** `samples/the-salt-orchard/` (English) and `samples/מטע-המלח/` (Hebrew), in the repository. They are separate from `tests/fixtures/`, whose bytes the tests depend on, so the demos can be rewritten freely. A test opens each demo and checks that every chapter in the contents exists and that every link resolves.
2. **What the demo contains:** a prologue, two parts and an epilogue (six chapters); three characters, three places and three notes; one outline with two columns of cards, linking to chapters, characters and places; and links inside chapter text.
3. **Prettier:** the existing setting stays (`printWidth` 140, no semicolons, single quotes). One commit reformats everything and changes nothing else. `pnpm lint` then runs `prettier --check`, so CI enforces it. Test fixtures, samples and docs are left as written.
4. **What "where you were" means:** the paragraph at the top of the page and the cursor, both as positions in the chapter's text, not in pixels, so a different window size or font size still lands on the same paragraph. They are kept per chapter in OS app data, with the recent-projects list, never in the novel's folder (up to 200 chapters per project).

## Work order

1. Prettier: reformat in one commit, then enforce it.
2. The demo novels, with their test.
3. Scroll memory, with unit tests and an end-to-end test.
4. Docs and results.
