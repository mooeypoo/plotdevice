# fs-node

File access for Node and Electron's main process: the atomic writer (ADR 0005) and adapters that
implement `application` ports. Today: the preferences store in the OS app-data folder.

- The only package (with Electron main) that may use Node built-ins.
- Uses `application` port *types* only; contains no business rules.
- Tested against real temporary folders, including a test that kills a writer mid-write.
