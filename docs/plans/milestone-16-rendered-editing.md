# Milestone 16: Rendered editing everywhere

Status: **Built** (2026-11-04) on branch `milestone-16/rendered-editing`, awaiting owner review; results at the end. Owner answers so far (2026-11-04): heading keys as in Word and Google Docs; links edited letter by letter, as in Word and Docs; plain text in Write's ¶ menu for now (menus are revisited in Milestone 17); cursor movement tested in the built app; the open questions' recommendations accepted, with a link popup added (decision 10) and nikkud planned for later. Direction from `roadmap-16-approachable-studio-and-timelines.md` (Phase A); decisions in ADR 0010, which amends ADR 0004, point 2.

## Goal

An author edits every kind of page (chapters, outlines in Text, and every World page) and sees what the text **means**: a heading looks like a heading, a card looks like a card, a link is a name. Markdown symbols never appear unless the author asks for plain text.

Today the live preview hides Markdown only on lines without the cursor. The moment the author clicks into a heading, `## ` appears; into a sentence with a link, `[Bea](../characters/bea.md)` appears. Outline Text's hint teaches `## ` and `- `. For a writer coming from Word, all of this reads as broken.

**Out of scope:**

- Editing a link's address as text, separately from its words. The link popup changes it by choosing again (decision 10); typing an address by hand stays in plain text, to discuss later.
- Copying formatted text out to Word or email (Milestone 22).
- Nikkud (see "Later: nikkud").
- New formatting (strikethrough, tables, footnotes). They stay "kept as written".
- The layout around the editor (Milestone 17).

## What I found in the code

- **One editor for three surfaces.** `useChapterWriting` mounts `createChapterEditor` for Write (`WritingView.vue`), World pages (`ReferencePage.vue`, with the relationships section folded) and outline Text (`OutlineText.vue`, plus `outline-text.ts` for Tab, Shift+Tab and `@`). A change in `editor-codemirror` reaches all three at once.
- **`live-preview.ts`** is a view plugin. For the visible lines it hides emphasis marks, link brackets and addresses, heading and quote marks, and the `\` of a line break, and it draws `-`/`*`/`+` bullets as `•` and `* * *` as `⁂`. All of that is skipped on any line with a cursor (`activeLines`). The hidden ranges are **not atomic**: today that's harmless, because the line reveals everything as soon as the cursor arrives. Once marks stay hidden, the cursor could land inside an invisible `**`.
- **Links in chapters and pages** show as underlined text, with their address hidden only off the cursor's line. There are no chips.
- **`item-text.ts`** finds links by pattern (inline links, `[[wikilinks]]`, not inside code), and reads the `@name` being typed. **`item-editor.ts`** turns each link into an atomic chip for a card's one line. The roadmap asked for these chips everywhere; the owner chose Word-style editable links instead (decision 7), so the chips are replaced, in cards too.
- **`paragraph-direction.ts`** already does what the rest of the editor now needs. Its state field hides the direction markers, makes them atomic, protects marker lines from accidental edits, and isolates direction spans. It's added in `chapter-state.ts` together with per-line direction, so plain text can't show the markers yet without splitting the two apart.
- **`format.ts`**: `heading` only toggles `## `; there are no levels and no "body text". Bold or italic with nothing selected writes an empty `****` and puts the cursor between the marks. Once marks are hidden, that pair is invisible, so it could be left in the file.
- **`chapter-editor.ts`** already switches settings and content attributes with compartments, without remounting. `load()` replaces the whole state for each file, so a mode compartment has to be rebuilt on every load, carrying the current mode.
- **Formatting controls:** the format bubble and the ¶ menu exist only in Write. A World page has no bubble and no `@` link suggestions; outline Text has `@` but no bubble.
- **Shortcuts:** Ctrl+1, 2 and 3 are free. **Ctrl+0 is "Reset zoom"** in the app menu (`apps/desktop/src/main/app-menu.ts`). Word and Google Docs use Ctrl+Alt+1, 2, 3 for headings (Docs uses Ctrl+Alt+0 for body text); LibreOffice uses Ctrl+1, 2, 3 and Ctrl+0. Settled: Ctrl+Alt, as in Word and Docs.
- **Tests:** the editor's tests build an `EditorState` in Node, with no DOM. There's no jsdom or Vue test setup. Anything that needs a real view, such as arrow keys moving visually through Hebrew and English, is tested end to end in the built app (`apps/desktop/e2e`), which is also where direction and bidi behaviour is real.
- **Words:** the outline Text hint (`outline-text-hint`) teaches `## ` and `- `.

