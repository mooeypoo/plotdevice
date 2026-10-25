# ADR 0004: Chapter editor, prose formatting and text direction

Status: **Accepted** (owner, 2026-10-25) · Evidence: `docs/spikes/editor.md`, `docs/spikes/editor-testing-guide.md`

## Context

`ARCHITECTURE.md` left the choice between Tiptap and CodeMirror 6 open, pending a spike. The editor has to:
- keep author Markdown intact (ADR 0003)
- feel like writing to nontechnical authors
- handle Hebrew, English and mixed-direction prose
- stay fast on long chapters
- run under a strict CSP

Spike B built both behind one interface and compared them with 98 automated checks and the owner's hands-on testing.

## Decision

1. **CodeMirror 6 is the chapter editor.** Tiptap is not used. The spike's Tiptap code is discarded.
   - **Fidelity by construction:** the document is the Markdown, so every byte the author didn't touch stays as it was. Tiptap needed a custom block-splicing layer of about 340 lines to reach the same result. Its own serializer rewrote emphasis and scene breaks, and dropped footnotes, HTML and tables.
   - **Direction support the owner trusts:** CodeMirror is used in Wikimedia projects, which depend on solid RTL/LTR behaviour. It reads each line's direction for cursor motion (`perLineTextDirection`) and supports bidi-isolated ranges.
   - **Speed:** it renders only the visible lines. A 150,000-character chapter uses about 45 DOM nodes, and a keystroke takes about 0.1 ms.
   - **CSP:** it injects styles with a nonce (`EditorView.cspNonce`), with no exceptions needed.
2. **Writing view: live preview.** Markdown markup is hidden except on the line with the cursor. Bullets and the scene-break ornament (`⁂`) are drawn. Markdown the app doesn't support stays editable text, with a quiet "kept as written" style.
3. **Formatting in scope (MVP):** paragraphs, headings, bold, italic, block quotes, links, bullet and numbered lists, scene breaks, and line breaks. All were evaluated, and none was deferred. The house style:
   - scene breaks: `* * *`
   - line breaks: a trailing `\`
   - italic `*…*` and bold `**…**` for new formatting, while existing `_…_` and `__…__` are kept as written
4. **Text direction overrides use Pandoc's syntax, written only when needed:**

   | What | Markup |
   |---|---|
   | A paragraph | `::: {dir=ltr}` … `:::` |
   | A list item or quote | its whole text as `[…]{dir=ltr}` |
   | A phrase | `[text]{dir=ltr}` |

   - **"Only when needed":** a marker is written only when the wanted direction differs from what the text shows without one.
   - **Default direction:** without a marker, a paragraph takes the project language's direction or its first strong character, depending on the direction setting.
   - **In the editor:** markers are hidden, the caret can't land inside them, and marker lines are protected from accidental edits. An emptied block is removed.
   - **Rejected:** invisible RLM/LRM marks (a hidden control character in the text), `<!-- dir -->` comments (meaningless outside the app), and `<p dir>` (CommonMark stops reading Markdown inside it).

## Consequences

- **Writer behaviour to build in Gate 3** (the spike didn't do this):
  - **Enter** starts a new paragraph (a blank line in Markdown). **Shift+Enter** inserts a line break. Otherwise paragraphs silently merge, because a single newline is not a paragraph break in Markdown.
  - Formatting commands that toggle on and off.
  - Typing shortcuts such as `- ` to start a list.
  - Discoverable keyboard shortcuts.
- **Paste must convert HTML to Markdown.** The spike's CodeMirror pasted plain text only, losing italics and bold from Word and Google Docs. The recommendation is to convert without the DOM, using the unified/mdast ecosystem already chosen in ADR 0003 (`hast-util-from-html` → `hast-util-to-mdast` → `mdast-util-to-markdown`), restricted to the formatting in point 3. Parsing outside the DOM keeps Google Docs' style attributes readable under the strict CSP, so no `style-src-attr` exception is needed. The new dependencies need approval at Gate 3.
- **The file-format spec and user docs must explain the direction markers.** Draft wording for authors is in `docs/spikes/editor.md`. The details go into the project-format ADR and `DOMAIN_AND_FILE_FORMAT.md` before Gate 2.
- **Still to verify before release:**
  - a screen reader with the live preview (Orca, NVDA)
  - Windows
  - spellcheck in English and Hebrew together
  - how Obsidian, GitHub and Pandoc render the direction markers (sample: `tests/fixtures/chapters/direction-markers.md`)
- **Pinned for the skeleton:** `vue-tsc` requires TypeScript 6.x. TypeScript 7 has no JavaScript API yet.
