# Editor testing guide: Tiptap vs CodeMirror

About 45–60 minutes. Do each task in **both** editors: switch with the **Editor** menu at the top left. Nothing is saved to disk. The **Saved Markdown** panel on the right shows exactly what would be written, and whether it still matches the original file byte for byte.

## Start the app

```bash
cd spikes/editor
pnpm install      # first time only; downloads Electron
pnpm start
```

Use **pnpm**, not npm: npm can't read the folder pnpm creates and fails with `Cannot read properties of null (reading 'children')`.

- If the app opens without the Hebrew spellchecker, that's fine; the first run downloads the dictionary.
- The status bar shows **Editor instance #** and **undo steps**. If the instance number changes when you didn't switch editor or chapter, the editor was recreated. That's a failure: it loses your cursor and undo history.

## What's different between them (so it doesn't surprise you)

- **CodeMirror** edits the Markdown text itself. Formatting marks (`*`, `##`, `>`) are hidden, except on the line your cursor is on.
- **Tiptap** looks like a word processor and never shows marks. Content it can't edit appears in grey boxes labelled **kept as written**.

## Tasks

1. **Write without planning** (chapter: English). Click at the end of a paragraph and write two or three sentences. Use Ctrl+B and Ctrl+I, add a **Scene break**, then undo and redo (Ctrl+Z, Ctrl+Shift+Z). *Does it feel like writing, or like editing a file?*
2. **Formatting** (chapter: All formatting). Make a heading, a quote, a bullet list, a numbered list, a link and a line break. Then remove each one. *Was each one obvious? Could you undo it without hunting?*
3. **Hebrew** (chapter: עברית). Switch your keyboard to Hebrew and write a paragraph with a number (1904), quotes ("…" or ״), a maqaf (־) and a full stop at the end. Then try:
   - arrow keys, Home and End
   - Shift+arrows, and Ctrl+Shift+arrows (selecting a word)
   - Backspace and Delete next to punctuation

   *Does the caret go where you expect? Does the full stop stay at the end of the sentence?*
4. **Mixed direction** (chapter: Mixed / מעורב).
   1. Set **Paragraph direction** to *Project language*, then to *Each paragraph*. Note which paragraphs look wrong in each. (My automated check says 4 and 7 in the first mode, 2 and 9 in the second.)
   2. Put the cursor in a paragraph that looks wrong and press **This paragraph RTL** or **LTR**. The Saved Markdown panel shows the Pandoc marker (`::: {dir=…}` around a paragraph, or `[…]{dir=…}` around a list item or quote). Pressing it on a paragraph that already shows that way writes nothing.
   3. **Inline:** select the English quote in `נואל ענה באנגלית: "It was never anyone's orchard", ושתק.` and press **Selection LTR**. Check that the punctuation stays with the quote, then type inside and around the phrase.
   4. Type at the boundary between an English and a Hebrew word, and select across it.
   5. Open **Direction markers / סימוני כיוון**: a chapter with markers already written by hand. Nothing should look like code.
5. **Nothing resets** (any chapter). Put the cursor in the middle of a word and type a few letters. Change, in turn:
   - **Theme**
   - **Interface** (English ↔ עברית)
   - **Layout** (With references, then Focus; in Focus, the button at the bottom brings the toolbar back)

   *The cursor, your text and the undo steps must survive each change.*
6. **Paste** (any chapter). Paste a paragraph with italic and bold text from each of: Word or LibreOffice, Google Docs, and a web page. *What did you get? Did the formatting survive? Did anything strange come along?*
7. **Unsupported Markdown** (chapter: Unsupported Markdown). *Is it clear what you can and can't edit?* Try editing the paragraph with the footnote in each editor.
8. **Spellcheck.** Misspell an English word and a Hebrew word, then right-click for suggestions.
9. **Screen reader** (optional). Start Orca (Super+Alt+S on Ubuntu). Move by line and by word in the English and Hebrew chapters. *Is the text read? Are headings or emphasis announced?*
10. **Long chapter** (chapter: Long). Type quickly and scroll. *Any lag?*

## Scorecard

Score each 1 (poor) to 5 (excellent). The weights are my proposal; change them if they don't match your priorities.

| Criterion | Weight | CodeMirror | Tiptap | Notes |
|---|---:|---:|---:|---|
| Writing feel for a nontechnical writer (tasks 1, 2) | 25 | | | |
| Hebrew and mixed-direction editing (tasks 3, 4) | 20 | | | |
| Markdown fidelity and unsupported content (task 7, automated results) | 20 | | | |
| Paste from other apps (task 6) | 10 | | | |
| Formatting features (task 2) | 10 | | | |
| Accessibility: keyboard, screen reader (tasks 3, 9) | 10 | | | |
| Stability and speed (tasks 5, 10) | 5 | | | |
| **Weighted total** (Σ weight × score ÷ 5) | 100 | | | |

Also tell me:
- Which direction-override storage you prefer: invisible mark or hidden comment.
- Which formatting features you'd defer: headings, lists, links?
