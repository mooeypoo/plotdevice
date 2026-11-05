# Milestone 19: Templates for new projects

Status: **Built** (2026-11-05). Approved by the owner on 2026-11-05 with the recommended answers to the open questions. See [Results](#results). Direction from `roadmap-16-approachable-studio-and-timelines.md` (Phase B, decision D6). The picker's layout comes from the Milestone 17 mockups (the "templates" screen, Hebrew in light and English in dark). Builds on Milestone 18's kinds and chapter word (ADR 0011).

## Goal

A new author doesn't face an empty folder. **New project** asks what they're making, then creates a ready project they can change:

- the right kinds of pages;
- a starter outline or two;
- suggested tags;
- nothing that has to be deleted before writing.

**Blank** is always offered, so no template is forced (`PRD.md` §5). Once a project is created it is simply the author's, and nothing records which template it came from.

**Out of scope:**

- **More templates.** Memoir, series bible, children's book and web serial come later, once these four are tested.
- **Templates the author makes or downloads.** The app's own templates only.
- **Import from Word** (Milestone 22).
- **Kind-specific fields** (ADR 0011, decision 3).

## What I found in the code

- **Making a project today** (`repository.create`):
  - creates the folder and `manuscript/`;
  - writes `project.md` (`newProjectFile`) and an empty `CONTENTS.md`;
  - then opens the project.
  The details form on the start screen (`WelcomeView.vue`) asks for a title, an author and the book's language. The folder is chosen afterwards in a system dialog. The form is only on the start screen. Once a book is open, the app menu offers "Open project…" but not "New project".
- **Milestone 18 already writes everything a template needs** into `project.md`: `kinds` and `manuscriptUnit` (`setKinds`, `setFrontmatterBlock`). Writing the defaults back leaves no key.
- **Chapters and outlines** are written by `newChapterFile`, `newOutlineFile` and the contents editor. All of them work on a project that's already open. No code writes several files into a new project at once.
- **Tags exist only on pages.** "+ Tag" suggests the tags pages already use (`tagSuggestions`). A brand-new project has none, so it has nothing to suggest.
- **No "seen it" memory exists for outlines.** Preferences (`preferences.ts`) are app-wide settings such as theme and text size. The only "dismissed" state is for update notices.
- **"New outline"** asks only for a title, and the outline starts empty (Milestone 4, decision 4).
- **The project check** (Milestone 13) runs on any folder. The sample books already pass it with no warnings, and the same test can run on every template.

## What the author will see

### The picker

As in the mockups, on one screen:

- **The question** "What are you making?" / „מה אתם כותבים?", with one quiet line under it: "Everything can be changed later: the kinds of pages, the outlines, the names."
- **Four cards:** Novel (picked to begin with), Short story, D&D campaign and Blank. Each card has:
  - its name;
  - a short peek at what's inside, such as "NPCs · Locations · Factions · Items · Lore", "Campaign arc" and "Session plan";
  - a one-line description;
  - a summary, such as "5 kinds of pages · 2 outlines · sessions".
  The cards are toggle buttons (`aria-pressed`), reachable with Tab and the arrow keys.
- **Below the cards, the usual details:** title, author (optional, as today) and the story's language. The story's language picks which language the template is written in.
- **Create.** The folder is chosen in the system dialog, as today (open question 3).

### What each template makes

| Template | Kinds | Chapters are called | Outlines | Suggested tags | First chapter | Opens on |
| --- | --- | --- | --- | --- | --- | --- |
| **Novel** | Characters, Places, Notes | Chapters | Main story (beginning, middle, end), Loose ideas | Main character, Secondary | none | Story, on Main story |
| **Short story** | Characters, Notes | Chapters | The story (opening, turn, ending) | none | one, named after the book, empty | Write, on that chapter |
| **D&D campaign** | NPCs, Locations, Factions, Items, Lore | Sessions | Campaign arc, Session plan | Player character, Villain, Ally | none | Story, on Session plan |
| **Blank** | Characters, Places, Notes | Chapters | none | none | none | Write (as today) |

This changes two things in the roadmap's table:

- **The Novel has no first chapter,** and opens on its outline. A chapter named "Chapter 1" is one more thing to rename. The empty state in Write already offers "New chapter". If you'd rather a novel open ready to type, see open question 1.
- **The D&D tags drop "NPC",** because NPCs are a kind of page there. A tag with the same name would be a second name for one thing.

Hebrew wording from the mockups: Novel is „סיפור ארוך”, and the campaign's kinds are „דמויות · מקומות · פלגים · חפצים · ידע”. All the Hebrew template wording goes on the review list for a Hebrew writer, as the roadmap asks.

### Starter outlines

- **Section headings and a few short example cards,** written as real story beats ("Ilka refuses the inheritance" style, but generic: "The hero is asked to leave home"), never as instructions inside the author's file.
- **"New outline from…"** in Story offers the same starters to any project: Three acts, Story beats (open question 2), Character arc, Session plan and Empty. "New outline" stays as it is and means Empty.

### The outline guide, the first time

The first time the author opens any outline, a short guide shows above it:

> "Sections are the big steps of your story. Cards are the moments in each step. Add details under a card."

- It includes a small drawing of the Board, and a **Got it** button.
- After **Got it**, it never shows again on this computer.
- It's a guide in the app, not text in the file.

### Suggested tags

**+ Tag** offers the book's suggested tags first, until a page uses them. After that they're ordinary tags. They don't show in the row of tags above a gallery until a page has them, so a new book shows no empty tags.

## Decisions (proposed)

1. **A template is a folder of real Markdown,** one per template and language, in a new package `packages/templates` (`novel/en/`, `novel/he/`, and so on), with the starter outlines beside them in `starters/en/` and `starters/he/`.
   - **They're plain books,** so a Hebrew writer can edit them in any editor, and tests open them like any project.
   - **They're bundled as text at build time** (Vite `?raw` imports, which `packages/markdown` already uses for raw files), so the app reads nothing from its install folder and nothing is downloaded.
   - **The cards' names, descriptions and summaries** live in the message catalogs, in the interface's language. Only the template's content is in the story's language.
2. **Creating from a template:**
   - copies the template's files into the new folder;
   - writes `project.md` from the author's details, with a new project id, plus the template's `kinds`, `manuscriptUnit` and `suggestedTags`, as Milestone 18 writes them;
   - sets `CONTENTS.md`'s heading to the title;
   - gives every chapter a new id;
   - never writes over anything. The new folder is reserved first, exactly as today, and refused if it exists.
   A template's own `project.md` holds only those three keys and no id, so nothing from it is copied that should be unique.
3. **`suggestedTags` in `project.md`** is a one-line list, like a page's tags (`suggestedTags: [Player character, Villain, Ally]`). A book without it behaves as today. It is added to `DOMAIN_AND_FILE_FORMAT.md` and the guide for AI assistants. There is no schema version change.
4. **Where the project opens** follows from what it contains:
   - Write on the first chapter, if there's one;
   - otherwise Story, on the first outline;
   - otherwise Write's empty state, as today.
   The template doesn't need to say.
5. **The outline guide** is remembered as one app-wide preference, `outlineGuideSeen`. It is not kept per outline or per book, so an author meets it once.
6. **"New project…" joins "Open project…" in the app menu** (open question 4). It shows the same picker. The open book stays open until the new one is created, and Back returns to it.
7. **The story's language** picks the template's language. Today's language list is English and Hebrew, so every choice has a template.

## Files

- **New package `packages/templates`:**
  - `novel/`, `short-story/`, `campaign/` and `blank/`, each in `en/` and `he/`, as Markdown folders;
  - `starters/en/` and `starters/he/`, the starter outlines;
  - `src/index.ts`, which lists the templates and starters as text with their files.
  It's dependency-free and imports nothing from the app (an architecture rule is added for this).
- **Domain:** `project/project-details.ts` gains `suggestedTags`. A new `project/templates.ts` describes a template (its id and its files) and checks its paths.
- **Markdown:** `newProjectFile` takes `kinds`, `manuscriptUnit` and `suggestedTags`, and `read-project` reads `suggestedTags`.
- **Application:** the `create` port takes a template id. A new port, `TemplateSource`, supplies a template's files. `outline-session` gains `createOutline(title, starter?)`.
- **Storage:** `repository.create` writes the template's files after the details, then opens the project. `check-project` and `read-project` handle `suggestedTags`.
- **Contracts:**
  - `newProjectSchema` gains `template`;
  - a `TemplateView` list (id, kinds, outlines, unit) for the cards;
  - `createOutlineSchema` gains `starter`;
  - `preferences` gains `outlineGuideSeen`.
- **Desktop:** the template source wired in `index.ts`, and the IPC for listing templates and creating from one.
- **Presentation:** the card summary ("5 kinds of pages · 2 outlines · sessions") built from a `TemplateView`. `tagSuggestions` puts suggested tags first.
- **Interface:**
  - `WelcomeView.vue`: the picker;
  - a new `components/TemplateCard.vue`;
  - `StoryView.vue`: "New outline from…" and the outline guide;
  - a new `components/OutlineGuide.vue`;
  - `TagPills.vue`;
  - `TopBar.vue`: "New project…" in the app menu;
  - `stores/project.ts`: where the project opens after creating;
  - `base.css`.
- **Words:** `en.json` and `he.json`: the picker, the cards, the starters' names, the outline guide and "New outline from…".
- **Guide:** a new page, "Starting a book", in English and Hebrew, replacing the "New project" part of the getting-started page. Also `files/folder.mdx` (`suggestedTags`), the guide for AI assistants and its test, and the screenshot script (the picker, a new campaign, the outline guide).
- **Docs:** `DOMAIN_AND_FILE_FORMAT.md` (`suggestedTags`, how a template is applied), `UX_SPEC.md`, the Hebrew review list, and this plan's Results.

## Tests

Stated before coding.

- **Every template, in every language:**
  - creates a project that passes the project check with no warnings;
  - opens without any write (a no-op load);
  - has the kinds, chapter word, outlines and tags in the table above.
- **Creating:**
  - never writes over an existing folder;
  - gives a fresh project id and fresh chapter ids;
  - the title shows in `project.md` and `CONTENTS.md`;
  - Hebrew titles and titles that need quoting work;
  - a failure halfway leaves no half-made project open.
- **The template files** contain no ids, and every outline in a template is identical to its starter.
- **Starters:** every starter, in both languages, reads as an outline with no warnings, and "New outline from…" makes an outline equal to its starter under the author's title.
- **`suggestedTags`:**
  - read and written with key order and the body unchanged;
  - "+ Tag" offers them first, and once a page uses one, it's ordinary;
  - the row of tags doesn't show unused suggestions.
- **The outline guide** shows once, stays gone after Got it, and is reachable by keyboard.
- **End to end:**
  - create a D&D campaign, see five kinds and "Sessions", open on the Session plan, add an NPC and link it from the Session plan;
  - create a Hebrew novel and see Hebrew outline headings in RTL;
  - create a short story and land in Write on its chapter;
  - Blank behaves as today.
- **Architecture:** `packages/templates` imports nothing.

## Work order

1. The templates package with the four templates and the starters, in English. Their fixture tests come first.
2. `suggestedTags` in the domain, Markdown and storage.
3. Creating from a template (storage, application, IPC), test-first.
4. The picker on the start screen, and where the project opens.
5. "New outline from…", the outline guide, and tags.
6. The Hebrew templates, written in Hebrew, and the review list.
7. End to end, guide pages, screenshots, Results.

## Open questions

1. **Does a Novel start with a first chapter?** Recommendation: no. It opens on Main story, and Write offers "New chapter". The other way, it has an empty "Chapter 1" and opens in Write, as the roadmap's table says.
2. **"Save the Cat beats".** "Save the Cat!" is a trademark and the name of a book, so the starter shouldn't use the name. Recommendation: call it "Story beats" („נקודות מפנה”), with the fifteen beats under plain names ("Opening image", "Catalyst", "Midpoint", …). Or drop it and keep three starters plus Session plan.
3. **Where to keep it.** The mockup shows a "Where to keep it" field with Choose… on the picker. Today the folder is chosen in a dialog after Create. Recommendation: the field, remembering the last folder used, so everything is decided on one screen. Or keep the dialog, which is one less thing on the screen.
4. **"New project" while a book is open.** Today the app menu has "Open project…" but no way to make a new book without restarting the app on the start screen. Recommendation: add "New project…" beside it, showing the picker. Or leave it for later.

## Results

### What the author can do

- **Start a book from a template:** Novel, Short story, D&D campaign or Blank, on one screen with the title, the name on the cover, the book's language and "Where to keep it". The folder starts beside the last book, and "Choose…" picks another.
- **Begin ready to work:**
  - a short story opens in Write on its chapter;
  - a novel opens in Story on "Main story";
  - a campaign opens on its session plan, with five kinds of pages and "Sessions".
- **"New project…" in the ☰ menu,** over an open book; "← Back" returns to the book as it was.
- **"New outline" offers starters,** in the book's language: Three acts, Story beats, Character arc, Campaign arc and Session plan. Choosing one names the outline after it until the author types a name.
- **The outline guide** shows once, above the first outline opened, and "Got it" puts it away for good.
- **Suggested tags:** "+ Tag" offers a template's suggested tags in a new book. They're kept in `suggestedTags` in `project.md`, which any book can have.

### Changed from the plan while building

- **Templates are data, not folders of whole books.** Each template is a few lines in `packages/templates/src/index.ts`: its kinds, chapter word, tags, first chapter or not, and starters. The outlines are plain Markdown in `starters/en/` and `starters/he/`. One copy of each outline serves both the templates and "New outline", so the "identical to its starter" test isn't needed. The test that matters runs on the books the templates actually make: the project check, a no-op load and outlines with no warnings, in both languages.
- **The campaign's outlines are in the order Session plan, Campaign arc,** so it opens on the session plan by the plain rule "open on the first outline".
- **Suggested tags come after the book's own tags in "+ Tag", not before them.** In a new book, where they matter, there are no others. Once pages have tags, the ones in use are the better suggestion.
- **The guide:** "Your first book" was rewritten rather than adding a new page. "Outlines", "Tags" and "The book's folder" gained a paragraph each.
- **A new outline about a page of the book's own kind** (an NPC's arc) was still refused by the request schema, a gap left from Milestone 18. It now accepts a page in any kind's folder.

