# Brand asset sources

All files below are copied unchanged from the previous Plot Device repository (https://github.com/mooeypoo/plotdevice), as of its last commit before the clean-room reset (`9fe2460`). Each file was verified byte-for-byte against the original with `git hash-object`.

| New path | Original path |
|---|---|
| `original/icon.svg` | `build/icon.svg` |
| `original/icon-small.svg` | `build/icon-small.svg` |
| `icons/{16,24,32,48,64,128,256,512}x{…}.png` | `build/icons/` (same file names) |

- **Author:** Moriel Schottlender, the owner of both repositories.
- **License:** the previous repository was GPL-3.0-or-later. The license for this repository is a pending owner decision.
- `icon.svg` is the master for sizes of 48 px and up; `icon-small.svg` is the simplified mark for small sizes. The PNGs are renders of these masters.
- Not yet carried over: a Windows `.ico`. Regenerate it from the masters when packaging rather than copying the legacy `build/icon.ico`.
