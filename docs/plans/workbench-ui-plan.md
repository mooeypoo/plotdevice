# Workbench UI, Plotting Mode and Book Language: Plan

Status: approved 2026-10-22, with every question in section 7 decided as recommended. Each ADR draft is accepted when its phase lands.
Date: 2026-10-22. Brief: [workbench-ui.md](workbench-ui.md).

What this planning session produced:

| Output (brief §11) | Where |
|---|---|
| Phased plan | `docs/roadmap.md`, section "Workbench, plotting mode and book language" |
| ADR drafts | `docs/adr/0017` (layout model), `0018` (readers and navigation; amends 0014/0015), `0019` (book language and vocabulary; amends 0016), `0020` (outline grammar) |
| `file-format.md` diff | [workbench-ui-file-format.diff](workbench-ui-file-format.diff) (applies cleanly with `git apply`; not applied) |
| Context placement and dependency rules | Sections 3 and 4 below |
| RTL qualification | Folded into ADR 0016's checklist as I7a–I7g |
| Dependency requests | None (section 6) |
| Questions | Section 7 |

Internal plans are excluded from the published manual (`plans/**` in `srcExclude`).

## 1. Where the brief is out of date with the code

1. **Layout storage isn't versioned or validated.** Brief §3 says the layout store is
   "versioned and validated, invalid storage reported". That holds for
   `plotdevice.writingPreferences` and `plotdevice.documentTabs` (zod, `version: 1`, translated
   notices). It does not hold for `plotdevice.layout` and `plotdevice.lastEntry`
   (`layout-store.ts`): they use ad hoc `typeof` checks, fall back silently and report nothing.
   `mainView` isn't persisted at all. The outline width lives in writing preferences, not in
   the layout store. *W1 migrates from all of these; ADR 0017.*
2. **The remembered outline is global, not per project.** `layout.outlinePath` is one path
   shared by every project. *It becomes a per-project binding (ADR 0017).*
3. **The outline highlights the open document, not Writing.** `use-outline-panel.ts`
   highlights links to `editor.entry`, while the brief asks for the Writing chapter.
   *Recommendation: highlight the active manuscript document, falling back to Writing (Q5).*
4. **The outline panel steps aside instead of showing the live draft.** When its outline is
   open in the editor, the panel defers to the editor. Reference instead shows the labelled
   live draft (ADR 0014). The brief assumes every reader shows the live draft.
   *ADR 0018 unifies them on the live-draft rule.*
5. **There is no Warnings panel.** `WarningsPanel.vue` is embedded in `ProjectOverview`, shown
   when no document is open. *W2 extracts it as a view.*
6. **There is no Search view.** The brief's view table lists one. *Recommendation: drop it from
   this plan; the palette jumps to entries, and full-text search goes to "Later" (Q6).*
7. **Feature isolation doesn't hold today.** The brief's rule "features don't import each
   other's components" is already violated: `editor` imports the Overview, Timeline,
   Interactions and ProjectOverview components; `welcome` imports `WarningsPanel`; `codex`
   imports `binder/NewEntryInput.vue`; `outline` and `reference` import editor composables;
   and `shared/markdown-view.ts` and `RenderedMarkdown.vue` import from `features/editor/`.
   Also, 44 feature files import `app/` stores, and `app/` imports feature components.
   *W2 fixes the feature-to-feature and shared-to-feature imports before adding the rules.
   Narrowing features' access to app stores is noted under "Later".*
8. **Navigation sets the view.** `editor-store.ts` (twice) and six composables write
   `layout.mainView = 'write'` directly, so the writable editor depends on the layout store.
   *W2 replaces this with a port and workbench commands (ADR 0018).*
9. **Reference is a singleton.** `reference-store.ts` holds one selection. Cards, peeks and
   splits need many readers. *W2 extracts a reusable reader.*
10. **Outlines belong to codex.** `CreateOutline`, `OutlineFile` and `listing.outlines` are in
    the codex context; the renderer opens outlines with `api.codex.openEntry`.
11. **The app already writes English into books.** Brief §4.5 says the only vocabulary
    entry is `outline_inbox`. That's true of *recognized* words. But several *seeded* words
    exist today: `novelTemplate` (statuses and YAML comments), `codex-templates.ts` (`Description`,
    `History`, `Arc`, `Untitled note`), `new-entry.ts` (`Untitled chapter`, `Untitled part`),
    `outline-file.ts` (`Outline`), the `DEFAULT_STATUSES` read fallback, and the `Untitled`
    file-name fallback in `shared-kernel/file-name.ts`. ADR 0016 explicitly kept "generated
    template language" unchanged, so L1 amends it (ADR 0019).
