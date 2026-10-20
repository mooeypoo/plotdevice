# ADR 0012: Render the outline reference without active content

## Decision

Use `markdown-it` for the read-only outline reference instead of a second
CodeMirror surface. Keep raw Markdown editing, autosave, and recovery in the
existing main editor, never two editors for one file.

Disable raw HTML and render images as descriptions without fetching them.
Convert project links to app-routed anchors; render external URLs as inert text
with a URL tooltip. Wikilinks are parsed outside code and existing link labels,
and use the existing project resolver. Highlight containing passages using parsed
links, not text matches inside code.

## Why

The reference should read like a plan, not Markdown source. A maintained Markdown
parser supports nested formatting and tables without a homegrown parser. Inert
content preserves the app's local-only presentation and navigation boundary.
This changes no on-disk bytes or novel format.
