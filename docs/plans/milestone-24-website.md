# Milestone 24: The website at plotdevice.app

Status: **Built** (2026-11-09) as draft PR #54; see [Results](#results). Approved 2026-11-09 with the owner's [decisions](#decisions-owner-2026-11-09).

Background: on 2026-11-09 the owner decided to keep Plot Device open source for now and to ask for nothing to download it. A later paid version may come; the current one would then stay as it is. Support comes from people who choose to give (Buy Me a Coffee). The site moves to the owner's own domain, plotdevice.app, with pages that explain why to use Plot Device and how to support it, in front of the guide.

## Goal

One site at **plotdevice.app**, in Hebrew and English, equal in standing:

- **Why Plot Device:** a landing page in each language that shows what it's for, with a Download button;
- **Support Plot Device:** why support helps, and how to give, if a reader wants to;
- **Plot Device in your language:** the languages it speaks, and a way to ask for another, or to help translate;
- **the guide** behind them, as today, under `/docs/`;
- **a public copy of the update file**, so the app can move to it later;
- room for a **blog** later, without building it now.

Nobody uses the current site yet, so this is built fresh in the new shape. Nothing is migrated or redirected.

**Out of scope** (owner, 2026-11-08 and 2026-11-09):

- **Selling.** No prices or checkout. **Download** goes to the GitHub releases page.
- **A support screen inside the app.** That's a later, separate milestone.
- **The blog.** The addresses leave room for `/blog/` and `/he/blog/`; nothing is built.
- **Changing the app.** Its ? links and update check still point to GitHub. Moving them to plotdevice.app is a small follow-up.
- **Taking down the GitHub Pages site.** It stops being updated. A later step can forward its pages to plotdevice.app.

## The addresses

```
plotdevice.app/                       → Why Plot Device, in English (the default)
plotdevice.app/support/               → Support Plot Device
plotdevice.app/languages/             → Plot Device in your language
plotdevice.app/docs/start/install/ …  → the guide
plotdevice.app/he/…                   → the same in Hebrew
plotdevice.app/updates/latest.json    → copy of the update file from the newest release
getplotdevice.com                     → forwards to plotdevice.app
```

**English is the default, at the root; Hebrew is under `/he/`** (owner, 2026-11-09, after the first build; the first plan prefixed both languages and had a language-choice page at `/`). The root is a full landing page, for readers and search engines alike. Every page tells search engines its other language (`hreflang`), with English as the default.

**Choosing the language:**

- **A language menu is always in the top bar,** on phones too.
- **A first visit to `/` from a browser that prefers Hebrew** goes to `/he/`.
- **Once the reader picks a language,** with the menu or a language link, the browser remembers it, and `/` follows that choice from then on.
- **Any page's own address always opens that page** in its language.

When a Hebrew guide page is missing, the English one shows, with Starlight's "not translated yet" notice.

## What I found

- **The site is Astro with Starlight** ([apps/site/astro.config.ts](../../apps/site/astro.config.ts)). Starlight is an Astro add-on, so ordinary Astro pages can sit next to it in the same build.
- **A landing page already exists,** as a Starlight "splash" page ([src/content/docs/index.mdx](../../apps/site/src/content/docs/index.mdx)), with `Hero`, `Promise` and `Folder` pieces in [src/components/landing/](../../apps/site/src/components/landing/). These move into the new pages instead of being rewritten.
- **The guide already has a "help translate" page** (`about/translate`). The new languages page links to it for people who want to translate. It doesn't repeat it.
- **The address `/plotdevice/` is written into the guide's links** (about 20 places) and into the Download and guide buttons. All of them change.
- **The screenshots are taken from the real app during the build** ([.github/workflows/docs.yml](../../.github/workflows/docs.yml)), with Electron running in CI. Netlify's own build machines can't easily do that, so **the site keeps building in GitHub Actions and is then sent to Netlify** (the `netlify deploy` command, with a token kept as a repository secret).
- **The update file `latest.json` is made by the release workflow** and attached to each GitHub release. The site's build copies the newest one into `/updates/latest.json`, so there's still a single source.

## Why Netlify, now that the repository stays public

GitHub Pages could serve plotdevice.app too, but Netlify adds two things this site needs:

- **Not-found pages by language:** a missing Hebrew page answers with the Hebrew not-found page. GitHub Pages has only one not-found page.
- **Forms without a database:** Netlify Forms collects what a visitor sends and emails it to the owner. "Ask for your language" works for writers who have no GitHub account, which is most of them. A "report a problem" form can use the same thing later.

