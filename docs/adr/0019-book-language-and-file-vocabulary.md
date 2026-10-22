# ADR 0019: Book language, seeded words, and a minimal file vocabulary

**Status:** proposed (2026-10-22), not yet approved. Amends ADR 0016's statement that
generated template language remains unchanged. See `docs/plans/workbench-ui-plan.md`.

## Context

The app writes English words into books regardless of who writes them: the statuses and
YAML comments in a new `novel.md`, default character/location headings, `Untitled chapter`,
`Untitled part`, `Untitled note`, and the `Outline` title of a new outline. Plotting mode
adds the first word the app must also *recognize* in a file: the Inbox heading that
captured beats go under. ADR 0016 separates interface language from project content and
must keep doing so: switching the interface language never writes project files.

## Decision

- A book has an optional top-level **`language`** in `novel.md` (a BCP 47 tag such as
  `en` or `he`). Missing means English, so existing books are unchanged. Initializing a
  project writes it from an explicit choice that defaults to the interface language.
  Changing it later is an explicit action that edits only that key (ADR 0004).
- Words the app writes into a book come from a **seed catalog** keyed by book language.
  Seeds are write-only: the app never reads meaning back from them.
- Words the app recognizes in files come from a separate **vocabulary registry**. Today
  that is only `outline_inbox`. Adding an entry requires a stated reason and a
  `file-format.md` entry, and structure (headings, bullets, links) is preferred over words.
- Writers may override a recognized word in `settings.vocabulary`. The app reads it and
  never writes it in this plan.
- Resolution for reading: override, the book language's word, English, then any
  language's word or retired alias. Writing uses the first that resolves. A changed
  default stays as a read-only retired alias.
- A recognized heading renamed outside the app becomes ordinary content. The app offers
  to create a new one and never writes a duplicate silently.
- Seeds and the registry live in `src/main/book-language/`, which is pure and data-only.
  Only the composition root imports it. Contexts receive resolved words as plain input,
  just as folder settings reach them today, and never see the interface locale.
- Seeds and the registry use JSON catalogs per language with `qqq` notes, checked for
  parity like the interface catalogs, so translators work the same way.
- The book language's direction is the base direction for Auto writing direction when a
  line has no strong character (an empty chapter in a Hebrew book starts right-to-left).
  The user's explicit LTR/RTL preference still wins (ADR 0016, I5a).

## Consequences

- A Hebrew book gets Hebrew statuses, template headings and default titles, while
  frontmatter keys and `type` values stay canonical English and are translated on screen.
- Frontmatter keys are never localized in files.
- Interface-language switches still never write files. Only initialization or the explicit
  book-language action writes `language`.
- A test fails if context code matches file text against a literal that should come from
  the registry.
