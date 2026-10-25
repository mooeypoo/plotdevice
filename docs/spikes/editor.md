# Spike B findings: Tiptap vs CodeMirror 6

Date: 2026-10-25 · Branch: `spike/editor` · Code: `spikes/editor/` (throwaway, not for merging) · Plan: `docs/plans/phase-0-architecture-proposal.md` §9

## Status

**Decided: CodeMirror 6** (owner, 2026-10-25, after hands-on testing). See ADR 0004. The owner tested both editors and chose CodeMirror for its byte-faithful model and its proven RTL support (it is used in Wikimedia projects). The weighted scorecard wasn't filled in; the decision rests on the testing and the results below.

## Setup

- **Editors:** CodeMirror 6.43 with `@codemirror/lang-markdown`, and Tiptap 3.32 with `@tiptap/markdown`. Both sit behind one small interface (`src/editor-contract.ts`, a preview of `ChapterEditorAdapter`).
- **Environment:** Electron 45 (Chromium), Linux. The renderer is sandboxed, with context isolation and a production-like CSP: `style-src 'self' 'nonce-…'`, with no `unsafe-inline`.
- **Both editors get the same treatment:**
  - frontmatter is kept outside the editor
  - the same chapters (`tests/fixtures/chapters/`)
  - the same direction modes and override encodings
- **What each spike layer adds:**
  - **CodeMirror:** an Obsidian-style live preview (markup hidden off the cursor line, bullets and the scene-break ornament drawn), per-line `dir`, and nine formatting commands. About 300 lines in all.
  - **Tiptap:** a block-level fidelity layer (unchanged blocks save their original bytes), "kept as written" blocks for content it can't represent, and a direction extension that switches modes without remounting. About 340 lines.

## Automated results

`pnpm self-test`: **98 results: 85 pass, 1 fail, 12 measurements.** Raw output: `spikes/editor/self-test-results.json`.

