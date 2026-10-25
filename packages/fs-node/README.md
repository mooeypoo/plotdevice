# fs-node

File access for Node and Electron's main process: the atomic writer (ADR 0005) and the adapters that
implement `application` ports: `FileStore` (a project's files, revision-checked), `ProjectFolders`,
`JournalStore` (recovery journals in app data), app-data files (settings, recent projects), the random
`IdGenerator`, and `watchProject` (chokidar; events are hints, never trusted for saving).

- The only package (with Electron main) that may use Node built-ins.
- Uses `application` port *types* only; contains no business rules.
- Bytes stay here: ports exchange decoded text plus a byte-order-mark flag and a revision.
- Tested against real temporary folders, including a test that kills a writer mid-write.
