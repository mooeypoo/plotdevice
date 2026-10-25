# Outline fixtures

Byte-exact outline Markdown for round-trip and transformation tests. Content is the invented *Salt Orchard* sample. Never edit these files in a tool that rewrites line endings, BOMs or Unicode normalization.

| File | Exercises |
|---|---|
| `basic-en.md`, `basic-he.md` | `#` title, `##` sections, cards, nested details (English, Hebrew) |
| `mixed-direction.md` | Hebrew and English in one item; numbers, quotes, ₪ |
| `unicode-niqqud-emoji.md` | Niqqud, emoji (surrogate pairs), ZWJ sequence, flag; one NFD line that must stay NFD |
| `crlf.md` | `basic-en.md` with CRLF line endings |
| `bom.md` | UTF-8 BOM |
| `no-final-newline.md` | File without a trailing newline |
| `indent-tabs.md`, `indent-four-spaces.md` | Tab and four-space nesting |
| `mixed-markers.md` | `-`, `*`, `+` bullets (a marker change starts a new list) |
| `ordered-and-task-lists.md` | Numbered lists, task lists `- [ ]` |
| `loose-lists.md` | Blank lines between items; continuation paragraph inside an item |
| `section-intro-paragraphs.md` | Prose between `##` and the first card |
| `preamble-and-h3.md` | Content and a card before the first `##`; `###` headings |
| `embedded-blocks.md` | Code fence, table, block quote inside items; top-level HTML comment and table |
| `empty-sections.md` | Sections without cards, including the last one |
| `no-h2.md` | Cards with no section heading |
| `deep-nesting.md` | Six levels of nesting |
| `frontmatter.md` | YAML frontmatter with a comment and unknown keys |
| `frontmatter-invalid.md` | Frontmatter that is not valid YAML |
