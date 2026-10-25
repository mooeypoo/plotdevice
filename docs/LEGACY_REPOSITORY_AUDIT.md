# Plot Device — Legacy Repository Audit Instructions

## Purpose
The previous repository is reference material and possible source of isolated reusable code, **not** the source of product requirements or UX architecture.

## Instructions for reviewer or coding agent
1. Read `PRD.md`, `DOMAIN_AND_FILE_FORMAT.md` and `ARCHITECTURE.md` first.
2. Inspect legacy repository *read-only* initially. Do not automatically refactor it and do not import dependencies before classification.
3. Produce a dependency map identifying domain, filesystem, Markdown parsing/serialization, IPC, Vue UI, i18n, editor and tests.
4. Classify modules:
   - **Reuse**: behavior and boundaries already fit, strong tests and low coupling.
   - **Extract/adapt**: functionally useful but requires removing dependencies or changing contracts.
   - **Discard**: mismatched UX, scene/file assumptions, large coupling or insecure flows.
5. For every candidate, provide path, responsibilities, dependencies, test coverage, migration effort, and risks.
6. Flag legacy assumptions that conflict with new requirements: scene files, file-driven navigation, board-as-manuscript, UI-to-filesystem direct calls, source-edit-only writer UX, hardcoded LTR, vendor lock-in.
7. Recommend whether a clean repo or a clean worktree/new app package inside the repo is best; focus on clean dependency graphs and Git history value.
8. Do not port any code before a human accepts the recommendations.

## Requested audit output
- One-page repository map.
- Reuse/Adapt/Discard table.
- Test and fixture inventory.
- Technical risks and needed spikes.
- Concrete first vertical slice proposal.

## Decision heuristic
Prefer a clean new app unless legacy modules demonstrably satisfy a new domain/application port without dragging forward old UI and persistence assumptions. Existing Git history and tested pure utilities can still be valuable.