## What the author will see

### Writing, on every surface

- **Headings stay headings.** No `#` marks, on any line. Choosing **Heading 1**, **Heading 2**, **Heading 3** or **Body text** from the format bubble, the ¶ menu or the keyboard changes the current line.
- **Bold and italics** look bold and italic, never `**` or `*`, on the cursor's line too.
- **Bullets, numbers and quotes** are drawn, and the cursor can't land inside them. Numbers in a numbered list are shown as written.
- **Links are names**, in chapters, pages, outline Text and cards: the link's words in the link colour, never brackets or addresses. They are ordinary words to edit, as in Word and Google Docs:
  - Backspace or Delete erases one letter at a time; the link goes only when its last letter does.
  - Typing inside the words changes the words, and the link still points to the same page.
  - Typing right after a link, or right before it, is plain text outside the link.
  - Selecting across a link and deleting removes the selected part, as for any words.
- **A link has its own small popup.** With the cursor in a link's words, a popup beside it shows where the link goes ("Bea", or the web address) and offers **Open**, **Change link…** and **Remove link**. Change link… opens the same "Link to…" picker as everywhere else (or asks for a web address, for a web link) and changes only where the link goes; the words stay. Remove link keeps the words as plain text. Escape returns to the text.
- **The cursor never gets stuck.** Each arrow press moves past one character you can see, in English, in Hebrew, and in lines that mix them.
- **New text takes the formatting before it.** At the end of a bold word, typing continues in bold; at the start of the next word, in plain text. This is the same as in Word.
- **Backspace works the way it looks.** At the start of a heading, Backspace makes it body text. At the start of a bullet, it moves a detail out one level, or ends the list at the top level. Joining two lines keeps the first line's kind, as in Word.
- **Typing Markdown still works.** `## ` at the start of a line becomes a heading, `- ` a bullet, `> ` a quote, `**word**` bold. The marks disappear only once they're understood; `#hashtag` or `5 * 3` stays as typed.
- **"Kept as written"** passages look as they do now, with their count in outline Text.

### Outline Text

- Sections are headings, cards are drawn bullets, details are indented under them, and links are names.
- The hint, in plain words: "Enter adds a card, Tab makes it a detail, Ctrl+Alt+2 makes a section. @ links a page." (⌘⌥2 on a Mac.)
- The format bubble appears beside selected text, as in Write.

### World pages

- The format bubble appears beside selected text, as in Write.
- `@` or `[[` and part of a name offers pages and chapters, as in outline Text; Enter puts in the link, shown as its name.

### Plain text

- **Edit as plain text** in the page's `⋯` menu, in the outline's `⋯` menu (it opens Text as plain text), and in Write's ¶ menu (menus are revisited in Milestone 17).
- The same editor, same file: every mark visible, links as written, no drawn bullets, the folded relationships open, the direction markers visible and editable. Above it, a quiet banner: "Plain text. Changes here are saved exactly as typed." with **Back to normal view**.
- Switching either way keeps the cursor, the selection and undo.
- **Settings → Advanced → Show plain text when I open a page**, off by default.

## Decisions (proposed)

1. **One editor, two modes** (ADR 0010). A `mode` compartment in `createChapterEditor` holds the rendering: hidden marks, links as names, drawn bullets, hidden direction markers and their protection, the folded section. Plain text drops it. Per-line direction and the keys stay in both modes. `load()` keeps the current mode.
2. **Hidden ranges are computed in a state field, not a view plugin.** The state field makes them atomic, lets the change filters below see them, and lets the rules be tested in Node without a screen. They're recomputed only around the lines a change touches, to keep typing fast in long chapters.
3. **One rule for the cursor next to hidden marks.** Hidden marks behave as if they had no width. Where marks sit between two visible characters, the cursor rests on the side that comes first in the text, which is the logical side and not the screen side, so it means the same thing in Hebrew and English. In practice:
   - after a bold word, typing continues in bold;
   - before a bold word, typing is plain;
   - the arrow keys skip a hidden run and the next visible character in one press.

   Writing the rule logically, not by screen side, is what keeps it right in mixed-direction lines.

   **Links are the one exception:** at either end of a link, the cursor rests outside it, so typing next to a link never makes the link longer. That is what Word and Google Docs do.
