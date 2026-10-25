# application

Use cases and the ports they need:
- **Personal settings**, and **recent projects** with where the author left off (app data).
- **The outline session:** edits to one outline run one at a time, rules first, never over a change
  made elsewhere; undo in memory, refused if another program changed the file since.
- **The writing session:** the open project and chapters. One autosave queue per chapter, serialized and coalesced, reports "saved" only for confirmed writes. Conflicts are resolved with "keep both" or "use my version". Unedited chapters reload quietly when changed elsewhere.

- Imports `domain`, `shared`, and `contracts` *types* only.
- Never imports Node, Electron, Vue, zod, Markdown parsers or adapters: those implement its ports.
- Expected failures are `Result`s; tests use in-memory ports.