12. **There are no outline fixtures.** `fixtures/sample-novel/` has no `type: outline` file.
    *P1 adds them, including hostile ones, to the invented Salt Orchard sample.*
13. **Focus already exists as a mode, not a layout.** `layout.focusMode` hides chrome and works
    with any arrangement (Ctrl/Cmd+Shift+F). *Recommendation: keep Focus as a mode flag that
    any layout can enter, with fade-while-typing added in W5d, rather than a fourth preset (Q4).*
14. **The contract is at version 23.** Each phase that changes the API bumps it.

## 2. Conflicts with governing documents, and proposed resolutions

| # | Conflict | Proposed resolution |
|---|---|---|
| C1 | `file-format.md`: "The app never parses [the outline's] structure or changes it." | ADR 0020 and the "Outlines" rewrite in the diff: a small line-based grammar, line-exact edits only on explicit board actions or capture. |
| C2 | `file-format.md`: "The app never edits `novel.md` on its own." | Still true. The diff moves the sentence to its own bullet and lists every explicit writer: initialization, "Add to list" for statuses (which already writes `novel.md` today), and the explicit book-language action. `settings.vocabulary` is never written by the app. |
| C3 | `settings.language` is nested, but ADR 0004's editor handles only top-level keys. A later explicit change would need a new nested-key editor. | Use a top-level `language` key, like `calendar`. It's a property of the book, not an app setting, and the existing surgical editor can change it (Q1). |
| C4 | ADR 0016: "Generated template language ... remain[s] unchanged." | ADR 0019 amends it: seeds follow the book's `language`, never the interface. A pointer note is added to ADR 0016. |
| C5 | ADR 0015, one writer, versus side-by-side chapters | Kept. Splits are read-only readers; Write here uses the navigation queue (ADR 0018). |
| C6 | ADR 0014, a single Reference selection, versus cards, peeks and splits | Amended (not superseded) by ADR 0018: many readers, the same rules each. |
| C7 | The outline panel stepping aside (ADR 0012/architecture) versus the brief's live-draft rule | ADR 0018: the outline view shows the labelled live draft. |
| C8 | Layout storage: `plotdevice.layout`, `lastEntry`, `outlineWidth`, tab metadata | ADR 0017: shapes per user, bindings per project, one-time derivation in W1, old keys removed in W6. Tab metadata stays where ADR 0015 put it. |
| C9 | `MainView` and its menu commands | Become center-stage views (W4); `AppMenuCommand` values and accelerators are unchanged. |
| C10 | Board writes versus an open editor tab of the same outline. The watcher suppresses the app's own write, so the editor keeps a stale version and its next save would conflict. | ADR 0018: flush first, refuse while the outline's draft is unresolved, and the editor adopts the written text and version afterwards (as it already does after Properties writes). |
| C11 | `domain-is-pure` forbids libraries, so the outline grammar can't use markdown-it in main. | A conservative line-based parser in domain code (ADR 0020). When in doubt, a line is plain content. |

## 3. Bounded-context placement

### Outline structure: a new `outline` context

`src/main/contexts/outline/` owns `type: outline` files: listing, creation, open/save of text,
the grammar, structural commands, and capture. P1 moves the existing pieces out of codex.

Why not codex: codex is "story-world entries". Outlines share only listing and creation code
with it, and the grammar, board commands and vocabulary would roughly double its domain. Why
not a cross-context command: board edits change only the outline file. The parts that combine
contexts are read-only and belong in `src/main/queries/`:

- `queries/get-plot-board.ts` combines the outline context's `ReadOutlineStructure` with
  manuscript's chapter queries (status, POV, word count, threads) into a board DTO.
- Thread colors come from chronology's thread query, matched against the tags the outline
  context reports.

The existing generic rules (`contexts-are-independent`, `domain-is-pure`,
`application-depends-inward`, `queries-use-context-queries-only`) cover it without changes.
To keep the contract compatible during P1, the codex IPC handler fills `listing.outlines`
from the outline context's `ListOutlines` query. The renderer's `entry-owners` registration
for the `outline` kind moves to a new outline store.

### File vocabulary and seeds: `src/main/book-language/`