4. **Line prefixes are atomic and hidden**: heading marks, bullets with their indentation, quote marks, and the `\` of a line break. This settles the question ADR 0004's amendment left for this plan: list and quote markers stay hidden on the cursor's line too.
5. **Edits never leave marks visible by accident.**
   - A deletion that cuts through formatting or a link keeps the surviving mark's partner. Deleting from the middle of a bold word to the next plain word keeps the bold correct; deleting the second half of a link's words keeps the rest a link.
   - A link whose words are all erased is removed, address and all, as an emptied direction block is today.
   - Joining two lines drops the second line's hidden prefix.
   - Bold or italic chosen with nothing selected starts a pending format; if the author types nothing and moves on, the empty `****` is removed, as an emptied direction block is today.
6. **Headings have levels**, on **Ctrl+Alt+1, 2, 3** and **Ctrl+Alt+0** for body text (⌘⌥ on a Mac), as in Word and Google Docs (owner, 2026-11-04). Ctrl+0 stays Reset zoom. The `heading` command becomes Heading 1, 2 and 3 plus Body text. Each changes exactly one line: it replaces any `#` prefix and writes nothing else. In outline Text, Heading 2 is a section. On Windows, Ctrl+Alt also acts as AltGr, so the keys are checked on Hebrew and English layouts.
7. **Links: words to edit, not chips** (owner, 2026-11-04). The brackets and address are hidden and atomic; the words between them are ordinary text in the link style. The same behaviour replaces the chips in card and detail fields (Milestone 11), so a link behaves one way everywhere; links are still added there by choosing a page, never by typing Markdown.
   - Links are found from the Markdown parser's `Link` nodes, plus `[[wikilinks]]` read as `item-text.ts` does.
   - **A `[[wikilink]]` without its own label stays whole** and is removed whole: its words are the name of the file it points to, so editing them would point it elsewhere. The app never writes wikilinks; they come only from other apps. A labelled one (`[[bea|Aunt Bea]]`) edits its label like any link.
   - Reference-style links and images stay "kept as written".
8. **Plain text is a session choice.** It lasts until **Back to normal view** or until another file opens; then the setting decides. Only the setting is saved, in app data.
9. **No new dependency**, no change to any file format or to what is saved.
10. **The link popup** (owner, 2026-11-04) uses the existing `useLinkPicker().pick()`, as card fields and page connections do. Changing a link replaces only its address (`(…)`), with the same relative-path rules as a new link; removing it deletes the hidden brackets and address and keeps the words. It sits where the format bubble would, and the format bubble wins while text is selected.

## Files

- **Editor (`packages/editor-codemirror/src`):**
  - `live-preview.ts`: rendering as a state field (decision 2); marks hidden on every line; prefixes atomic; heading lines carry their level for assistive technology (see Tests, Accessibility).
  - new `links.ts`: link ranges for a whole document (parser `Link` nodes and wikilinks), their hidden parts, the link style, whole wikilinks without a label; used by the chapter editor and `item-editor.ts`, whose chips go.
  - new `caret.ts`: arrow, Home/End and Shift variants over hidden ranges (decision 3, with the link exception); Backspace and Delete at prefixes; joining lines; keeping marks paired and removing emptied links (decision 5).
  - `format.ts`: heading levels and body text; pending bold and italic.
  - `paragraph-direction.ts`: split marker hiding and protection (rendered only) from per-line direction (both modes).
  - `chapter-state.ts`: the heading keys; per-line direction only.
  - `chapter-editor.ts`: the `mode` compartment; `setMode`, `mode()`; an initial mode in the options; the link under the cursor and where it is on screen, `changeLink` and `removeLink` (decision 10).
  - `outline-text.ts`: Backspace at the start of a card moves it out a level (decision 4, with Tab and Shift+Tab).
  - `index.ts`: exports.
