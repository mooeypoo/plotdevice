# export

Turns a book, already read into blocks (`@plotdevice/markdown`'s `ExportBlock`), into the files
authors send out (Milestone 22): EPUB, Word, and the HTML the desktop app prints to PDF.

- Bytes and text out; no file access, no Node, no Electron. The desktop app reads the book and saves
  the result through its safe writes.
- The author's text is never treated as markup: everything is escaped, and only web and email
  links become links.
- Output is deterministic for the same book and date, so fixtures stay stable.
