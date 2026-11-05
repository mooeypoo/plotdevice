# ADR 0012: Timelines as views of outlines

Status: **Accepted** (owner, 2026-11-04, roadmap decisions D7 and D8) · **Amended** (owner, 2026-11-05: threads and lining up, `docs/plans/timeline-design.md`) · Built in Milestones 20 and 21

## In short

Board and List already show the plot laid out. What authors can't see yet is **parallel threads in step**: where Bea is while Ilka finds the letter, and what happened in Marrow a century before.

So the book gets **one timeline**. Each thread is an outline the author already has, one row each. The author **lines up** a few moments of a thread with moments of another outline, and everything else falls into place between them:

```markdown
# Bea's path

## Childhood in Marrow
- Learns to sail

## Hiding at the boathouse
At the same time as [The night of the storm](main-story.md#the-night-of-the-storm)
- Hides the letter in the boathouse

## Three weeks in the city
- Sells the brooch
```

"Hiding at the boathouse" sits under "The night of the storm"; "Childhood in Marrow" comes before it and "Three weeks in the city" after it. There is no timeline file, no date and no new field. A timeline is still another way to look at outlines.

## Decision

1. **One timeline per book, one row per outline** (a **thread**). It is opened from the Plot group, not as a view of a single outline; each outline's Board · List · Text switch is unchanged.
2. **Moments are sections.** Each `##` section is a moment, in file order, labelled by its heading, and its cards are the events. Cards before the first section form a moment called "Before". **No dates are parsed**, so "Day 3", "Before the war" and invented calendars all work.
   - **The book has a main outline,** and its section headings are the timeline's column titles, in its file order. Nothing else names a column: not chapters, not dates, not a separate list. The timeline says so in one line above the grid ("Column names come from the main outline, Main story. Change…"); renaming a column renames that section, and **+** between columns adds one.
   - **Which outline is main** is written in `project.md` (`mainOutline`), so it travels with the book. A new book's first outline is main; in a book that doesn't name one, the first outline in the Plot group is main, and the app writes that choice down the next time an outline is added, so adding an outline never changes it. The author makes another outline main from its ⋯; a short message says what changes (the column names) and what doesn't (the outlines and their line-ups).
   - Sections of other outlines share a main column when lined up with it, directly or through a chain; the rest sit in untitled gap columns under their own names. An author who wants years makes an outline whose sections are years and makes it main.
3. **Lining up is written in the outline,** as a section's intro paragraph (text after the heading, before the cards, which the format already keeps) that contains exactly one link to a section of another outline. The words around the link are the author's own; the app writes "At the same time as" / "במקביל ל־". The section keeps its own heading. The app writes and removes this line only when the author lines up or unpins.
4. **Sections not lined up** keep their file order and sit between their lined-up neighbours, drawn lighter, so the timeline never suggests threads are in step where the author hasn't said so.
5. **Nothing is guessed.** Lining up comes only from those links. A link whose section is gone, or which contradicts the thread's own order, is shown as "can't line up" and never rewritten without the author.
6. **Moving a card between moments of its thread is a Board move:** the same file change. Cards don't move between threads.
7. **Where each event is told:** a card that links to a chapter shows that chapter's name as a small chip. That is the whole of "story order vs. book order" for now.
8. **Time runs from the reading-start side** (D8): earlier moments on the right in a Hebrew interface, on the left in an English one. Confirmed by the owner on 2026-11-05: earlier is the reading-start side in each language.
9. **Highlighting, not lanes:** a page or a tag can highlight the cards that link to it or carry it (Milestone 21). Lanes built from links are dropped: a thread is an outline, and nothing else.
10. **Where it sits on screen can change.** The timeline grid is a projection with no knowledge of where it is shown, so moving it (for example into a Plot area of its own) changes navigation, not the timeline.

## Rejected

| Option | Why not |
|---|---|
| A separate timeline file or data store | A second place to keep in step with the outlines (PRD §9, OUT) |
| Dates on every moment, calendar spacing | Most stories don't have dates; may come later as an option, with its own ADR |
| Lining up by a link in the heading | The section loses its own name |
| Lining up by matching section names | Forces the same name; breaks silently on renames and typos; lines up by accident |
| Lanes built from links to pages (the 2026-11-04 version) | A second way to make a character's thread; highlighting covers the need |
| A fourth per-outline view | One outline's timeline repeats its Board |
| Dates or events guessed from prose | Against the invariant that nothing is inferred |
| A hand-drawn timeline | Not readable or editable outside the app |
| A separate list of column names | A third thing to keep in step; the main outline already has the moments |
| The main outline chosen by how much is lined up with it, or by file name | Unpredictable: it could change on its own as the author works |

## Later, designed with the owner first

Bars for things that last across moments; eras as background bands; optional real dates; a richer story-order view; lanes from links, if writers ask; a read-only relationship map drawn from ADR 0009 relationships; Plot, World and Write as three areas.

## Engineering notes

- **Domain (project):** `mainOutline` is an optional path in `project.md`; the main outline is that one if it exists, otherwise the first in the Plot group. Changing it is a targeted frontmatter patch and touches no outline. Line-ups say "at the same time as", which reads both ways, so the grid is the same set of line-ups whichever outline is main.
- **Domain (outline):** a section may be lined up with one section of another outline, identified by the outline's file and the section's anchor. Commands: line up, unpin. When the app renames a section, it updates the links that line up with it, in each outline file, with the usual safe writes.
- **Markdown:** the intro paragraph is read with the existing outline reader. Anchors follow the common heading-slug rule (lowercase, punctuation removed, spaces as `-`, Hebrew letters kept, `-1` for a repeated heading); the reader also accepts the heading text itself. Link resolution keeps the `#` part, which it drops today.
- **Presentation:** a pure `timelineGrid` turns outlines, their line-ups and chapter links into columns, rows and cells, with flags for "not lined up" and "can't line up". It is a merge of each thread's order under the line-ups; a cycle is reported, not resolved.
- **Interface:** the timeline component only draws a grid it is given. Its place in navigation is one entry.
- **Fidelity:** a shared fixture checks that a timeline move and the equivalent Board move produce identical files, and that lining up then unpinning returns the file byte for byte.
- **Accessibility:** each thread is a labelled region; cards are reachable by keyboard in moment order; the Move menu and **Line up with…** are the keyboard equivalents of dragging.
- **Performance:** 300 cards in 12 threads and 60 moments within the existing budget.

## Consequences

- `project.md` gains one optional key, `mainOutline`; `schemaVersion` stays 1, and an older app ignores it.
- PRD §9 keeps timelines IN as views of outlines; a timeline engine stays OUT.
- The outline format gains one meaning (a lining-up line) and no syntax; `schemaVersion` doesn't change. An older app shows the line as the section's intro text.
- An author who wants a character's own path makes an outline for it.