## What a visitor will see

### Every page outside the guide

- **A header:** the Plot Device mark, **Why Plot Device**, **Guide**, **Support**, and a language switch (עברית / English) that goes to the same page in the other language.
- **A footer:** Guide, Plot Device in your language, Credits, Report a problem.
- The site's existing look: same fonts, colours, light and dark. Hebrew pages are right to left, with Hebrew screenshots.

### Why Plot Device (the landing page)

- **The hero:** what Plot Device is in one line, a screenshot of the writing desk, **Download** and **Read the guide**. A short line under the button says which systems it runs on.
- **The promises,** each with a screenshot in the visitor's language and theme:
  - write first;
  - see the story;
  - every storyline;
  - keep them close;
  - your files stay yours.
- **Made for Hebrew and English:** right to left done properly, mixed-language paragraphs, the interface in your language. This is a reason to choose it, so it gets a section of its own.
- **A short closing invitation:** Download, plus a quiet line linking to **Support**.

### Support Plot Device

- **Who makes it and why:** one person building a calm tool for writers.
- **What support makes possible:** more time on it, new languages, the Mac version, the screens writers ask for.
- **How to help:**
  - **Buy Me a Coffee** (`mooeypoo`), for any amount, once or monthly;
  - **telling another writer** about it;
  - **reporting a problem;**
  - **helping translate.**
- **Tone:** an invitation, never a guilt trip. It asks nothing of anyone who just wants to write. Following the owner's standing rule, it doesn't call Plot Device "free" and doesn't lead with open source.

### Plot Device in your language

- **The languages it speaks today** (English, עברית), for the interface and for writing.
- **"Ask for your language":** a short form (the language, optionally an email address for news, an optional note), sent with Netlify Forms. Spam is kept out with a hidden trap field rather than a puzzle.
- **"Help translate it":** a link to the guide's existing translation page.

### The guide

- The same guide, at `/docs/…` and `/he/docs/…`.
- **The install page** has a tab for each system: Windows, Linux, and macOS ("Coming soon", with a link to Support, since a Mac version needs a paid Apple developer account).
- The Plot Device name in its header goes back to that language's landing page.

### The root address

