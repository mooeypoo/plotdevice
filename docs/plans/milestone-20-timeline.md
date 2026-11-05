# Milestone 20: The timeline of the book's threads

Status: **Approved** (owner, 2026-11-05) after the research and design session (`timeline-design.md`, ADR 0012 as amended) and the mockups, with the main outline added the same day. The first version of this plan (one outline's timeline, then lanes by links) is replaced.

## Goal

The author keeps **parallel threads in step.** Board and List already show the plot laid out; the timeline shows the book's outlines side by side, one row each, lined up where the author says they meet:

```
               Spring, 1912      The night of the storm   ┆                After the auction
Main story     Ilka finds the    Bea leaves Marrow        ┆                The auction
               letter  [Ch 2]    [Ch 1]                   ┆
Bea's path     Childhood         Hiding at the boathouse  Three weeks in   ·
               [Ch 7]            ⇄ lined up               the city
```

- each outline is a **thread**, its sections **moments** and its cards **events**;
- a section is **lined up** with another outline's moment by one short line under its heading (`DOMAIN_AND_FILE_FORMAT.md`, "Lining up");
- sections not lined up keep their order and sit between their lined-up neighbours;
- no dates are parsed, and no new file is written.

**Out of scope:**

- **Highlighting a page's or a tag's cards** and **Show on the timeline** (Milestone 21).
- **Bars, eras, real dates, a richer story-order view, lanes from links** (roadmap, Phase C "Later ideas").
- **Plot, World and Write as three areas** (deferred; see "Placement" below).

## What I found in the code

- **Outlines already keep a section's intro paragraph** (text after the heading, before the cards; fixture `section-intro-paragraphs.md`). Lining up gives one such paragraph a meaning; the reader doesn't need a new block type.
- **Link resolution drops the `#` part** (`markdown/src/links.ts`). Lining up needs it kept, plus a heading-anchor rule.
- **Story switches views with a plain list** in `StoryView.vue`: `['board', 'outline', 'text']`. The timeline doesn't join that list: it is one item in the Plot group, opened like an outline.
- **The Board's columns come from `boardColumns`** in `presentation/outline-views.ts`, and a move is `boardDrop` → `actions.dropAt`. A timeline card move reuses both, per thread.
- **Cards don't name the chapter they tell.** The links are parsed for "Linked from", and `references.ts` lists chapters in reading order, so a chip is a small projection.
- **Renaming a section edits one outline file.** Updating line-ups that point to it is new: a targeted edit in each outline that links there.

## Design first

First mockups (2026-11-05): https://claude.ai/artifact/2u7Ab9WaYXybFJtwf7sWyW, in the Milestone 17 look, Hebrew in light and English in dark: the timeline with three storylines, **Line up with…**, a lined-up outline on its Board, and one storyline so far. Still to draw:

- lining up by dragging a section;
- a "can't line up" section;
- a long book (60 moments) and a narrow window.

Decided there: how a moment's label sits above its column; how "not lined up" looks; the chip; the lined-up mark (⇄) on Board, List and Text; how wide a gap is.

## What the author will see

### The timeline

- **Timeline** at the top of the Plot group, above the outlines.
- **Rows:** one per storyline, the storyline's name at the reading-start edge. Each row is a labelled region.
- **The top row is the main outline,** with a small "Main" label (also beside it in the sidebar, where it is listed first). Its sections are the named columns, in its file order, even where nothing lines up with them.
- **One quiet line above the grid says where the names come from:** "Column names come from the main outline, Main story. **Change…** · Click a name to rename it; + adds a section." It is always there, not a tip that disappears.
- **Column titles are the main outline's own section headings,** nothing else: not chapters, not dates, not a separate list. Clicking one renames that section in its outline (and updates line-ups that point to it); hovering shows **+** between two columns, which adds a section there, as **Add section** does on the Board.
- **Changing the main outline:** **Make this the main outline** in an outline's ⋯ (sidebar, header or timeline row), or **Change…** above the grid. A short message: "The timeline's columns will take the names of Bea's path's sections. Main story moves below it, and what is lined up stays lined up. Nothing in your outlines changes: not the text, not the line-ups. You can switch back at any time." Only `project.md` is written.
- **Columns:** earlier on the reading-start side (right in Hebrew). A section lined up with a main-outline section, directly or through a chain, shares its column. Sections not lined up open a narrow, untitled column in the gap between their neighbours, show their own name in their cell, and look a little lighter.
- **Dates, if wanted, are just headings.** An author who wants years makes an outline whose sections are "1840", "1912", "1913" and makes it the main outline; nothing in the app parses them.
- **One outline so far:** it is the main outline, shown alone, with the invitation to add a storyline.
- **Cards** are compact: their text and a chip per chapter they link to ("Chapter 3 · The Crossing", or "Session 3"). Details are folded; a card opens as on the Board.
- **Long books scroll sideways;** the moment labels and thread names stay in view.

### Lining up

- **Drag a section's label** onto a moment of another thread, or **Line up with…** in its menu: a list of the other threads' moments.
- The app writes one line under the section's heading, in the project's language: "At the same time as The night of the storm" / "במקביל ל־ליל הסערה". Board, List and Text show it as a quiet ⇄ line.
- **Unpin** in the same menu removes it.
- **Can't line up:** a target that is gone, or a line-up that contradicts the thread's own order (lined up after a later moment). The section sits in its gap with a quiet mark; its menu offers **Line up again…** and **Unpin**. Nothing is rewritten on its own.

### Moving and adding

- **Cards** move between moments of their own thread, by dragging or the Move menu: the same file change as on the Board. Cards don't move between threads.
- **+ Add a card** at a moment of a thread.
- **New thread** creates an outline (the existing New outline flow) and opens it on the timeline.
- Renaming sections and editing card text happen on Board, List and Text.

## Decisions

1. **Which outlines are storylines:** all of the book's outlines (owner, 2026-11-05). A storyline can be hidden from its row's ⋯; hidden storylines are remembered per book with the workspace, not in the files.
2. **The main outline** (owner, 2026-11-05) is `mainOutline` in `project.md`, a project-relative path: a book property that travels with it, unlike hiding a row.
   - Missing key, or a file that is gone: the first outline in the Plot group (nothing is written on open).
   - A new book from a template names its first outline. Adding an outline to a book without the key writes the key with the current main first, so a new outline never takes over by accident (outlines are listed by file name today, `outline-repository.ts`).
   - Deleting the main outline in the app: the confirmation names the outline that becomes main, and the key is updated.
   - Changing it writes only `project.md`. Line-ups read both ways, so none is rewritten and the grid keeps every line-up.
3. **The lining-up rule,** exactly as in `DOMAIN_AND_FILE_FORMAT.md`: the first intro paragraph with exactly one link to another outline's section.
4. **Anchors:** written as heading slugs; the reader also accepts the heading text. Renaming a section in the app updates every line-up that points to it, file by file, with the usual revision checks; a file that changed outside the app is left alone and its line-up shows as "can't line up".
5. **Domain:** project: `mainOutline` and the rule that resolves it; outline: a section's `lineUp` (target outline id, anchor), and commands `LineUpSection` and `UnpinSection`. Markdown adapters add, replace or remove only that paragraph.
6. **Presentation:** a pure `timelineGrid(main, threads, chapters)` returning columns, rows and cells, with "not lined up" and "can't line up" flags. Columns are a merge of each thread's order under its line-ups; a cycle marks the offending line-ups as "can't line up".
7. **Placement:** the grid knows nothing of where it is shown. `BookTimeline.vue` draws a grid it is given; where it opens is one navigation entry. Moving it to a Plot area later changes that entry only.
8. **Words:** "storyline" (the row) and "main outline" are working names, kept in i18n only, with stable internal ids, as the replaceable-names test requires.

## Files

- **Domain:** `project` (`mainOutline` and which outline is main), `outline/outline.ts` (line-ups, the commands' rules), their tests.
- **Storage:** reading and patching `mainOutline` in `project.md`; template creation names the first outline.
- **Markdown:** `links.ts` (keep the `#` part; anchors), `read-outline.ts` (line-ups from intro paragraphs), `edit-outline.ts` (add, replace, remove the line), tests and fixtures.
- **Application:** the two commands; **Make this the main outline**; adding and deleting outlines keep the main outline; renaming a section updates line-ups elsewhere.
- **Contracts:** the timeline in the remembered place; hidden threads.
- **Presentation:** new `timeline.ts` (`timelineGrid`, chapter chips, accessible names such as "Bea's path, The night of the storm, Hides the letter"), its tests.
- **Interface:** new `BookTimeline.vue`, `TimelineCard.vue`; the Plot group's Timeline item; Board, List and Text show the ⇄ line; `base.css`.
- **Words:** `en.json`, `he.json`, `qqq.json`: Timeline, storyline, main outline, Main, the column-names line, Make this the main outline and its message, Line up with…, Unpin, Line up again…, can't line up, the written line in each language, the empty state, accessible names.
- **Guide:** a new page, "Timeline", in English and Hebrew, opening with where the columns come from (below); `planning/outlines.mdx` (the main outline); screenshots.

### What the guide says first

> The timeline shows your outlines side by side, one row each. The **column names are the sections of your main outline**, the one marked *Main*. To add a column, add a section to it (the **+** between two columns does that); to rename a column, click its name. To use another outline's sections as the columns, choose **Make this the main outline** from that outline's ⋯. Nothing in your outlines changes when you do.
- **Docs:** ADR 0012 implementation note, the Hebrew review list, Results.

## Tests

Stated before coding.

- **Domain:** which outline is main (named, missing key, missing file, one outline); a section lines up with another outline only; one line-up per section; unpin.
- **Storage:** writing `mainOutline` keeps the rest of `project.md` byte for byte; adding an outline to a book without the key writes the current main; a new book from each template names its first outline.
- **Markdown:**
  - reading line-ups in English and Hebrew, with the words around the link free;
  - links to pages, chapters or the same outline line nothing up;
  - anchors for Hebrew, punctuated and repeated headings, and heading text accepted;
  - line up, then unpin, gives the original file byte for byte; replacing a line-up changes only that line;
  - an older-style outline with an ordinary intro paragraph is untouched.
- **Application:** renaming a section updates line-ups in other outlines; a stale file is refused and reported.
- **Presentation:** the same line-ups with each outline as main give the same groups of sections in step; the grid with sections before, between and after line-ups; two threads sharing a gap; chains (A lined up with B, B with the main story); contradictions and cycles; missing targets; chips with the book's chapter word.
- **Fidelity:** a timeline card move and the equivalent Board move produce byte-identical files.
- **Architecture:** `timeline.ts` imports nothing from the interface or navigation.
- **Performance:** 300 cards, 12 threads, 60 moments within the existing budget (`pnpm perf`).
- **Accessibility:** threads as labelled regions; cards reachable by keyboard in moment order; Move and Line up with… as the keyboard equivalents of dragging.
- **End to end:** open the timeline; read where the columns come from; rename a column; make another outline main and see only `project.md` change; line up Bea's section by menu and see the file; move a card; unpin; Hebrew: earlier moments on the right.

## Work order

1. Mockups and this plan: approved by the owner on 2026-11-05. The drag and "can't line up" mockups are drawn when step 5 starts.
2. Anchors and line-ups in Markdown and the domain, test-first.
3. `timelineGrid` and its tests.
4. The timeline screen: rows, columns, cards, chips, moving cards.
5. Lining up by menu, then by dragging; unpin; can't line up; renames.
6. Accessibility, Hebrew, the guide, screenshots, Results.

## Open questions

Answered by the owner on 2026-11-05:

1. **Which outlines show:** all of them, each hideable.
2. **What the author calls a thread:** **storyline / קו עלילה**, as a working name in i18n.
3. **The written line:** "At the same time as [moment]" in English and "במקביל ל־[moment]" in Hebrew, written in the project's language. Wording can change later; the rule doesn't depend on it.
4. **Direction:** earlier moments on the reading-start side, right in Hebrew and left in English, as "before" reads in each language.
5. **Chains** (A lined up with B, B with the main story) are allowed.

6. **Column names** come from a **main outline** the author can see and change; a new or one-outline book's first outline is main; changing it warns of nothing because nothing in the outlines changes, and the message says so.

No open questions remain.
