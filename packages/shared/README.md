# shared

The smallest common kernel: `Result` for expected failures, and `Brand` for nominal types.

- Imports nothing: no other package, no library. Everything else may import it.
- Keep it tiny. A concept that belongs to one context lives in that context, not here.
