# Milestone 20: Timeline view of an outline

Status: **On hold** (2026-11-05). The owner wants dedicated research and design for timelines first; this plan is the starting point once that is done. Earlier: proposed 2026-11-05. Direction from `roadmap-16-approachable-studio-and-timelines.md` (Phase C) and ADR 0012 (accepted 2026-11-04). The roadmap's Milestone 21 (lanes) follows.

## Goal

The author sees the plot laid out in time, from an outline they already have. **Timeline** is a fourth view beside Board, List and Text:

- the outline's sections are **moments** along a line, in file order, labelled by their headings;
- the cards are the **events** at each moment;
- no dates are parsed, and nothing new is written to the file (ADR 0012).

**Out of scope:**

- **Lanes** (Milestone 21), unless open question 1 says otherwise.
- **Tags on cards** (ADR 0012, decision 4, still open).
- **Story order vs. book order, several outlines on one line, real dates** (ADR 0012, "Later").

## What I found in the code

- **Story switches views with a plain list** in `StoryView.vue`: `['board', 'outline', 'text']`. Each one is its own branch in the template, and the keyboard shortcut and the ⋯ menu each check which view is showing.
- **The view is remembered once per book, not per outline.** `rememberPlace` saves the workspace, the outline and its view (`board` or `outline`), and `use-remembered-place` restores them. The roadmap's "remembered per outline, like Board and List" describes something the app doesn't do today.
- **The Board already lays out one column per section,** from `boardColumns` in `presentation/outline-views.ts`. A move is `boardDrop` → `actions.dropAt`, the same outline edit the Move menu uses. A Timeline move can reuse both unchanged, which is what ADR 0012 asks ("a Timeline move is a Board move").
- **Cards don't name the chapter they tell.** A link to a chapter shows as linked text inside the card, wherever the author wrote it. Showing "where each event is told" as a label is new, but simple: the links are already parsed for "Linked from", and `references.ts` already lists chapters in reading order.
- **Nothing on the screen says "timeline" yet.** The Milestone 17 mockups deliberately left the view switch with three views until the timeline was designed.

## The main question: what a timeline adds before lanes

Without lanes, a timeline shows the same thing as the Board: sections side by side, cards under each. What it adds is small:

- a line with a marker per moment;
- the chapter labels on cards;
- a denser layout that fits a long story on one screen.

Lanes (Milestone 21) are what authors asked for: each character's path, where paths cross, who disappears for half the book.

Two ways to go:

- **A. As planned:** Milestone 20 is the Timeline view and the view registry; Milestone 21 adds lanes. Smaller steps, but the first one gives authors little they can't already see on the Board.
- **B. One milestone with both** (recommended): the view, the registry and lanes by a kind of page or by tag. Lanes' P2 and P3 ideas stay later. It's larger, roughly the size of Milestone 18, but it's the first version worth showing a tester.

The rest of this plan is written for **B**. Under **A**, everything under "Lanes" moves to Milestone 21.

## Design first

ADR 0012 and the Milestone 17 notes ask for a design session before building: no Timeline control appears until it's designed. So, before code:

- **Mockups** in the Milestone 17 design canvas, Hebrew in light and English in dark:
  - the timeline with no lanes;
  - lanes by Characters;
  - lanes by a tag;
  - a long book (40 moments);
  - a narrow window;
  - one page's timeline opened from the page.
- **Decided there:**
  - how a moment is drawn: a marker on a line with the heading under it, or a column header;
  - how wide a moment is;
  - how a card shared by two lanes is marked;
  - how the chapter label looks;
  - where "Lanes by…" sits in the header row.

## What the author will see

### Timeline

- **A fourth view in the switch:** Board · List · Text · Timeline. The view is remembered like the others.
- **A horizontal line of moments,** earlier moments on the reading-start side: right to left in a Hebrew interface (ADR 0012, decision 5). Each moment's heading is under its marker, and its cards are stacked below. Cards before the first section form a moment called "Before".
- **Cards are compact.** They show the card's text and a small label for each chapter they link to ("Chapter 3 · The Crossing", or "Session 3" in a campaign). Details are folded; the card opens as it does on the Board.
- **Long stories scroll sideways.** The line stays in view while the cards scroll under it.
- **Moving a card:** drag it to another moment, or use the Move menu ("Move to: Spring, 1912"). Either way it's the same file change as moving it on the Board.
- **Editing stays on Board, List and Text.** The timeline can add a card to a moment, but renaming sections and editing details happen in the other views.

### Lanes (option B)