| Check | CodeMirror | Tiptap |
|---|---|---|
| Save with no edits is byte-identical (6 chapters, incl. 150k chars) | **6/6** | **6/6** (with the fidelity layer) |
| Tiptap's own serializer, no edits | n/a | Changes 0–3 lines in ordinary chapters (blank-line handling, `_` → `*`, `__` → `**`, `***` → `* * *`). **Loses 16 of 28 lines** in the unsupported-content chapter. |
| Typing changes only that paragraph (5 chapters) | **5/5** | **5/5** |
| 9 formatting commands give the expected Markdown | **9/9** | **9/9** (after configuring `* * *` and `\`) |
| Paste (Word, Hebrew Word, Google Docs, web page, plain text): no HTML or script leaks | **5/5, plain text only:** bold, italic and links are lost | **5/5:** italic, bold and links kept; images, tables and scripts dropped cleanly |
| Theme, UI language, direction mode, re-parenting: same instance, undo kept | **pass** | **pass** |
| Direction, *project language* mode (mixed chapter, 9 paragraphs) | 7/9 right (wrong: the two English paragraphs) | 7/9, same |
| Direction, *auto per paragraph* mode | 7/9 right (wrong: paragraphs starting with a Latin name or English quote) | 7/9, same |
| Pandoc overrides fix every wrong paragraph (top level, list items, quotes), stay invisible, survive typing and reopening, in both modes | **pass** | **pass** |
| Inline `[…]{dir=…}`: one isolated phrase, even with italics inside; survives reopening | **pass** | **pass** (after making it the outermost mark) |
| "Only when needed": no marker for a direction the text already has | **pass** | **pass** |
| Hand-written markers (compact and blank-line forms) load byte-identical, with the right directions | **pass** | **pass** |
| Backspace past a marked paragraph leaves no broken or empty markers | **pass** | **pass** |
| CSP: no violations | **pass** | **fail: 11 `style-src-attr` violations, all during paste** (finding 4) |
| 150k-character chapter | Opens in 33 ms; 0.1 ms per keystroke (p95 0.2); +0.6 MB; **45 DOM nodes** (only visible lines are rendered) | Opens in 166 ms; 0.6 ms per keystroke (p95 0.8); +4.6 MB; **2,429 DOM nodes** |

Both editors are fast enough for any chapter. CodeMirror's cost doesn't grow with chapter length.

## Findings

1. **Fidelity.**
   - CodeMirror is byte-faithful by construction: the document *is* the Markdown.
   - Tiptap is faithful only with the fidelity layer. Its own serializer normalizes emphasis markers, blank lines, scene breaks (`* * *` → `---` by default) and hard breaks (trailing spaces by default), and drops footnotes, HTML, tables, images and reference links.
   - Even with the layer, an *edited* Tiptap paragraph is re-serialized, so `_x_` in that paragraph becomes `*x*`. ADR 0003 would need to list this as an allowed normalization.
2. **Unsupported content.**
   - In Tiptap, any block containing a footnote, inline HTML, an image or a reference link becomes a non-editable "kept as written" box, so the whole paragraph can't be edited in the app.
   - In CodeMirror the same content stays editable text with a quiet "kept" style, but the writer sees raw syntax there.
   - The trade-off is protection vs. reachability.
3. **Formatting.**
   - Both produce clean CommonMark for all eight candidate features plus line breaks.
   - Tiptap has these built in, including input rules (typing `- ` starts a list).
   - CodeMirror needed hand-written commands; production would need a complete set (toggling lists off, nesting, input rules).
4. **Paste and CSP.**
   - CodeMirror pastes plain text only. Keeping formatting would need HTML-to-Markdown conversion (a new dependency, or ProseMirror's parser).
   - Tiptap keeps italic, bold and links.
   - **Under a strict CSP, Tiptap misreads Google Docs:** the browser strips `style` attributes before ProseMirror reads them, so Docs' `<b style="font-weight:normal">` wrapper turns the whole paste bold. It also logs CSP violations.
   - Parsing with `DOMParser` didn't help, because Chromium applies the page CSP there too.
   - **Allowing `style-src-attr 'unsafe-inline'` fixed both (verified).** Style attributes can't run scripts, and script and style-element rules stay strict. Recording this exception needs an ADR.
5. **Paragraph direction.**
   - Both editors behave identically. Neither automatic rule is enough for Hebrew books:
     - The project-language base gets English paragraphs wrong.
     - First-strong-character detection gets Hebrew sentences that start with a Latin name or an English quote wrong.
   - **Overrides are needed,** at paragraph level and, more often, for phrases.
   - **[Decided 2026-10-25] Pandoc markers, written only when needed:** `::: {dir=ltr}` … `:::` around a paragraph, and `[text]{dir=ltr}` for a phrase. List items and quotes can't hold a fenced block, so their whole text becomes a span. Pandoc honours both when publishing. Other Markdown tools show them as readable text, and the text and its formatting stay intact. The invisible mark (RLM/LRM) and the hidden comment were tried first and rejected: one hides a control character in the text, the other means nothing outside the app.
   - **"Only when needed":** a marker is written only when the requested direction differs from what the paragraph or phrase shows without it. Requesting the direction it already has removes any existing marker.
   - **Bugs found and fixed in the process,** each with a self-test check that fails without its fix:
     - Tiptap rendered a span containing italics as separately isolated pieces, reordering its words. The span must be the outermost mark.
     - CodeMirror's parser reads `[text]` as a link, so spans were link-styled.
     - Backspace at the start of a marked paragraph could glue it to a hidden `:::` line. Marker lines are now protected, and an emptied block is removed.
     - With the earlier comment encoding, text typed at the end of a paragraph landed after the hidden marker.
   - **Auto-detection skips marked phrases,** as `dir=auto` ignores isolated content. So `> ["Do not sell…"]{dir=ltr} — מהמכתב…` stays RTL even in "each paragraph" mode.
   - **Draft explanation for authors (for the user docs):** *"Plot Device works out each paragraph's direction for you. When it gets one wrong (say, a Hebrew sentence that starts with an English name), select the paragraph or phrase and set its direction. Plot Device then adds a small marker to the file, such as `::: {dir=rtl}` or `[…]{dir=ltr}`, using Pandoc's standard notation. Pandoc and other publishing tools use these markers; other Markdown apps show them as plain text, and nothing is lost."*
6. **Tiptap's built-in `TextDirection` bakes its default into the schema**, so switching between "project language" and "each paragraph" would recreate the editor and lose undo history. The spike's own extension avoids that, using stored `dir` for overrides only and decorations for the mode.
7. **Stability.** Both keep the same instance, the selection and undo history through theme, UI language and direction-mode changes, and when the editor is moved to another place in the page.
8. **Tooling for the walking skeleton.**
   - `vue-tsc` doesn't work with TypeScript 7, the native rewrite without a JavaScript API. Vue packages need **TypeScript 6.0.x** for now.
   - VS Code's extension host sets `ELECTRON_RUN_AS_NODE=1`, which turns Electron into Node. Scripts must unset it.
   - Ubuntu's AppArmor blocks Chromium's sandbox; `docs/development.md` must cover this before Gate 3.

## Not yet tested (needs the owner)

Writing feel, Hebrew keyboard and IME behaviour, caret and selection across direction boundaries, real paste from Word and Google Docs, spellcheck, and screen readers. All are in the testing guide.

**Not tested at all:** Windows (deferred), and macOS.
