# What's new in Plot Device

Each version starts with a short summary, then what's new, what's fixed and what's faster.

## 0.3.0 — 2026-11-03

<!-- Summary: two or three sentences for authors, about what this version means for their writing. -->

### New

- Atomic writer and preferences file store
- I18n, presentation and ui-vue shell with design tokens
- Electron host, end-to-end tests, CI, development guide
- ProjectPath, project details and the manuscript structure
- Frontmatter, CONTENTS.md, link rewriting, new files
- FileStore, project folders, journal store and ids
- The project repository
- Pages have tags, read leniently and written as one line
- Tag a page from its pills, with the project's tags suggested
- Choose tags above a gallery to group its cards
- The shelf and Link to… group by chosen tags; the shelf remembers them per part
- Rename a tag everywhere, or remove it from all pages
- Tidy tags, offered only when something needs tidying
- Gallery cards show their page's tags
- A grouped gallery names its rest for its kind
- The folded rest of a grouped list is "All characters", "All places" or "All notes"
- CheckProject lists what the app couldn't use in a book written elsewhere
- The start screen offers "Already have notes or a draft? Moving them in →"
- An outline can be typed as text, beside the board and list
- Plot Device says when a newer version is out, and you can report a problem or suggest an idea from the menu
- Forms on GitHub for reporting a problem or suggesting an idea

### Fixed

- Typecheck end-to-end tests with DOM and Node types
- Finish pending saves before quitting
- A card move no longer takes the keyboard from a menu opened meanwhile
- Focus the first tidy action without an unused expression
- Hebrew names the rest of a grouped Characters gallery כל הדמויות
- The Hebrew start screen says העבירו אותן למערכת
- The README's screenshots are committed copies, since the guide's are made at build time
- "Not now" on an update is remembered even when Plot Device is closed straight after

### Faster

- An outline's unchanged sections aren't parsed again