- **"Lanes by…"** in the header row: nobody (one line), any kind of page in the book (Characters, NPCs, Factions…), or Tags.
- **A card is in a page's lane when it, or one of its details, links to that page.** The links are the ones "Linked from" uses; nothing is guessed from names.
  - A card linked to two pages shows in both lanes, marked as shared.
  - Cards with no links go in a folded lane at the end ("No one", or the kind's own word: "No faction").
- **Which lanes:**
  - every page of the kind, A to Z;
  - or only the pages with chosen tags ("main cast"), using Milestone 12's tag filter;
  - a lane can be hidden from its own ⋯.
- **Gaps are visible:** a moment where a lane has no card shows as an empty stretch of that lane.
- **From a page:** "Show on the board" gains **Show on the timeline**, which opens the outline's timeline with that page's lane alone.
- **Moving a card between moments** works in lanes too. Moving it between lanes is not offered, because a lane comes from a link, not a place in the file.

## Decisions (proposed)

1. **A view registry,** internal only (ADR 0012, decision 6). Each view has an id, a message key for its name, whether it can be remembered, and its component. Board, List and Text move onto it now, because Timeline would otherwise be a fourth branch in each of the three places that check views. No plugin API.
2. **`timeline` joins `outlineViewKindSchema`.** It's remembered with the book's place, like Board and List. Remembering per outline isn't built (open question 3).
3. **Projection in presentation:**
   - `timelineMoments(outline)` builds moments and their events from the outline view;
   - `timelineLanes(moments, links, choice)` assigns events to lanes.
   Both are pure, and both reuse `boardColumns`' paths, so a move is the existing `boardDrop` / `dropAt`.
4. **Chapter labels** come from links in the card and its details to files in `manuscript/`, named as the chapter list names them, with the book's word for chapters (Milestone 18).
5. **Lane links** come from the outline's own parsed links, resolved the way "Linked from" resolves them. A link to a missing page shows that page's lane only under "No one".
6. **Remembered lane choice:** per book, with the outline view. It's saved by internal ids only (a kind's folder, a tag's key).

## Files

- **Contracts:** `outline.ts` (`timeline` in the view kinds; the lane choice in the remembered place).
- **Presentation:**
  - new `timeline.ts`: moments, events, chapter labels, lanes, and the screen-reader name of a card ("Bea, Spring 1912, Ilka finds the letter");
  - its tests.
- **Interface:**
  - new `composables/outline-views.ts`: the registry;
  - new `components/OutlineTimeline.vue` and `components/TimelineCard.vue`;
  - `StoryView.vue`: the switch, the shortcut and the ⋯ menu from the registry;
  - `ReferencePage.vue`: Show on the timeline;
  - `stores/view.ts`, `use-remembered-place.ts`, `base.css`.
- **Desktop:** the remembered place's schema.
- **Words:** `en.json`, `he.json` and `qqq.json`: the view's name, "Before", "Lanes by…", "No one", Show on the timeline, and the accessible names.
- **Guide:** a new page, "Timeline", in English and Hebrew; `planning/outlines.mdx` ("Four ways to see it"); screenshots.
- **Docs:** ADR 0012 implementation note, `UX_SPEC.md`, the Hebrew review list, Results.

## Tests

Stated before coding.

- **Presentation:**
  - moments from sections in file order, with empty sections, cards before the first section ("Before"), Hebrew and English headings;
  - chapter labels from links in cards and details, with the book's chapter word;
  - lanes from links in cards and details, for built-in and custom kinds;
  - shared and unlinked cards, and links to missing pages;
  - lane order, deterministic and A to Z in the interface's language;
  - lanes by tag.
- **Fidelity:** a shared fixture where a Timeline move and the equivalent Board move produce byte-identical files.
- **Performance:** 300 cards × 40 lanes projected within the existing budget (`pnpm perf`).
- **Accessibility:**
  - each lane is a labelled region, and each moment a labelled group;
  - cards are reachable by keyboard in moment order;
  - the Move menu works as the keyboard equivalent of dragging.
- **End to end:**
  - Board → Timeline → List with no change to the file;
  - move a card on the Timeline and see the file change;
  - Hebrew: earlier moments on the right;
  - lanes by Characters, then by a tag;
  - Show on the timeline from a page.

## Work order

1. The design session and mockups, then this plan revised to match.
2. The view registry, with Board, List and Text moved onto it, changing nothing on screen (the existing e2e tests prove it).
3. The timeline projection and its tests; then the view, moving cards and chapter labels.
4. Lanes, the lane choice, Show on the timeline, performance.
5. Accessibility, Hebrew, the guide, screenshots, Results.

## Open questions

1. **One milestone or two?** Recommendation: **B**, the timeline and lanes together, because a timeline without lanes repeats the Board. Or **A**, as the roadmap has it.
2. **Earlier moments on the reading-start side** (right in Hebrew) is a working rule that ADR 0012 asks to check with Hebrew testers before it ships. Recommendation: you decide from the mockups, and the testers check it after the release. Or wait for testers before shipping.
3. **Remember the view per outline** (the roadmap's wording) or per book, as Board and List are today? Recommendation: per book, as today, so the four views behave the same. Per outline is a small change later if testers want it.
4. **Editing on the timeline.** Recommendation: move cards, open them and add a card to a moment; editing text and sections stays on Board, List and Text. Or full editing, as on the Board.
