# contracts

The published language between the UI and the core: the `PlotDeviceApi` interface, IPC channel names,
and zod schemas that validate every payload crossing the process boundary.

- Imports only `shared` and `zod`.
- `application` may use these *types*, never the schemas (validation belongs to the transport).
- `channels` is a separate entry point without zod, for the preload script.