`plotdevice.app/` is the English front page. See [The addresses](#the-addresses) for how Hebrew readers get to `/he/`.

## Files to change

- `apps/site/astro.config.ts`: the site address becomes `https://plotdevice.app` with no base path. Starlight's locales become `he` and `en`, with no root locale. The sidebar entries gain the `docs/` prefix.
- `apps/site/src/content/docs/**`: English pages move to `en/docs/…` and Hebrew pages to `he/docs/…` (moves only, plus the link changes). The old splash `index.mdx` is removed.
- `apps/site/src/pages/{he,en}/index.astro`, `support.astro`, `languages.astro` (new): the three pages, in each language.
- `apps/site/src/layouts/Site.astro` (new): the shared frame for pages outside the guide (header, footer, language switch, direction).
- `apps/site/src/components/landing/*`: adapted to the new frame. The Download and Buy Me a Coffee addresses each come from one place.
- `apps/site/src/i18n/{en,he,qqq}.json` (new): the new pages' words, a banana catalog. `apps/site/src/site.ts` (new) reads it, and holds the languages and the outside addresses (Download, Buy Me a Coffee).
- `apps/site/public/_redirects` (new): the Hebrew not-found rule.
- `apps/site/src/components/Head.astro` and `Header.astro`: the reader's language (first visit, and remembering a choice), and the language menu in the top bar at every width.
- `apps/site/tests/site.site.ts`: covers the new pages and addresses.
- `.github/workflows/docs.yml`: deploys to Netlify instead of GitHub Pages, and copies `latest.json` from the newest release into the site.
- `README.md`: links point to plotdevice.app.
- `tooling/site-translations.mjs`: English in its own folder, and the site's messages in the report.
- `apps/site/paperl10n.config.json`: the language folders, and the catalog for Paper Lion.

## Tests

- **Every link and button name still checks out** when the site builds. The existing link checker covers the guide; the new pages get the same check in the site tests.
- **Accessibility and direction** (existing axe and right-to-left checks), now on all three new pages in both languages:
  - Hebrew pages are `dir="rtl"` and `lang="he"`;
  - English pages are left to right;
  - no horizontal scrolling at phone width.
- **The language switch** goes to the same page in the other language, everywhere.
- **The language form** is one Netlify recognises (its name and hidden fields are in the built page), and it can be filled in and sent by keyboard alone.
- **No `/plotdevice/` address is left** anywhere in the built site.
- **No "free" or "חינם"** in the new pages' wording, except the support page's one "free to use, not free to make" message (decision 4, checked automatically).
- **Every message has a Hebrew translation and a translator's note**, so Paper Lion shows nothing missing.
- **`/updates/latest.json` is in the built site** and has the same shape the app reads (the app's schema).
- **The root:** it is the English front page, with a language menu in the top bar on a phone. A Hebrew browser's first visit goes to `/he/`, and a reader who then chooses English stays in English.
- **The install page's tabs:** Windows, Linux, and macOS ("Coming soon").

## What the owner sets up (outside the code)

1. A Netlify site, with form notifications sent to your email. Then add two repository secrets: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.
2. Point plotdevice.app at Netlify, and add getplotdevice.com as a domain alias that forwards to plotdevice.app.
3. Auto-renew on both domains.

## Decisions (owner, 2026-11-09)

1. **Hebrew wording:** written by Claude, kept where Paper Lion can translate and review it:
   - the guide stays Starlight pages (`en/` and `he/` folders, named in `paperl10n.config.json`);
   - the new pages' words are a banana catalog (`src/i18n/en.json`, `he.json`, `qqq.json` with a translator's note for each message), read by Paper Lion's `catalog-banana`.
2. **The platforms line** stays as it is for now.
3. **"Report a problem"** goes to GitHub issues for now. A way for writers without a GitHub account (an email template or a form) is a follow-up.
4. **Cost wording:** Plot Device is never promised as "free". The one exception is the support page, which may say it is free to use but not free to build ("free to use… but it isn't free to make, so your support is appreciated"). The automatic "free" check allows only that message.

## Results

Built on branch `milestone-24/website`, draft PR #54.

**What a visitor gets**

- **Three pages in each language:** Why Plot Device, Support, and Plot Device in your language, plus the thank-you page after the form. English is at the root and Hebrew under `/he/`; the guide is under `docs/` in each. They're Starlight pages (`StarlightPage`), so the header, search, theme switch and language menu are the guide's own.
- **Header links** to Why, Guide and Support appear on every page, guide included. On a phone Starlight hides them, so the site's own pages repeat them in their footer, with the same page in the other language.
- **The root is the English front page.** A small script in the page's head (`Head.astro`) sends a Hebrew browser's first visit to `/he/`, and remembers the language the reader chooses. A language menu sits in the top bar at every width (`Header.astro`). A missing page answers with the not-found page in its own language.
- **The install page** has Windows, Linux and macOS tabs; macOS says "Coming soon".
- **Starlight's empty title band** is gone from the site's own pages; it used to sit under the header on the old front page too.

**Translation**

- All 93 messages are in Hebrew, written by Claude for the owner's review, with a translator's note each.
- Paper Lion reads both the guide (`format-starlight`, `en`/`he` folders) and the messages (`catalog-banana`, `src/i18n`).
- The Hebrew guide pages are marked up to date: they changed with their English pages (links only). The exception is "first book", which was already behind the English before this milestone and still is.

**Checks run** (all passing)

- `pnpm lint`
- `pnpm typecheck`
- `pnpm arch`
- `pnpm test`: 1566 passed, 4 skipped (as before).
- `pnpm site:build`, with the link checker.
- `pnpm site:test`: 41 passed, 1 skipped. The skipped test is the update file, which the workflow copies in. Run after copying `latest.json` as the workflow does, it passes too.

**What the site tests cover**

- **Accessibility:** no serious problems on all four kinds of page × 2 languages × 2 themes.
- **Language, direction and phone width:** each page's language and direction are right, and nothing scrolls sideways at 375px.
- **The language switches:** the footer's and the guide's.
- **The header links,** from the guide too.
- **The guide's own address** leads to its first page.
- **A missing page** shows the not-found page in its own language.
- **The language form:** it has what Netlify needs to keep it, and it can be filled in and sent by keyboard alone.
- **The root page,** with both languages.
- **The built site's files:**
  - no old `/plotdevice/` address is left;
  - every message has a Hebrew translation and a note;
  - "free" or "חינם" appears only in the support page's one line;
  - the Hebrew not-found rule is in place;
  - the update file has the shape the app reads.

**Not run:** `pnpm perf`, the app's end-to-end tests, and `astro check` (never installed for the site, and not part of `pnpm check`). The app isn't changed.

**Known limitations**

- Netlify's form detection and its not-found rule can only be tried once the site is on Netlify.
- The app still links to the old GitHub Pages guide, which stays as it was until the follow-up moves the app's links.
