# ADR 0002: Architecture and boundaries

Status: **Accepted** (owner, 2026-10-25). Built in Milestone 1.

## In short

Plot Device is split into layers with one-way rules about who may use whom. The story's rules don't depend on Electron, Vue or the file system, so they stay simple to test and can later run in a web or mobile app. The rules are checked automatically on every change, and a test proves the checks themselves still work.

## Why it matters

The previous version mixed interface, file access and story logic, which made changes risky and testing hard. Writing software also lives a long time, and a desktop app today may need a web or mobile companion later. Clear layers keep each part replaceable and each rule testable on its own.

## The layers

From the inside out:

| Layer | Package | Holds | May use |
|---|---|---|---|
| Kernel | `shared` | `Result`, `Brand`, `ProjectPath` | nothing |
| Domain | `domain` | The story's concepts and rules (manuscript, text direction, …) | `shared` |
| Application | `application` | Use cases and the *ports* they need (interfaces such as "a place to store files") | `domain`, `shared`, contract types |
| Contracts | `contracts` | The typed API between interface and core, with validation schemas | `shared`, `zod` |
| Adapters | `markdown`, `storage`, `fs-node` | Reading and writing Markdown; files on disk | inward layers only; Node only in `fs-node` |
| Presentation | `presentation`, `i18n` | Display rules, translations; no UI framework | `shared`, contracts |
| Interface | `ui-vue` | Vue components and design tokens | presentation, i18n, contracts |
| Host | `apps/desktop` | Electron: wires adapters to use cases, serves them to the interface | everything except the interface's code |

**Where the core runs:** in Electron's main process. The interface runs in a sandboxed page and reaches the core only through the three-call bridge (`window.plotDevice`), validated on arrival. A future web or mobile host would run the same core and swap only the adapters and the transport.

## How the rules are enforced

1. **TypeScript project references.** The inner packages compile without browser or Node types, so using `fs`, `process` or `document` there fails to compile.
2. **dependency-cruiser rules** (`.dependency-cruiser.cjs`). There is one rule per boundary, including "application may use contract *types* but not the validation code".
3. **pnpm's strict installs.** A package can only import what it declares.

**The checks are checked.** Each rule has a deliberate-violation fixture (`tooling/arch-fixtures/`). The architecture test fails if any rule stops catching its fixture, or if a rule has no fixture.

## Security choices (desktop)

- **Renderer:** sandboxed, with context isolation and no Node integration.
- **Navigation:** no navigation, no new windows, no embedded pages, no permissions.
- **CSP:** strict; no inline scripts or styles. Colours are set through the CSSOM, which the policy allows.
- **IPC:** every request is checked for its sender (the app's own page) and its payload (zod).

## Consequences

- **A new feature is a vertical slice:** domain rule, use case and port, adapter, contract, then interface. Each layer is tested on its own.
- **Adding a boundary means adding a rule and its fixture.**
- **Some small duplication is accepted to keep the layers apart.** For example, the interface's language direction (`i18n`) and a book's text direction (`domain`) are separate functions, because they are separate concepts.
