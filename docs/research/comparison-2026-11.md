# How Plot Device compares: research (2026-11-09)

The comparison page (`apps/site/src/compare.ts`, Milestone 25) is based on this research. Sources were checked on 2026-11-09, from each company's own pages wherever possible.
- **[V]** means read on the vendor's own page or forum.
- **[U]** means a user report.
- **[n/f]** means well known, but the page wasn't opened that day.

## Notes per app

- **Google Docs**
  - Right-to-left: full [V support.google.com/docs/answer/65166].
  - Offline: has to be turned on [V answer/6388102].
  - Gemini: needs an eligible plan [V answer/14206696]. "doesn't use your content to train" [V answer/14615114].
  - EPUB export since 2016 [V Workspace blog].
- **Microsoft Word**
  - Hebrew interface: full [V language accessory pack].
  - Right-to-left: full [V "Using right-to-left languages in Office"].
  - Copilot in home plans: can be turned off; file contents "aren't used to train foundation models" [V].
  - No EPUB export [V Microsoft Q&A, Jan 2026].
  - New Windows documents save to OneDrive by default [V Insider blog, 26 Aug 2025]. Rollout to everyone not confirmed.
- **Scrivener 3**
  - Interface: 10 languages on Mac, no Hebrew [V L&L blog, 29 Jul 2026].
  - Mixed Hebrew and English in one paragraph garbles on Mac [U forum, Oct 2025]. Mixed-direction .docx output garbles [U forum, Feb 2025].
  - "contains no artificial intelligence" [V support, 29 Jan 2025].
  - Apple's own AI tools appear in all Mac apps [V L&L blog, 15 Sep 2026]. The same will apply to Plot Device on a Mac, so the page says Plot Device has "no AI of its own".
- **Dabble**
  - "Your writing is never sent to a generative model" [V].
  - A copy on your device and one in the cloud [V].
  - No PDF or EPUB export [V].
  - No non-English interface or right-to-left support documented.
- **Novelcrafter**
  - "the formatting options do not support RTL languages such as arabic, hebrew, and urdu" [V help, 4 Feb 2025].
  - Online only [V help, 6 Feb 2025].
  - No AI of its own: you bring your own provider [V help, 8 May 2025]. Doesn't train on users' novels [V privacy policy, 31 Aug 2026].
  - Exports Word and Markdown [V].
- **Campfire**
  - Interface: "Currently only available in English" [V FAQ].
  - Work kept on "Amazon servers"; offline in the desktop app [V FAQ].
  - Imports DOCX; exports EPUB and PDF [V].
  - AI and right-to-left: not documented.
- **Obsidian**
  - Hebrew interface [V translations repo].
  - Right-to-left built in since 1.6, with reported rough edges [V docs; V forum, Sep 2025].
  - No .docx in the official importer [V]. PDF export on desktop [V].
  - App data "never sent to our servers" [V privacy]. No AI in the core app; community plugins exist [V].

The page lists the URLs for every column (`SOURCES` in `apps/site/src/compare.ts`).

## How other sites compare

- **Dabble:** a feature grid of ticks, undated and unsourced. It reads like an ad.
- **Plausible** (vs Google Analytics) was the model: one table in plain words, dated claims, and an open "has more depth" about the competitor.
- **Most writing apps** (Plottr, Novelcrafter, Campfire, Obsidian) have no comparison page.
