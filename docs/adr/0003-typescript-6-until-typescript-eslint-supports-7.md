# ADR 0003: Stay on TypeScript 6.0 until typescript-eslint supports 7

**Status:** accepted

## Context
TypeScript 7 is the latest release (7.0.2 in October 2026). typescript-eslint 8.71.2, which the lint setup depends on, declares support for TypeScript `>=4.8.4 <6.1.0`.

## Decision
Use TypeScript 6.0.x (6.0.3 at the time of writing). Don't use options that TypeScript 6 deprecates, such as `baseUrl`.

## Consequences
- Lint and typecheck use the same compiler, with no unsupported-version warnings.
- Revisit this when typescript-eslint supports TypeScript 7. The upgrade should be a version bump plus fixes for any new errors.
