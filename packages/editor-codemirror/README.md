# editor-codemirror

The chapter editor (ADR 0004): CodeMirror 6 editing the chapter's Markdown body directly, so a save
returns exactly what is on screen and untouched text keeps its bytes.

- **Live preview** hides Markdown markup away from the cursor; unsupported Markdown is shown as written.
- **Writing keys:** Enter starts a paragraph, Shift+Enter breaks a line; formatting writes plain Markdown.
- **Direction:** Pandoc markers (`::: {dir=…}`, `[…]{dir=…}`) written only when needed, hidden and protected.
- Logic lives in state commands, testable without a screen; `chapter-editor.ts` adds the view.

- Imports `domain` (direction rules), `shared` and CodeMirror only.
- Knows nothing of files, saving, Vue or Electron: the interface passes text in and reads it out.
