# Milestone 10: The documentation site

Status: **In progress** (2026-10-26), on branch `milestone-9/look-and-feel`. Approved by the owner on 2026-10-26: Starlight; English at the root and Hebrew at `/he/`; Download links to GitHub releases; the owner reviews the Hebrew; the site says macOS comes later; the owner approves publishing. Step 1 is ready for review.

## Goal

A site that makes a writer want to try Plot Device, then helps them with every task. It looks like the app (Lamplight: ink, cream and gold), it is complete in **English and Hebrew**, and adding a third language is a documented, mostly mechanical job.

It replaces the current site at https://mooeypoo.github.io/plotdevice/, a VitePress site built from the old repository. Nothing in this repository builds that site now, so this is a new site, not a reskin.

**Out of scope:** a blog, release notes beyond a link to GitHub releases, a custom domain (decision 8), and video.

## Who it's for, and what each needs

| Reader | Arrives wanting to… | The site gives them |
|---|---|---|
| A curious writer | know if this is for them, in under a minute | The front page: what it feels like, what it costs (nothing), what happens to their files |
| A new author | install it and write a first chapter | "Start here": install, first book, a tour of the window |
| An author mid-book | do one specific thing | Short task guides, each answering one question ("How do I move a chapter?") |
| A careful author | know their writing is safe and theirs | "Your files": the folder, plain Markdown, versions, conflicts, backups |
| A bilingual author | write Hebrew with English names | One guide on mixed-direction writing, with real examples |
| A translator | add a language | "Translate Plot Device": the app and the site, step by step |

## The front page

An inviting first screen, then proof, then a way in. Every image is a real screenshot of the app (decision 5), in the reader's language, matching the site's light or dark theme.

1. **The opening:** the logo's gold line drawing itself (held still for reduced motion), "Write the novel. Keep the files.", one sentence underneath, and two buttons: **Download** (for the reader's system, detected) and **Start the guide**.
2. **The desk:** a large screenshot of Write, the page under its glow. Switching the site's theme switches the screenshot.
3. **Three promises**, each with its own screenshot:
   - **Write first.** Open a chapter and type; no outline, no setup.
   - **See the story.** Outlines on a board, characters and places beside the page.
   - **Your folder, your novel.** Plain Markdown, readable in any app, forever.
4. **Hebrew and English, together:** a page of mixed-direction prose from the Hebrew demo, beside the same window in English. No other writing app shows this well.
5. **"What's in the folder":** the demo novel's folder as a tree, and one chapter file opened next to it, to make "plain Markdown" concrete.
6. **Free, and yours:** GPL, no account, nothing leaves the computer; the writing belongs to its author.
7. **A last invitation:** download, or read the guide; credit to the author with a link to moriel.tech.

## The guide

Short pages, each named for what the reader wants to do, with a screenshot and the exact words of the app's buttons (decision 6). Hebrew pages have the same names and order.

- **Start here:** Install Plot Device · Your first book · A tour of the window
- **Writing:** Chapters and parts · Moving chapters (dragging, the keyboard, "Move for later" and "On the side") · Formatting (the bubble, ¶, shortcuts, scene breaks) · Hebrew and English in one book · How the page looks (Aa: size, width, focus mode) · References while you write (search, pinning)
- **Planning** (the Story workspace): Outlines: board, list and cards · Cards and their details · Linking cards to chapters, characters and places · Characters, places and notes · The book's chapters
- **Keeping it safe:** Saving happens by itself · Earlier versions, and restoring one · When a file changes in another app · Backups
- **Sharing:** Exporting the book
- **Your files:** The project folder · Chapters and the contents file · Outline files · Character, place and note pages. For people who also open the folder in Obsidian, a text editor or git.
- **Reference:** Keyboard shortcuts · Settings · Questions and answers · Words used in Plot Device (one name per idea)
- **About:** Credits and licence · Translate Plot Device · Report a problem

## Decisions

