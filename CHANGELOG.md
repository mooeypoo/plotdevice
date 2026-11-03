# What's new in Plot Device

Each version starts with a short summary, then what's new, what's fixed and what's faster.

## 0.3.0 — 2026-11-03

The first public version of Plot Device: a place to write your book chapter by chapter, with your characters, places, notes and outline beside the draft. Everything is saved as ordinary files in a folder you choose, so your book stays yours. This is a beta for Linux, with an early beta for Windows. If something goes wrong, or you have an idea, tell us from the menu.

### New

- **Write chapter by chapter.** Group chapters into parts, drag them into order, and put the ones you're unsure of "On the side", out of the book but kept. There's no save button: Plot Device saves a moment after you stop typing. *Technical: one Markdown file per chapter in `manuscript/`, with a small YAML header (`title`, `id`). The reading order and parts are a readable list in `CONTENTS.md`. Each save writes a complete new file and swaps it in, so a crash never leaves half a chapter.*
- **Hebrew and English in one book.** The app and its guide come in both languages. A book runs right to left or left to right, and any paragraph or phrase can run the other way. *Technical: a direction is written only where it's needed, as Pandoc's `[text]{dir=ltr}`; the interface language is a setting, separate from the book's.*
- **Plan with outlines.** Arrange an outline as cards on a board, as a list, or type it as text. Link a card to a chapter, character or place as you type, and see which cards point to the chapter you're writing. *Technical: an outline is a Markdown list in `outlines/` (`##` sections, `-` cards, nested details). Plot Device changes only the lines a change needs and keeps anything it doesn't show.*
- **Characters, places and notes.** Each has a page and a gallery. Keep them on a shelf beside the page while you write, find them by any name they go by, and pin the ones you need. Write relationships as a list, and see what links to each page. *Technical: pages are Markdown files in `characters/`, `places/` and `notes/`, with `title`, `aka` and `tags` in the YAML header and a `Relationships` heading for relationships. Obsidian-style double-bracket links are read, never written.*
- **Tags.** Tag pages, then group a gallery, the shelf or "Link to…" by the tags you choose. Rename a tag everywhere at once, or tidy tags that differ only in capitals or spacing. *Technical: tags are one `tags: [...]` line in the page's header; changing them rewrites only that line.*
- **Earlier versions.** Go back to how a chapter, outline or page was, or keep an old version as a separate file. *Technical: a copy is kept before Plot Device first changes a file, then at most every ten minutes, in `~/.config/plotdevice/backups/`, outside the book. Every version is kept for a day, then one a day for 30 days, then one a week for a year.*
- **Your book stays readable anywhere.** Edit it in Obsidian, a text editor or git while Plot Device is open: it reloads, and asks before replacing anything you were typing. Bring in notes or a draft you wrote elsewhere, and Plot Device lists anything it couldn't use. *Technical: no database or hidden files in the book's folder; the folder is complete on its own.*
- **Export the book** as one Markdown file, with parts and chapters as headings, ready for Pandoc to turn into Word, EPUB or PDF.
- **Writing comfort.** A light or dark theme, focus mode, the text size and page width you like, spellcheck, and Write remembers where you were in each chapter.
- **Update notices.** When a newer version is out, Plot Device says so in the top bar, and "Check for updates" is in the About window. Turn the automatic check off in Settings. *Technical: once a day it reads `latest.json` from this repository's latest GitHub release; nothing about you or your book is sent.*
- **Tell us what's wrong, or what you'd like.** "Report a problem" and "Suggest an idea" in the menu open a short form on GitHub, with your version and system filled in.

### Good to know

- **Linux:** an AppImage and a .deb. On Ubuntu or Debian, the .deb installs Plot Device with your other apps.
- **Windows (early beta):** an installer, `plotdevice-0.3.0-setup.exe`. Every change is tested on Windows automatically, including installing and removing the app, but it hasn't been used on real Windows computers yet. Expect rough edges, and please tell us about them with "Report a problem". The installer isn't signed yet, so Windows may say "Windows protected your PC": choose "More info", then "Run anyway".
- **macOS** comes later.
- **Your book is safe** on any system: it's plain files, each save swaps in a complete new file, and earlier versions are kept outside the book (`%APPDATA%\plotdevice\backups\` on Windows). Still, keep your book's folder in a backed-up or synced place, as you would any important document.
- **Checking the files:** compare them with `SHA256SUMS` on the release page.