- **Interface (`packages/ui-vue/src`):**
  - `composables/use-chapter-writing.ts`: the mode, the setting, `setMode`.
  - new `components/PlainTextBanner.vue`.
  - new `components/LinkBubble.vue`: the link popup (decision 10).
  - `components/WritingView.vue`, `ReferencePage.vue`, `OutlineText.vue`, `ItemTextField.vue`: the link popup.
  - `components/WritingView.vue`: heading levels in the bubble's ⋯ and the ¶ menu; Edit as plain text; the banner.
  - `components/ReferencePage.vue`: the format bubble, `@` suggestions, Edit as plain text, the banner.
  - `components/OutlineText.vue`: the format bubble, the new hint, the banner.
  - `components/StoryView.vue`: Edit as plain text in the outline's ⋯.
  - `components/FormatBubble.vue`: heading levels.
  - `components/SettingsDialog.vue`: an Advanced group with the setting.
- **Preferences:** `packages/contracts/src/preferences.ts` and `packages/application/src/preferences/preferences.ts` (`plainTextByDefault`, false).
- **Words:** `packages/i18n/src/messages/en.json`, `he.json` (heading levels, the banner, the menu item, the setting, the new hint). Hebrew wording written in Hebrew, not translated.
- **End to end:** new `apps/desktop/e2e/rendered-editing.e2e.ts`; updates to `writing.e2e.ts`, `outline-text.e2e.ts` and `references.e2e.ts` where they expect marks on the screen.
- **Docs:** ADR 0010 implementation note; `UX_SPEC.md` (the final keys); the user guide in English and Hebrew on the docs site (formatting, plain text); `docs/spikes/README.md` (the screen-reader check, once done).

## Tests

Stated before coding. Cursor movement over hidden marks and links is the highest risk, so its tests are written first, and each case runs in **English, Hebrew, and a mixed line**: a Hebrew paragraph with an English bold phrase and a link, and an English paragraph with a link to a Hebrew name. The visual cases run in the built app, where direction and bidi behave as they will for authors.

**Cursor (test-first; Node for the rules, end to end for what the screen does):**

- Left and Right across the start and end of bold, italics, bold-italic, a link, a whole wikilink, and a direction span: one press, one visible character; never a press that doesn't move.
- At each boundary, typing a letter lands inside or outside the formatting as decision 3 says.
- Home and End on a heading, a bullet at each depth, a numbered item, a quote and a line ending in a line break land after the prefix and before the `\`.
- Shift with arrows, Home and End: a selection never ends inside a hidden mark; it can end inside a link's words.
- Double-click on a bold word, or on a word of a link, selects that word without marks.
- Up and Down between a heading, a bullet and a paragraph keep the column the cursor came from.
- **Backspace and Delete:**
  - at the start of a heading → body text;
  - at the start of a detail → one level out;
  - at the start of a top-level bullet → a paragraph;
  - inside a link's words → one letter goes; the last letter takes the link with it, address and all;
  - selecting part of a link's words and deleting → the rest stays a link pointing to the same place;
  - typing at either end of a link → plain text outside it; typing inside → the link's words change, its address doesn't;
  - beside an unlabelled `[[wikilink]]` → it goes whole;
  - at the end of a line before a heading or bullet → the lines join without visible marks;
  - a selection from inside bold to plain text → the bold stays paired.
- Ctrl+B with nothing selected, then leaving: no `****` in the file; typing a word: the word is bold.

**Typing Markdown:**

- `## `, `- `, `* `, `1. `, `> `, `**word**`, `*word*` and `* * *` each convert, and the screen matches the text after every key.
- `#hashtag`, `5 * 3`, `C#` and an email address stay as typed.
- The same sequences in Hebrew text, and on a Hebrew keyboard layout end to end.

**Fidelity:**

- Every fixture in `tests/fixtures/chapters` and `tests/fixtures/outlines`, plus the sample pages, opens in rendered mode. The cursor is moved through every position, and the text then saved is byte-identical, CRLF and BOM files included.
- Rendered → plain → rendered keeps the text byte-identical, the selection, and undo, which steps back through edits made in both modes.
- The existing `chapter-state`, direction-marker, folded-section, `item-text` and `outline-text` tests pass unchanged, apart from expectations that marks are visible.

