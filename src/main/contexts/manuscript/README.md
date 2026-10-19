# manuscript

**Purpose.** The book's structure and prose: parts and chapters, their order from frontmatter, and word counts. Saves change only a file's body.

**Main concepts.** `Part`, `Chapter`, `Manuscript` (numbered parts, unnumbered parts, a flat chapter list for books without parts, the unordered tray, warnings), `countWords`. `Scene` is reserved for later.

**Use cases.** Queries: `GetManuscript`, `OpenEntry`. Command: `SaveEntryText` (refuses when the file changed on disk since it was opened, unless told to overwrite; refuses in read-only projects). Port: `ManuscriptRepository`, with an in-memory fake beside it.

**Must not know about.** Folders or file names as structure (ADR 0002), the codex, chronology, Electron, or which project is open (a repository is built per project by the composition root).
