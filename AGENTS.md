# Plot Device — Authoritative Agent Instructions (New Implementation)

> Read `docs/PRD.md`, `docs/UX_SPEC.md`, `docs/DOMAIN_AND_FILE_FORMAT.md`, `docs/ARCHITECTURE.md`, and `docs/IMPLEMENTATION_PLAN.md` before starting. This is a CLEAN BUILD, not a legacy refactor.

## Mission and priority
Plot Device is an approachable writing studio for fiction authors, backed by ordinary local Markdown. Optimize for nontechnical writer experience, portability, reliability, and maintainability, in that order when tradeoffs are otherwise equal. The workspaces are **Story** (working name) and **Write**, used in any order. Planning is never required to write.

Priority of authority: explicit user decisions > current PRD/UX/file-format/architecture/ADRs > this document > agent choices. Legacy source and documentation are **not** specifications. When specs conflict, identify and record the conflict rather than silently resolving it by copying legacy behavior.

## Clean-room migration rule
- Do not import or bulk-copy the previous `mooeypoo/plotdevice` implementation. Do not run migrations from its data model without separate approval.
- Legacy repository may be inspected read-only in a separate folder. Only copy assets after verifying filenames/licenses and only port code following a reviewed extraction proposal (path, dependencies, tests, new responsibility). Reimplement when extraction retains old assumptions.
- Do not copy legacy `src/`, package files, build configuration, `AGENTS.md`, `CLAUDE.md`, UI views, routes, Electron IPC, workbench machinery, or domain contexts wholesale.

## Product invariants
1. One Markdown file per **chapter**, optional parts, no required Scene entity or scene files. Scene separators inside chapter prose are formatting only in MVP.
2. Manuscript order is in a project manifest, **not** filenames or filesystem order. Rename source files only by controlled explicit operation; IDs remain stable.
3. Each author-created outline is ordinary Markdown: `##` sections, primary bullets as items/cards, nested bullets as details. Board, Outline and Cards are **projections**, not separate data stores. Multiple independent outlines are allowed.
4. Outline headings/cards do not automatically mean manuscript chapters/scenes. Cross-references are explicit and optional; moving an outline card never moves prose.
5. All essential author data remains legible and organized without Plot Device; avoid opaque ID-only index files as the sole means of recovering story order.
6. The application owns UX, not authors' text. Never lose unknown Markdown/frontmatter or silently overwrite concurrent external edits.
7. First-class EN/HE UI, RTL/LTR mixed prose, system/light/dark themes. Locale, UI direction, document language and text direction are distinct.

## Architecture / dependency laws
- DDD-inspired logical contexts: Project/Manifest, Manuscript, Outline, Story Bible, References, Workspace, Export. Avoid microservice ceremony.
- Pure TypeScript domain; no Electron, Vue, Node, filesystem, Markdown parser, IPC, UI library, or translation framework imports.
- Application owns commands, queries and ports; imports domain but never infrastructure.
- Infrastructure implements storage ports, Markdown AST/frontmatter adapters, safe file writes and OS services.
- Presentation owns view-model projections, not parsing/storage; UI components render and handle interactions.
- Electron main is privileged host; renderer is sandboxed with context isolation and a restrictive CSP; preload exposes narrow typed validated IPC. No direct `fs` in Vue.
- Enforce these constraints with TS project references and dependency-cruiser (or equivalent static dependency tests) in CI. No exception without ADR.
- Favor simple functions and explicit boundaries, not factories/interfaces for every helper. Use strict TypeScript, `noUncheckedIndexedAccess`; avoid `any`.

## Safety rules learned from legacy work
- Preserve unknown frontmatter fields, key order, comments, body, BOM, line endings and unsupported Markdown wherever possible.
- No-op load/save must be byte-identical. Do targeted patches when feasible, not destructive full document regeneration.
- Use revision/hash compare-before-write; if stale, refuse overwrite and offer recovery. Use atomic write/replace and recoverable backup where possible.
- Treat file watcher events as hints, not as conflict detection; account for app's own writes.
- Normalize project-relative paths with `/`, use safe platform path APIs only in infrastructure. Check case collisions, Windows reserved names, path traversal and symlink escape before writes.
- Never infer links solely from display titles. Validate IDs, duplicate IDs and broken references.
- A failed or invalid parse must not trigger 'repair' writes without user approval.

## Coding conventions
- Vue 3 Composition API with TypeScript, Electron, strict TS monorepo, Vitest, ESLint/Prettier. Select exact versions during scaffold; don't cargo-cult legacy lockfile.
- Tiptap vs CodeMirror **undecided**: run documented spike including RTL/BiDi, Markdown fidelity, keyboard selection, accessibility, performance and pasting before standardizing.
- Banana-style keyed JSON localization; translator facade supports parameters, plural, gender, CLDR as needed; avoid gettext/POT. Use logical CSS properties, isolation for user content and keyboard-accessible drag alternatives.
- Document exported domain/application interfaces concisely. Explain *why* in comments; avoid verbose boilerplate. A short README per bounded context is encouraged.
- No new app feature, cross-context coupling, schema change or dependency without identifying which requirement it serves.

## Quality gates
- Tests: pure domain; Markdown round-trip and targeted edits; stale write and atomic recovery; schema fixtures; typed IPC contracts; critical UI E2E; EN/HE mixed text; theme persistence and editor-not-remounting.
- Reuse a **copy** of any legacy fixture as test-only data after inspecting its contents and license; never make it the new canonical file format.
- Run lint, typecheck, unit/integration tests, dependency boundary checks and production compile before reporting milestone complete. Report exact commands and failures.
- Implement one approved milestone at a time. Begin by listing files to create/change, acceptance tests, and open decisions; obtain human approval before modifying code. Do not auto-build the whole PRD.
- For each milestone, report: functionality demonstrated; tests; architecture boundary compliance; known limitations; ADRs.

## Explicit phase-zero task
Read the docs, propose repo scaffold and 3 short throwaway spikes (outline editing/roundtrip, editor selection, safe manifest writes), and STOP for approval. Do not implement the full app or copy legacy source as the first action.