**Link popup:** Change link… rewrites only the address and keeps the words, the file's line endings and everything else; Remove link keeps the words; both undo in one step; Open goes to the page (or the web address, through the existing safe-open rule); keyboard only, Tab from the text reaches the popup and Escape returns; in Hebrew and English.

**Nikkud already in files:** in rendered mode, a letter with its vowel points is one step for the arrows and one Backspace removes the points before the letter, as today; bold and links around pointed words behave like any others (`tests/fixtures/outlines/unicode-niqqud-emoji.md` and a pointed chapter fixture).

**Headings:** each level and Body text writes exactly one line, replaces another level, leaves other lines alone, undoes in one step, and keeps CRLF; in Hebrew too.

**Links:** the link ranges agree with `item-text.ts` on every fixture; links in code aren't links; labelled and unlabelled wikilinks; reference-style links and images stay kept as written; a Hebrew name in an English line, and the reverse, shows in the right order (the link's words are direction-isolated). In a card field, the same editing as in a chapter, and Enter, Escape, Tab and `@` work as before.

**Speed:** a keystroke in the 150,000-character fixture stays within the existing performance budget (`vitest.perf.config.ts`) with rendering on.

**End to end:**

- Write an outline in Text without typing any Markdown symbol (Enter, Tab, the section key, `@`), switch to the Board, and see the expected sections, cards and linked names.
- Open plain text from the `⋯` menu, edit, go back, see the change, and undo it.
- With the setting on, a page opens in plain text.
- On a page, `@Bea` makes a link shown as "Bea"; erase it letter by letter and the file has no link left.
- In a chapter, change a link from Bea to Ilka with the popup: the words stay, the file's link points to `ilka.md`; Remove link leaves the words.
- Set a heading from the bubble in Write and on a page.
- Each of these runs once with the Hebrew interface and a Hebrew book.

**Accessibility:**

- Hidden marks aren't in the page, so they can't be read out (checked in the accessibility tree end to end).
- Headings are announced as headings, and a link reads as its words. This is checked by hand with Orca on Linux and, if available, NVDA on Windows. It closes the check left open in ADR 0004; if NVDA isn't available, it's recorded as a gap.

**Architecture:** `pnpm arch` passes; no new dependency.

## Work order

1. Test-first cursor rules and the rendering state field (`caret.ts`, `live-preview.ts`), English, Hebrew and mixed.
2. Edits around hidden marks: prefixes, joins, pairing, pending bold and italics.
3. Links as editable words everywhere (`links.ts`), with cards moved onto it; the link popup.
4. Heading levels, keys, the bubble and the ¶ menu.
5. The mode compartment, plain text, the banner and the setting.
6. Outline Text and World pages: hint, bubble, `@` on pages.
7. End-to-end tests, the screen-reader check, the guide in both languages, screenshots in both themes.

## Settled with the owner (2026-11-04)

- **Heading keys:** Ctrl+Alt+1, 2, 3 and Ctrl+Alt+0, as in Word and Google Docs (decision 6).
- **Links:** edited letter by letter, gone only when their last letter is (decision 7). This replaces the roadmap's chips, so ADR 0010 and `UX_SPEC.md` are updated.
- **Plain text in Write:** in the ¶ menu for now; menus are revisited in Milestone 17.
- **Cursor tests:** end to end in the built app, where direction and bidi are real; the rules also in Node.
- **Plain text** covers chapters, pages and outline Text; it lasts until Back to normal view or another file opens.
- **`@` links** on World pages, not in chapters; **the format bubble** on pages and in outline Text.
- **Copying out** with formatting waits for Milestone 22.
- **Typing at the start of a bold paragraph** is plain at first; to be checked with testers and changed if it doesn't feel right.
- **Plain text looks** like the same page in the same font, with every mark visible.
- **Changing a link** is in this milestone, through the link popup (decision 10). Typing an address by hand, separately from the words, is a later discussion.

## Later: nikkud

