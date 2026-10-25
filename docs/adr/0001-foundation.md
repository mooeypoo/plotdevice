# ADR 0001: Foundation: a clean rebuild, its identity and its license

Status: **Accepted** (owner, 2026-10-25)

## In short

Plot Device is being rebuilt from scratch rather than refactored, keeps its name and app identity, and is free software under the GPL version 3 or later. Authors keep full ownership of everything they write with it.

## Why rebuild instead of refactor

The previous version grew around assumptions the product no longer holds: separate scene files, the folder structure deciding the book's order, and a developer-style interface. Untangling those would have cost more than starting clean, and would have risked carrying the old assumptions forward unnoticed. So:

- **Kept:** the name, the brand artwork (copied unchanged; provenance in `assets/brand/SOURCES.md`) and lessons learned, which are written into `AGENTS.md`.
- **Not kept:** any old code, data model or interface. Old code may be reused only after a reviewed proposal (`AGENTS.md`, "Clean-room migration rule").

## Identity

| What | Value | Why it matters |
|---|---|---|
| Display name | Plot Device | What authors see |
| Technical name | `plotdevice` (lowercase, no space or hyphen) | Folder names, package names, the executable |
| Project-local folder, if one is ever needed | `.plotdevice/` | Matches the technical name. Nothing currently needs it: backups and journals live in the operating system's app-data folder (ADR 0005) |
| Development builds | A separate app id and settings folder (`plotdevice-dev`) | So testing never touches settings of the old installed app |
| Release identity | `tech.moriel.plotdevice`, executable and Linux package `plotdevice`, settings folder `plotdevice` (decided at Milestone 7) | The old app's, so installing upgrades it. The old app was never released; its settings files (`ui-preferences.json`, `window-state.json`, `recent-projects.json`) are left alone, and its projects are not converted |

## License

**The software:** GNU General Public License, version 3 or (at your option) any later version (`GPL-3.0-or-later`). Anyone may use, study, share and change Plot Device; changed versions that are distributed must stay free under the same terms.

**The author's work is not covered.** The GPL governs the program's code, not what people create with it. Novels, chapters, outlines, notes and every other file an author writes belong to that author, under their own copyright, with no license or condition from Plot Device. This is stated in the README so authors don't have to know how the GPL works. (Legally, the GPL covers a program's output only when that output contains parts of the program itself; an author's text never does.)

**What this means in practice:**
- Every dependency must be compatible with GPLv3. MIT, BSD, ISC and Apache-2.0 are; licenses that forbid modification or redistribution are not. New dependencies are checked when they are proposed.
- Each package's `package.json` declares `"license": "GPL-3.0-or-later"`.
- Sample content in tests (the *Salt Orchard* fixtures) is invented for the project and shipped under the same license as the code.