1. **Built with Astro Starlight.** It handles languages better than VitePress (the old site's tool) in three ways that matter here:
   - **Untranslated pages:** a page not yet translated shows the English text with a notice, rather than a broken link.
   - **Right to left:** each language declares its direction.
   - **Built-in words:** the site's own words (search, "next page", the notice) come in 38 languages, including Hebrew.

   Search is built in and per language (Pagefind), with no outside service. Sources: [Starlight's i18n guide](https://starlight.astro.build/guides/i18n); the Hebrew built-in strings were checked in the package itself (`translations/he`). The front page is custom-built on Starlight's "splash" layout.
2. **Where it lives:** `apps/site/`, a workspace package. It may read only two things from the app: the colour tokens and the message catalogs. The app never imports the site, and an architecture rule enforces both directions.
3. **One look, one source.** The site's colours are generated from `packages/ui-vue/src/theme/tokens.ts`, and it uses the same bundled fonts, so a palette change reaches the site without editing it. The site's own colour pairs go through the same contrast test.
4. **Addresses:** English at `/plotdevice/`, so existing links keep working, and Hebrew at `/plotdevice/he/`. A future language goes at `/plotdevice/<code>/`. The app's "Help and documentation" opens the page in the app's own language. The app's link allowlist already covers `/plotdevice/`.
5. **Screenshots are taken from the real app, by a script.** `pnpm site:screenshots` opens the demo novels in each language and both themes, sets up each scene (a menu open, a card mid-drag), and saves the images where the site expects them. Screenshots never go stale, and a new language gets its screenshots automatically once the app speaks it.
6. **The app's words come from the app.** Guides name buttons through a component, for example `<Ui k="export-book" />`, which reads the label from the app's catalog in the page's language. Docs can't drift from the interface: renaming a button in the app renames it in every guide, and a build check fails on a key the app doesn't have.
7. **Ready for more languages:**
   - Adding one is a config line, plus its pages.
   - Untranslated pages fall back to English with a notice.
   - A `pnpm site:translations` report lists, per language, the missing pages and the pages whose English changed since they were translated (each translation records the version of the English page it came from).
   - A "Translate Plot Device" guide covers the app's catalogs and the site together.
8. **Hosting:** GitHub Pages, deployed by a new `docs.yml` workflow when `apps/site/` or the app's words change on `main`. It keeps the current address; a custom domain is a separate decision.
9. **Checks in CI:** the site builds; no broken internal links (Starlight's link validator); every `<Ui>` key exists; an accessibility scan (axe) of the front page and one guide page, in both languages and both themes.

## What I need from the owner

1. **Starlight** (decision 1) and **English at the root, Hebrew at `/he/`** (decision 4): agree, or prefer otherwise?
2. **Downloads:** no installer is published yet, so the Download button would go to the GitHub releases page with "early versions" wording. Or hold it back until a release exists?
3. **The Hebrew text:** I'll write the Hebrew pages, not just translate them word for word. Will you review them, or should someone else?
4. **macOS:** the app isn't built for macOS yet. The site would say "Linux and Windows; macOS later". Is that right?
5. **Publishing:** the first deployment replaces the live site. I'll stop and ask before it goes out.

## Work order, with a review after step 1

1. **Front page mock-up**, English and Hebrew, both themes, using screenshots from the screenshot script. Reviewed before anything else is built.
2. The site skeleton: Starlight, both languages, colours and fonts from the app, the `<Ui>` component, the screenshot script, CI checks.
3. The front page, built.
4. The guide, English: Start here and Writing first, then the rest.
5. The guide, Hebrew.
6. The translation report and "Translate Plot Device".
7. The deploy workflow; publishing after the owner's go-ahead.

## Tests

- **Build:** the site builds with no warnings; internal links resolve in both languages.
- **Words:** every `<Ui>` key exists in the app's catalogs. The check fails on a deliberately missing key.
- **Screenshots:** the script runs against a built app and produces every image a page names. A page naming a missing image fails the build.
- **Accessibility:** axe finds no serious issues on the front page and a guide page, in English and Hebrew, light and dark. Colour pairs pass the same contrast test as the app.
- **Right to left:** in Hebrew, the page direction is `rtl`, navigation is on the right, and code and file names stay left to right.

## Progress

**Step 1, the front page:** built for real on Starlight rather than as a separate mock-up, so review changes are edits, not rework.
- **Front page:** English and Hebrew, both themes, desktop and phone widths, every image a real screenshot of the app.
- **Started early from step 2:** the site package (`apps/site`), colours and fonts from the app, the `<Ui>` component, the screenshot script, the link check, and the two architecture rules (`site-reads-only-words-and-colours`, `nothing-imports-the-site`, each with a fixture it catches).
- **The first guide page,** "Install Plot Device", in both languages, so "Start the guide" leads somewhere.

**How the screenshots work** (decision 5): `pnpm site:screenshots` builds the app and opens the demo novels in each language and theme. It sets up each scene (a chapter open, text selected, a reference pinned, the board, a book in the other language) and saves 2880 × 1800 images, a 1440 × 900 window at twice the pixels. They are not kept in git: the docs workflow will make them fresh, and locally they are made once before `pnpm site:dev`. The cursor rests on a blank line between paragraphs, because the editor shows a paragraph's Markdown where the cursor is.

**The bilingual section** shows the interface and the book in different languages: on the English page, the English interface with the Hebrew book; on the Hebrew page, the Hebrew interface with the English book.

**Steps 2 to 6:**
- **The guide:** 30 pages in each language, covering every section in the plan. The Hebrew is written, not translated word for word, gender-neutral, with a maqaf between a prefix and a bold label ("ו־**רוחב העמוד**") so the label still renders bold. Examples in the Hebrew "Your files" pages come from the Hebrew demo novel.
- **Close-up screenshots** for guide pages (the book menu, Aa, ¶, a chapter's menu, a card's menu, the link picker, the new-book form), cropped from the same 2× window and shown at their natural size.
- **The translation report:** `pnpm site:translations` lists missing and outdated pages per language; `--stamp <code>` records the English version a translation came from. Hebrew: 32 of 32 pages, up to date.
- **Site tests,** `pnpm site:test`, served as GitHub Pages serves them:
  - axe finds no serious problems on the front page and a guide page, in English and Hebrew, light and dark;
  - Hebrew pages are right to left with code left to right;
  - every front-page screenshot loads.

  Writing that last right-to-left test found code blocks running right to left in Hebrew; they are now left to right.
- **Help in the app's language** (decision 4): About and **☰ → Help and documentation** open `/plotdevice/he/` in Hebrew, and `/plotdevice/<code>/` for any later language; the link allowlist already covers it (unit- and end-to-end tested).
- **The app, from writing the guide:** the outline's Undo showed a "Ctrl+Z" hint the app didn't honour. Ctrl+Z (⌘Z) now undoes the last outline change in Story, with an end-to-end test.

**Step 7, the deploy workflow:** `.github/workflows/docs.yml` builds and checks the site on pull requests that touch it. It takes the screenshots under xvfb, builds the site, runs the translation report and runs the site tests. It publishes to GitHub Pages only when run by hand (decision 8). It hasn't run yet: it runs once this branch reaches GitHub.

**Not done:** publishing (the owner's go-ahead), and the owner's review of the Hebrew.