Optional nikkud (Hebrew vowel points), for poetry, children's books and names, possibly with a dedicated way to type them, since most Hebrew keyboards make it awkward. A good amount of specific work (input, fonts, search that ignores points, spellcheck), so it gets its own plan later. This milestone only makes sure pointed text that's already in a file keeps working (Tests, "Nikkud already in files").

## Results

### What the author can do

- Write in chapters, World pages, outline Text and card fields without seeing a Markdown mark, on any line: headings, bold, italics, quotes, bullets and links all show as what they mean.
- Move with the arrows, Home, End and Shift through hidden marks without the cursor ever stopping on one, in English, Hebrew and mixed lines. Typing takes the formatting before the cursor; next to a link it's outside the link.
- Edit a link's words letter by letter; the link goes with its last letter. With the cursor in or beside a link, a popup says where it goes and offers Open, Change link… (the usual picker, or an address for a web link) and Remove link.
- Set Heading 1, 2, 3 or Body text from the bubble's ⋯, the ¶ menu, or Ctrl+Alt+1, 2, 3 and Ctrl+Alt+0. Backspace at the start of a heading or bullet makes it ordinary text, or moves a detail out a step.
- Write an outline in Text with Enter, Tab, Shift+Tab, Ctrl+Alt+2 and @ alone: Enter at the end of a section starts its first card.
- Use the format bubble and `@` links on World pages, and the format bubble in outline Text.
- Choose Edit as plain text (¶ in Write, ⋯ on a page or outline) to see and edit every mark, under a banner with Back to normal view; undo carries across. Settings → Advanced → Show plain text when I open a page.

### Changed from the plan while building

- **What is hidden is worked out per line, on demand** (`hidden.ts`), not kept in a whole-document state field (decision 2). The view draws only visible lines; the rules read only the lines they touch. Same testability, less work per keystroke.
- **The Markdown package's own Backspace for lists** ran before ours and left a bullet's indentation behind; the cursor keys now run first (found by the end-to-end tests).
- **Two outline additions**, needed to write an outline without Markdown: Enter at the end of a section starts its first card, and a heading level on a bullet makes it a heading.
- **`@` on pages comes without the outline's keys:** link suggestions were split out of outline Text, so Tab and Enter on a page behave as in a chapter.
- **The link popup also shows with the cursor right beside a link**, since a click at a link's end rests just outside it.
- **Card fields lost their chips** (decision 7): their links are edited as words too, with the same popup.

### Tests

- `pnpm lint`, `pnpm typecheck`: clean.
- `pnpm test`: 71 files, 1106 tests passed (editor package: 128, of which `hidden.test.ts` holds the cursor and edit rules, written first, and fidelity over 14 chapter and outline fixtures with the cursor at every position).
- `pnpm arch`: 154 passed.
- `pnpm perf`: 7 passed; new `typing.perf.ts`: a letter typed in the middle of a 150,000-character Hebrew and English chapter takes a median of 5.4 ms, Backspace past hidden marks 0.01 ms (budget 16 ms).
- `pnpm build`: clean. `pnpm e2e` (whole suite): 95 passed, after updating two tests that expected raw Markdown in an unfolded relationships section and the old chip class.
- New `rendered-editing.e2e.ts` (10 tests): 16 English and 6 Hebrew cursor cases, checked by where a typed marker lands in the saved file; two mixed-direction lines walked press by press (every press moves, no mark shows); an outline written without Markdown, in the English and Hebrew interfaces; plain text and undo across modes; the setting; `@`, the link popup, and erasing a link; headings from the bubble in a chapter and on a page.
- Docs site: `astro build` clean, `pnpm site:test` 10 passed.

### Known limitations

- **Screen readers not yet heard** (Orca, NVDA). Hidden marks aren't in the page and heading lines carry their level; the hand check is still to do.
- **Screenshots** of the new menus, bubble and banner in both languages and themes are not retaken yet (`pnpm site:screenshots`).
- **Hebrew wording** (menus, banner, setting, guide pages) was written for this milestone and should be read by a Hebrew writer.
- **Typing at the very start of a bold paragraph** is plain (decision 3); to check with testers.
- **A link's address** can be changed only by choosing again, or in plain text.
- **Copying** carries Markdown marks into other apps (Milestone 22).
- `about/problems.mdx` in Hebrew was already behind its English page before this milestone, and still is.
