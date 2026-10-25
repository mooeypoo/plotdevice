# Plot Device — Agent Implementation Roadmap

## Rule of engagement
Do not ask a coding agent to generate the complete application from this prompt. Work in small reviewed vertical slices; attach tests, architecture checks and demo acceptance to each. UX and specifications override legacy code. No large refactor without an explicit decision record.

## Gate 0 — Product specification review
- Confirm Story/Write vocabulary, outline semantics, project manifest representation, TOC strategy, and MVP set.
- Confirm first-run screens and colored light/dark concept; test with representative nontechnical author tasks.
- Deliver: reviewed PRD and UX flows, list of accepted ADRs.

## Gate 1 — Isolated technical spikes
A. Markdown parser/serializer: nested bullets, drag moves, heading columns, unknown content preservation and external edits.
B. Editor showdown: Tiptap vs CodeMirror 6; EN/HE BiDi, actual document editing, copy/paste, file roundtrip, memory/performance.
C. File operations: manifest-driven order, stale-write detection, atomic safe save, rename/relink prototype.
- Deliver: throwaway prototypes, fixture-based results, specific recommendation. Do not make prototype the production architecture by default.

## Gate 2 — Domain + storage vertical slice
- Create project, write one chapter, save, close, reopen; manifest ordering independent of filenames.
- Run offline domain and storage integration tests; no Vue/Electron in core imports.

## Gate 3 — Write vertical slice
- Electron/Vue, chapter navigator/editor, autosave, focus mode, EN/HE, text direction, light/dark/system themes.
- Test no editor remount on panel/theme changes.

## Gate 4 — Story outline slice
- Create multiple outlines; render Board/Outline/Cards; add/rename/move heading/list items; preserve nested structure; handle unsupported Markdown safely.
- No semantic scene layer, no generalized database board designer.

## Gate 5 — References
- Character/place/note views, explicit references, on-demand search, pin/rearrange reference shelf; no automatic prose rewrites.

## Gate 6 — Reliability and packaging
- Stale-save conflict prompts, recoverable writing, missing files, backups, migration, large fixture performance, keyboard navigation, mixed RTL accessibility, packaging/install tests.

## Per-milestone required evidence
Testing follows `AGENTS.md`, "Testing and quality requirements": each milestone states its testing requirements before coding and reports actual results before completion.

1. Demo of named author workflow.
2. Unit/integration/E2E test results and Markdown before/after fixtures.
3. Dependency-boundary lint/TS checks.
4. Screenshots or videos in English/Hebrew, light/dark.
5. Decisions and known limitations; explicit next gate approval.

### Testing requirements for milestones

Every implementation milestone must identify its relevant automated tests and acceptance criteria.

Testing should be proportional to the feature's complexity and risk, following the testing philosophy in `AGENTS.md`.

Each milestone completion report must include:

- The important behaviors verified.
- The tests executed and their results.
- Any known gaps or deferred testing, with justification.
- Confirmation that architecture checks and type checking pass.

High-risk persistence and data-transformation functionality requires more thorough testing than simple presentation components.

Avoid arbitrary coverage targets, duplicate tests, or tests that primarily assert implementation details.