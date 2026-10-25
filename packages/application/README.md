# application

Use cases and the ports they need. Today: loading and updating the author's personal settings.
Project, chapter and outline use cases arrive with Gate 2.

- Imports `domain`, `shared`, and `contracts` *types* only.
- Never imports Node, Electron, Vue, zod, Markdown parsers or adapters: those implement its ports.
- Expected failures are `Result`s; tests use in-memory ports.
