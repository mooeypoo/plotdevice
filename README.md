# Plot Device — practical clean-start guide

1. Create an empty folder for the new project (for example `plotdevice-next`). Initialize Git (`git init`). Do **not** clone the legacy repository into this folder.
2. Copy all files from this starter kit into the new folder following the target layout below. Keep `AGENTS.md` and `CLAUDE.md` at root.
3. Read `docs/COPY_FROM_LEGACY.md`. For day one, copy only *verified* logo/icon master assets into `assets/brand/original/` or `assets/brand/icons/` and write an `assets/brand/SOURCES.md` describing their original path/license. No code is required from the old repo.
4. Copy a *curated* set of old Markdown sample files into `tests/fixtures/legacy/` only if useful. They are examples for compatibility tests, not the new normative schema.
5. Commit the planning baseline before asking an agent to implement (`git add . && git commit -m "docs: establish clean Plot Device product and architecture"`).
6. Ask Claude Code for a **Phase 0 plan only**, including unresolved decisions, scaffold, spikes and tests. Require approval before implementation.
7. Assign Copilot to review the proposed plan against `AGENTS.md`, then approve one small milestone at a time.

## Target initial tree
```
plotdevice-next/
  AGENTS.md
  CLAUDE.md
  README.md
  docs/
    PRD.md
    UX_SPEC.md
    DESIGN_SYSTEM.md
    DOMAIN_AND_FILE_FORMAT.md
    ARCHITECTURE.md
    IMPLEMENTATION_PLAN.md
    LEGACY_REPOSITORY_AUDIT.md
    COPY_FROM_LEGACY.md
    adr/
  assets/brand/original/
  assets/brand/icons/
  tests/fixtures/legacy/
```
Do not create `src/` or `packages/` manually just to imitate the old app. Have the agent propose scaffolding after architectural review. `.gitkeep` files are provided for empty directories.

## First Claude Code prompt
> Read `AGENTS.md` and every referenced document. This is an entirely new implementation. Do not import old source or modify the old repository. For Phase 0 only, produce: (1) proposed monorepo and dependency graph, (2) unresolved decisions/ADRs, (3) small prototype plans for Markdown outline round-tripping, Tiptap vs CodeMirror RTL+fidelity, and safe manifest writes, (4) acceptance tests and commands, (5) exact files you intend to create. Do not code until I explicitly approve.

## Independent Copilot review prompt
> Review the Phase 0 plan **against `AGENTS.md`, `docs/PRD.md`, `docs/DOMAIN_AND_FILE_FORMAT.md`, `docs/ARCHITECTURE.md` and `docs/UX_SPEC.md`**. Identify architecture leakage, accidental legacy assumptions, risky Markdown reserialization, product complexity for nontechnical authors, missing RTL/theme/accessibility tests, and overengineering. Give actionable corrections; do not implement.

## Notes
- New format decisions are provisional where the documents say so. Do not harden them into compatibility commitments without an ADR.
- Naming and logos can be carried forward; old app's UX and data model cannot.
- Use the legacy repository as a read-only comparator, not a source tree.
