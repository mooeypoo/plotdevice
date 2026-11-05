# Feature brief: the timeline

Status: **Done.** Researched and designed with the owner on 2026-11-05 (`docs/plans/timeline-design.md`), then planned and built as Milestone 21 (`docs/plans/milestone-21-timeline.md`). This brief was the starting point; what follows is kept as it was written.

## Where it's documented

- **ADR 0012, "Timelines as views of an outline":** the accepted decisions.
  - A timeline reads an outline with the existing mapping: `##` sections are moments, cards are events.
  - No dates are parsed.
  - Moving a card on the timeline is a Board move.
  - Lanes come only from links the author wrote.
  - Time runs from the reading-start side: right in Hebrew, to be validated.
  - Views register themselves.
- **`docs/plans/roadmap-16-approachable-studio-and-timelines.md`, Phase C:** the roadmap's Milestones 20 (Timeline) and 21 (Lanes), including the priority table of later ideas (story vs. book order, several outlines, real dates, a relationship map).
- **`docs/plans/timeline-view.md`** (since replaced by `milestone-21-timeline.md`): a draft milestone plan from 2026-11-05, on hold. It has what was found in the code (the view switch, how views are remembered, the Board's projection and moves), proposed decisions, files and tests, and four open questions.
- **`PRD.md` and `UX_SPEC.md`** mention the timeline as a view of outlines; `UX_SPEC.md` has the RTL rule.

## Still open, for the research

- **Does a timeline without lanes add enough over the Board?** The draft plan recommends building timeline and lanes together.
- **Direction in Hebrew:** check "earlier on the right" with Hebrew writers (the writer sessions in `docs/research/writer-sessions.md` are a chance).
- **Tags on cards** (ADR 0012, decision 4, open): their syntax, and which `#` counts.
- **How it looks:**
  - moments as markers on a line, or as columns;
  - shared cards;
  - chapter labels;
  - long books;
  - narrow windows.
  The Milestone 17 design canvas has the app's current look: https://claude.ai/artifact/Avk17Kgjj5Di3gwozkFHtc
- **What authors actually do with timelines** in other tools (Aeon Timeline, Scrivener, Plottr, Campfire), and what non-technical writers find confusing in them.

## How to start the conversation

Read `AGENTS.md`, ADR 0012, this brief and `docs/plans/timeline-view.md`. Then:
1. research;
2. a design session with mockups, Hebrew in light and English in dark;
3. revise the draft plan for approval.
