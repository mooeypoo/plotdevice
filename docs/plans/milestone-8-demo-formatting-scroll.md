# Milestone 8: A demo novel, one code format, and Write remembers where you were

Status: **Complete** (2026-10-26), on branch `milestone-8/demo-formatting-scroll`. Approved by the owner on 2026-10-26. Results are at the end of this document.

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

## Results

| Check | Result |
|---|---|
| `pnpm lint` | OK, now including Prettier's check |
| `pnpm typecheck` | OK |
| `pnpm test` | **804 tests pass** (794 before) |
| `pnpm arch` | **91 checks pass** |
| `pnpm perf` | **4 limits pass** |
| `pnpm build` | OK |
| `pnpm e2e` | **46 end-to-end tests pass** (44 before) |

**What the tests prove:**
- **The demo novels** open with no warnings, missing chapters or mismatched titles. Every page has a description, the outline's cards link to chapters, characters and places, and no link in any file is broken. Breaking one link fails the test.
- **Scroll memory**, in the real app:
  - Each chapter returns to the paragraph that was at the top, after switching chapters, after visiting Story, and after quitting and reopening.
  - Reopening the app in Story, then going to Write, finds the page where it was.
  - Turning off either piece (each chapter's memory, or noting the position when Write is hidden) makes a test fail.
- **Saved positions** are kept per chapter, the 200 most recently visited, and anything unreadable in the settings file is dropped rather than trusted.

**Where the work differs from the plan:**
- **`pnpm demo`**, not in the plan: it runs the app on a fresh temporary copy of a demo, so trying the app never changes the repository.
- **Nothing is needed to restore the page when Write is shown again:** the browser keeps its scroll while Write is hidden, and the editor waits until it is visible to scroll. Only *reading* the position needs care, because a hidden page can't be measured, so it is noted as Write is hidden.
- **A reloaded chapter** (changed in another app) now keeps the paragraph at the top, instead of jumping to the cursor.

**Not done, needs the owner:**
- **Pushing:** this branch, and the CI fix commit before it.
- **Trying the demo** with `pnpm demo` and `pnpm demo he`.

**Next:** the look-and-feel rethink, starting with a conversation.
