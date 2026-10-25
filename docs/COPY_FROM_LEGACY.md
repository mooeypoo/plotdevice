# Legacy Copy Plan — do not copy old implementation wholesale

Legacy: https://github.com/mooeypoo/plotdevice

## Copy **now**, after reviewing contents
1. **Logo and icon artwork only:** inspect `resources/`, `build/`, and any `src/renderer` static asset directories in your *local clone*. Search for `*.svg`, `*.png`, `*.ico`, `*.icns` with names such as `logo`, `icon`, `mark` or `brand`. Select the original high-resolution/vector master, not a generated low-res or packaged copy. Put approved masters under `assets/brand/original/` and any icons under `assets/brand/icons/`. Preserve provenance in `assets/brand/SOURCES.md`. **No exact logo file pathname has been verified**, so do not guess a particular filename.
2. **Representative fixture files** (optional, test-only): review `fixtures/` including `fixtures/sample-novel/` if present; copy a small curated subset to `tests/fixtures/legacy/` for migration/round-trip behavior, never as normative v1 project output. Scrub private text/secrets if applicable.
3. **Architecture inspiration, not source:** read the legacy root `.dependency-cruiser.cjs`, `AGENTS.md`, and `docs/architecture.md` in place. New `AGENTS.md` and `docs/ARCHITECTURE.md` are authoritative; reimplement current import rules for the new package structure rather than copying the legacy config verbatim.

## Audit before possibly extracting (not day-one copies)
- Outline Markdown parsing/operation algorithms and their corresponding unit tests. Build a path/dependency report and a source-format fixture suite. Extract pure functions only if they don't retain chapter/beat/plot-specific product assumptions.
- YAML/frontmatter format-preserving patch utilities, atomic writes, stale-content protection and guards. Port isolated tested code *only after* adapting the contracts to the v1 project schema.
- Banana-format messages, RTL/BiDi helper tests and mixed-script fixtures. Reuse test cases/ideas before UI implementation. Do not automatically copy legacy translations or Vue components.
- Existing CodeMirror setup only as inspiration for a throwaway editor comparison against Tiptap.

## Explicitly **do not copy**
`src/` recursively, old `AGENTS.md`, `CLAUDE.md`, `package.json`, `package-lock.json`, Electron/Vite configuration, existing routing/workbench/UI components, legacy manifest/domain model, old screenshots as active branding, or an entire fixture directory without reviewing it.

## Local discovery commands (run in your legacy checkout)
```bash
find resources build src -type f \( -iname '*logo*' -o -iname '*icon*' -o -iname '*brand*' \) -print 2>/dev/null
find resources build src -type f \( -iname '*.svg' -o -iname '*.ico' -o -iname '*.icns' \) -print 2>/dev/null
find fixtures -type f | head -70
```
If working in PowerShell instead:
```powershell
Get-ChildItem resources,build,src -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'logo|icon|brand|\.svg$|\.ico$|\.icns$' } | Select-Object -ExpandProperty FullName
Get-ChildItem fixtures -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 70 -ExpandProperty FullName
```

## What 'approved reuse' requires
Document full old path, copied/new path, current responsibility, hidden dependencies, test evidence, license/provenance, rationale, and whether the resulting code crosses domain/application/infrastructure boundaries. Never approve on the basis that an old module already works.
