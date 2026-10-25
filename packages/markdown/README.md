# markdown

Pure text codecs for the project's Markdown files (ADR 0003): frontmatter, `CONTENTS.md`, link
rewriting for file renames, and the exact text of new files.

- Text in, text out: no file access, no Node, no domain types (its own source-mapped model).
- Parses for structure and offsets only; every edit is a splice, never a re-serialization, so the
  author's formatting, comments, line endings and unknown content survive.
- Tested on byte-exact fixtures in `tests/fixtures/`, loaded with `?raw` imports.
