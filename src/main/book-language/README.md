# book-language

**Purpose.** The words Plot Device writes into a book and the few it recognizes in files, in the book's own `language` from `novel.md` (ADR 0019). Data and pure resolution only.

**Main concepts.** Word catalogs in `words/` (`en`, `he`, and `qqq` notes for translators, checked for parity): `seeds` are written and never read back; `recognized` words (today only `outline_inbox`) are matched in files. `resolveBookWords(language, vocabulary)` gives `BookWords`: the declared tag, the language the words come from, its direction, the seeds, and each recognized word's spelling to write and spellings to accept. `RETIRED_ALIASES` keeps old defaults readable. `context-words.ts` shapes the words for each context.

**Adding a recognized word** needs a stated reason, a `docs/file-format.md` entry, and an entry in every catalog; prefer structure (headings, bullets, links) over words.

**Must not know about.** Any context, Node, Electron, or the interface language (`src/i18n/`). Only the composition root imports it; contexts receive resolved words.
