# templates

The app's own templates for new projects and its starter outlines (Milestone 19).

- Starter outlines are plain Markdown in `starters/en/` and `starters/he/`, written in each language
  (not translated), so a writer can edit them in any editor.
- They're bundled as text (`?raw`), so the app reads nothing from its install folder and nothing is downloaded.
- A template is data: kinds, what chapters are called, suggested tags, a first chapter or not, and
  which starters it begins with. Storage turns it into files; nothing records which template a book came from.
- Imports nothing: neither the app's packages nor libraries.