### Found and fixed by the tests

- **The book's language on the new-project form** stayed English after switching the interface to Hebrew, because it was set when the start screen first appeared. It now follows the interface's language each time the form opens.

### Tests

- Every template in both languages creates a book that passes the project check, reopens without a write, and has outlines with no warnings (`packages/storage/test/templates.test.ts`, 30 cases). Also covered: what each template makes, that nothing is written over an existing folder, that no ids come from a template, and that every starter in both languages reads cleanly.
- `suggestedTags` read as a list or a single tag; "+ Tag" suggestions; a new outline from a starter; the IPC refusing a folder it didn't offer; a new book opening on its first outline; a starter outline in the story's language.
- **End to end** (`apps/desktop/e2e/templates.e2e.ts`):
  - a D&D campaign: five kinds, sessions, the session plan, the outline guide once, an NPC linked from a card, and a starter outline;
  - a Hebrew novel, right to left, with Hebrew outline headings;
  - a short story landing in Write;
  - "New project…" and Back over an open book;
  - Blank, as before.
- The guide for AI assistants explains `suggestedTags`, and its test reads the example back through the app.

### Known limitations

- **The Hebrew template wording and starter outlines** are mine, and are on the review list for a Hebrew writer (`docs/reviews/hebrew-wording-milestone-16.md`, "Added in Milestone 19").
- **"Where to keep it"** shows the full path. A long path is cut with an ellipsis; "Choose…" shows it in full.
- **The later templates** (memoir, series bible, children's book, web serial) aren't built.

