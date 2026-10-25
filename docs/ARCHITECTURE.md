# Plot Device — Architecture and Engineering Rules
Version: 0.3 draft

## Non-negotiable boundaries
Hexagonal architecture + DDD-inspired bounded contexts; **domain must not depend on Electron, Vue, Node filesystem, Markdown serialization or web transport**.
- Domain: invariants, entities/value objects and commands over story concepts; pure TypeScript.
- Application: use cases/command and query handlers, transaction boundaries, abstract ports; framework-neutral TypeScript.
- Infrastructure: Markdown parser/serializer, filesystem repositories, OS storage, version/checksum checks, backups.
- Presentation: view models/projections for Board, Outline, Cards, manuscript and references; framework-neutral where possible.
- UI: Vue components and editor integration only; invoke application-facing transport contracts and present view models.
- Platform: Electron main and restricted preload typed IPC; replaceable by HTTP/mobile hosts.

## Contexts (logical, not microservices)
Project/Manifest, Manuscript, Outline, Story Bible, Cross References, Workspace Preferences and Publishing Projection. Keep module boundaries explicit without factories/interfaces for trivial pure helpers.

## Suggested layout
```
apps/desktop/electron/{main,preload}
apps/desktop/renderer/
packages/domain/{project,manuscript,outline,story-bible}/
packages/application/{commands,queries,ports,services}/
packages/markdown-storage/{parsing,serialization,repositories,migrations}/
packages/filesystem-node/
packages/transport-contracts/
packages/presentation/
packages/ui-vue/
packages/editor-vue/
packages/i18n/
tests/fixtures/
docs/adr/
```

## Dependency policy
- Domain imports no other project package outside low-level shared pure types (minimize even that).
- Application imports domain and abstract port definitions; no infrastructure, Vue or Electron.
- Markdown adapters implement ports; adapt schemas to/from domain entities, never leak YAML ASTs into use cases.
- Presentation requests application queries and builds view models, not filesystem reads.
- Vue doesn't import Node `fs`, repository implementation or Markdown serializer.
- Electron main hosts privileged services; preload exposes only validated whitelisted methods with typed schemas; context isolation + sandbox + restrictive content security policy.
- Enforce import boundaries via ESLint dependency rules and TS project references; failures block CI.

## Example command pathways
`MoveOutlineItem(id, destinationSection, index)` -> application -> outline invariants -> outline repository -> targeted Markdown update -> new revision -> view query/projection.
`MoveChapter(id, targetPartId?, index)` -> manuscript order domain -> manifest repository -> atomic update -> derived manuscript outline query refresh.
`OpenReference(id)` -> query/service -> repository -> reference projection -> Vue shelf. No editor remount.

## UI state vs project domain
- UI theme, panel layout, collapsed cards, scroll positions and focus selection never enter story prose/metadata.
- Do not make drag pixel coordinates part of the domain. Board structure is ordered sections/items; layout is presentation.
- Reference shelf can cache selected content without loading all manuscript files.

## Rich-text adapter boundary
- `ChapterEditorAdapter` provides open chapter, content edits, cursor/selection, focus, dirty state, undo/redo and save-on-command interfaces.
- Tiptap vs CodeMirror 6 is **not decided**. Evaluate via POC on writing UX, Markdown fidelity, Hebrew/BiDi, performance and accessibility.
- Tiptap cannot be assumed to round-trip unknown Markdown; CodeMirror must not expose a technical syntax-heavy editor as default unless its writer UX passes tests.
- Editor representation is not authoritative; saved Markdown is. On unsupported constructs, do not silently normalize or delete them.

## Persistence safety
- Load chapter + observed content hash/revision; application write includes expected revision.
- Storage adapter refuses stale writes; use temp+rename atomicity where possible and recovery versions.
- File watchers (optional) are hints, not integrity guarantees.
- Batch filename operations require plan/verify/apply/recovery and link integrity checks.
- Keep schema migrations explicit, versioned, tested with historical fixtures and preceded by backup.

## Performance
- Do not mount all chapters. Lazy read chapter body and deep reference content.
- Cache manifest and small reference summaries; use bounded LRU for open/recent chapters and pinned references.
- Search indexing incremental/cancellable; never block writing cursor on whole-project scanning.
- Instrument large chapter, many outline cards, Hebrew text and project open metrics before setting hard thresholds.

## Localization
- Banana-compatible JSON keyed catalogs (CLDR plural/gender/parameters), with a `translate(key,params,locale)` facade and no gettext/POT translation model.
- Domain stores user-facing prose verbatim and typed language/direction metadata where truly needed; no hardcoded English UI strings.
- RTL isolation is enforced by rendering components, not by mutating story text with directional control characters.

## Code quality and documentation
- Small cohesive functions and modules; descriptive API names; comments explain invariant/tradeoff rather than restating code.
- ADRs for schema, editor, ID strategy, storage transaction behavior and portability compromises.
- Unit tests of pure domain; integration tests of Markdown roundtrip/revisions/migrations; contract tests of transport; Electron/Vue E2E critical paths.
- Fixture corpus: English, Hebrew, mixed direction, malformed frontmatter, CRLF, unknown YAML keys, deep nested lists, large chapters, duplicate IDs, moved files, unsupported Markdown.
- No feature complete until both user-facing behavior and architecture boundary checks pass.