- **Workspace** parses `language` and `settings.vocabulary` from `novel.md` as raw values (it
  already owns `novel.md`'s own keys), with warnings for invalid values.
- **`src/main/book-language/`** is a pure, data-only module, not a bounded context: the seed
  catalog and vocabulary registry (JSON per language plus `qqq`), and `resolveWords(language,
  overrides)`. It is not in `src/i18n/`, because that module is presentation-only by ADR 0016
  and these words are book content.
- **The composition root** reads the workspace settings, resolves words once per project
  session, and injects plain inputs into each context: `OutlineWords` (`inbox`: write word plus
  recognized words), `CodexSeeds`, `ManuscriptSeeds`, and the `novel.md` template seeds for
  initialization. This follows the existing `CodexSettings` pattern.
- Nothing goes in the shared kernel.

## 4. Dependency-cruiser rules to add

Each rule gets a violating and a legitimate case in `tools/dependency-rules/fixture/`, proven
by `rules.test.ts`, as for the existing rules. Renderer rules land in W2 after the cleanup in
section 1, item 7. Main rules land in L1 and P1.

```js
// Renderer (W2)
{ name: 'workbench-model-is-pure',
  comment: 'The layout model is plain TypeScript: no Vue, Pinia, DOM helpers, stores or features.',
  from: { path: '^src/renderer/src/workbench/model/', pathNot: TEST_FILE },
  to: { pathNot: ['^src/renderer/src/workbench/model/', '(^|/)node_modules/zod/'] } },
{ name: 'features-never-import-the-shell',
  comment: 'Features register views; only the shell renders them.',
  from: { path: '^src/renderer/src/features/' },
  to: { path: '^src/renderer/src/workbench/shell/' } },
{ name: 'features-are-independent',
  comment: 'A feature never imports another feature. Shared helpers belong in shared/.',
  from: { path: '^src/renderer/src/features/([^/]+)/' },
  to: { path: '^src/renderer/src/features/', pathNot: '^src/renderer/src/features/$1/' } },
{ name: 'shared-ignores-features',
  comment: 'Generic UI code knows no feature and no workbench.',
  from: { path: '^src/renderer/src/shared/' },
  // W2: narrowed from (features|app|workbench); shared/ still uses app/ui-language-store
  // and app/entry-place in six files.
  to: { path: '^src/renderer/src/(features|workbench)/' } },
{ name: 'views-only-through-the-registry',
  comment: 'Feature components are reached through view descriptors, never imported by app or shell.',
  from: { pathNot: ['^src/renderer/src/features/', '^src/renderer/src/workbench/views/',
                    '^src/renderer/src/app/App\\.vue$'] },
  to: { path: '^src/renderer/src/features/.+\\.vue$' } },

// Main (L1)
{ name: 'book-language-is-pure',
  comment: 'Seeds and vocabulary are data and pure resolution: no Node, Electron, i18n or contexts.',
  from: { path: '^src/main/book-language/', pathNot: TEST_FILE },
  to: { pathNot: '^src/main/(book-language|shared-kernel)/' } },
{ name: 'contexts-receive-resolved-words',
  comment: 'Contexts get words from the composition root and never choose a language themselves.',
  from: { path: '^src/main/(contexts|infrastructure|queries|ipc)/' },
  to: { path: '^src/main/book-language/' } },
{ name: 'book-content-ignores-interface-language',
  comment: 'Contexts, shared infrastructure and read models never see interface catalogs.',
  from: { path: '^src/main/(contexts|infrastructure|queries)/' },
  to: { path: '^src/i18n/' } }
```

Notes:

- `views-only-through-the-registry` exempts `App.vue`, which shows the welcome screens before
  any project or workbench exists. During W3–W5 the Classic shell files are also exempt; W6
  removes that exemption.
- Today only `index.ts`, `app-menu.ts`, `ui-language.ts` and `ipc/workspace-ipc.ts` (the
  folder-picker title) import `src/i18n/` in main, so `book-content-ignores-interface-language`
  leaves `ipc/` out.
- Dependency rules can't see DOM globals. Add an ESLint override for `workbench/model/**`
  with `no-restricted-globals` for `window`, `document` and `localStorage`.
- The stray-literal test (ADR 0019) is a Vitest test in `tools/` that fails if any registry
  word appears as a string literal under `src/main/contexts/`.

## 5. Contract changes (proposed, by phase)

| Phase | Change |
|---|---|
| W5b | None. The cast strip is derived in the renderer from Properties and the live draft's body links, using the existing link resolver. The scene card uses Properties and the current outline. |
| W5a/c | None. Cards, peeks and splits reuse `openEntry` and property reads. |
| L1 | `ProjectDto.bookLanguage` (`declared: string \| null`, resolved tag and direction); `initialize(root, title, language)`; `setBookLanguage(language, version)`. |
| P1 | `api.outline`: `list`, `create`, `openEntry`, `saveText` (moved from codex; the codex methods remain as forwarding aliases for one version). |
| P2 | `api.outline.readBoard(path)` → board DTO with version, columns and beats (source-anchored ids), chapter facts, thread keys. `api.outline.capture({ path, version, text })`. |
| P3/P4 | `moveBeat`, `moveColumn`, `addBeat`, `retitleBeat`, `editNotes`, each with path, version and the beat's anchor, returning the new board, text and version, or `changed-on-disk`/`outline-shape-changed`. |

Payloads are validated with zod in the handlers, and failures stay semantic for the renderer
to translate (ADR 0016). Every new string is a banana-i18n message with `en`, `he` and `qqq`.

## 6. Dependency requests

**None.** Reasons:

- **Layout library (`dockview-vue`).** Not proposed, so the spike wasn't run. The regions are
  fixed and few, the existing splitter already handles RTL pointer and keyboard input (I4b),
  and CSS grid with logical properties covers docks, tabs and the shelf. A docking library
  would add RTL and keyboard risk that ADR 0016 would then have to qualify. If W3 proves
  otherwise, I'll run the brief's spike and ask before adopting anything.
- **Board drag and drop.** Native HTML drag and drop with keyboard move commands, as the
  binder does.
- **Palette matching.** A small subsequence matcher with `Intl.Collator` in the UI locale.
- **Outline grammar.** Handwritten and line-based, because domain code can't import libraries.

## 7. Ambiguities and questions

Each has a recommendation. Approve as a batch, or correct by number.

Decided on 2026-10-22: all questions, as recommended (Q1, Q2, Q8, Q11 and Q16 explicitly; the rest by accepting the recommendations).

**Q1. `language` at the top level instead of `settings.language`?** (Conflict C3.)
The brief puts it under `settings`. Changing a nested key later would need a new nested-key
editor, because ADR 0004's editor edits only top-level keys:

```yaml
language: he          # recommended: like calendar, a property of the book
settings:
  vocabulary:
    outline_inbox: רעיונות   # stays under settings: app configuration, written only by hand
```

*Recommendation:* top-level `language`. Keep `settings.vocabulary` nested.
**Decided (2026-10-22): approved.**

**Q2. Layout storage: per user, per project, or a project override?** (Brief Q1.)
*Recommendation:* split by what the data refers to. Shapes (where views sit, sizes, saved
layout names) are per user, so a new project opens the way you like to work. Bindings that
name files (pinned cards, locked splits, the current outline, the active layout per mode)
are per project, keyed like document tabs. No per-project override of shapes for now.
**Decided (2026-10-22): approved.**

**Q3. Peek trigger.** (Brief Q2.) Ctrl/Cmd+click already opens a link's target in the editor.
*Recommendation:* in rendered panels, plain hover after a short delay. In the editor,
Ctrl/Cmd+hover, because a resting mouse over prose shouldn't pop cards while you write.
Everywhere, put the caret or focus on a link and press a shortcut. My candidate is
Ctrl/Cmd+Shift+Enter; I'll confirm in W5a that it conflicts with nothing in CodeMirror or
in IBus/Hebrew input switching. Space combinations are avoided for that reason.
**Decided (2026-10-22): approved.**

**Q4. Is Focus a layout preset or a mode?** *Recommendation:* a mode flag over any layout (as
today), with chrome fading while typing. Presets are Write, Revise and Plot.
**Decided (2026-10-22): approved.**

**Q5. Which chapter does the outline view highlight?** *Recommendation:* the active document
if it's a manuscript entry, otherwise the Writing target. While you write, that is the
Writing chapter. While you read another chapter in a tab, it follows what you're reading.
**Decided (2026-10-22): approved.**

**Q6. Drop the Search view from this plan?** *Recommendation:* yes. The palette jumps to any
entry by title or alias. Full-text search is in "Later".
**Decided (2026-10-22): approved.**

**Q7. Card field defaults, and where field choice lives.** (Brief Q3.)
*Recommendation:* per-user, by entry kind, never in project templates. Defaults: character:
role, aliases, groups. Location: aliases. Chapter: status, POV, synopsis. Part: synopsis.
Note: none. Each card adds its first section.
**Decided (2026-10-22): approved.**

**Q8. Thread marker on beats.** (Brief Q4.) Options, as they'd look in the file:

```markdown
- Ilka finds the ledger. #strike              ← tag equal to a thread key (recommended)
- Ilka finds the ledger. #thread/strike       ← prefixed tag: adds a recognized word
- Ilka finds the ledger. [thread:: strike]    ← Dataview field: adds a recognized word
```

*Recommendation:* the first. It needs no recognized word (the key comes from `novel.md`),
Obsidian reads it as an ordinary tag, and it follows "prefer structure over words".
**Decided (2026-10-22): approved.**

**Q9. Which outline does the board open?** (Brief Q5.) *Recommendation:* one current outline
per project, shared by the board and the outline view, stored as a project binding, not in
the layout shape. It defaults to the first outline by title.
**Decided (2026-10-22): approved.**

**Q10. Capture: record the source chapter, and where does the Inbox live?** (Brief Q6.)
*Recommendation:* the Inbox is always in the current outline (Q9). Recording the chapter is
an option of the capture setting, off by default. When it's on, it appends a plain link and
no other words:

```markdown
## Inbox
- The orchard gate should creak every time. [[First frost]]
```
**Decided (2026-10-22): approved.**

**Q11. Seeded words: in the registry or a separate seed catalog?** (Brief Q7.)
*Recommendation:* separate catalogs in the same module. Seeds are write-only. Putting them
in the registry would make the app look for them in files, and that coupling is what the
brief wants to keep small.
**Decided (2026-10-22): approved.**

**Q12. Should `novel.md`'s YAML comments follow the book language too?** A Hebrew book would
get:

```yaml
calendar: gregorian            # גרגוריאני (תאריכים כמו 1952-10-03) או day-count
```

*Recommendation:* yes. The comments are there for the writer reading `novel.md` in another
editor. Keys and values stay canonical. Mixed-direction comment lines need checking in
Obsidian as part of I7f.
**Decided (2026-10-22): approved.**

**Q13. Should the default statuses (when `novel.md` has no `statuses`) follow the book
language?** Today a hand-made `novel.md` without `statuses` gets English suggestions.
*Recommendation:* yes, but only when `language` is set. Without it nothing changes, so
existing books are unaffected. The suggestions are display defaults only; nothing is written
until you add one.
**Decided (2026-10-22): approved.**

**Q14. Which book languages can you choose?** *Recommendation:* the languages that have seeds
(English and Hebrew) when initializing or changing the language. A hand-written tag the app
has no seeds for is kept, used for direction, and gets English seeds, with no warning.
**Decided (2026-10-22): approved.**

**Q15. Can you change the book language in L1, before the settings editor exists?**
*Recommendation:* yes, with one explicit action in Project Overview that edits only the
`language` key. Without it, existing books could get Hebrew seeds only by hand-editing
`novel.md`. Changing it never rewrites words already in your files.
**Decided (2026-10-22): approved.**

**Q16. Numbered lists in an outline.** Moving `2.` above `1.` without renumbering leaves odd
source text, and renumbering would change lines you didn't move. *Recommendation:* show
numbered items as plain content in P2–P4, not as beats. Revisit if you use numbered outlines.
**Decided (2026-10-22): approved.**

**Q17. Where does the Classic layout switch live during W3–W5?** *Recommendation:* the View
menu, per user, removed in W6.
**Decided (2026-10-22): approved.**

**Q18. Scene card and board are chapter-level until scenes exist.** (Brief Q8.)
*Recommendation:* confirmed.
**Decided (2026-10-22): approved.**

**Q19. Localized frontmatter keys.** (Brief Q9.) *Recommendation:* never in files. Keys are
schema. They're always shown translated and written canonical. Revisit only if writers ask.
**Decided (2026-10-22): approved.**

**Q20. Phase granularity.** The brief's W4 ("Reference to the page") holds six features. I
split it into W5a–W5d so that each fits one session, and added W2 ("Seams") for the cleanup
in section 1. That gives 6 W phases (W5 in four parts), 1 L phase (two parts) and 4 P phases.
*Recommendation:* accept this split.
**Decided (2026-10-22): approved.**

Next step: W1 in its own session, beginning with a plan-mode file list as `AGENTS.md` requires.
