# Timeline: research and design decisions

Status: **Decided** (owner, 2026-11-05), after a research and brainstorm session. Mockups: https://claude.ai/artifact/2u7Ab9WaYXybFJtwf7sWyW. Recorded in ADR 0012 (amended), `DOMAIN_AND_FILE_FORMAT.md` 0.6, `PRD.md` 0.5, `UX_SPEC.md`, the roadmap (Phase C) and `milestone-21-timeline.md`.

## In short

Board and List already show the plot laid out. The timeline has a different job: **keeping parallel threads in step.** Each thread is an outline ("Main story", "Bea's path", "History of Marrow"). One row per thread, and the author **lines up** a few of a thread's moments with moments of another outline. Everything else falls into place between them. No dates, no new files.

```
               Spring, 1912      The night of the storm   ┆                After the auction
Main story     Ilka finds the    Bea leaves Marrow        ┆                The auction
               letter  [Ch 2]    [Ch 1]                   ┆
Bea's path     Childhood         Hiding at the boathouse  Three weeks in   ·
               [Ch 7]            ⇄ lined up               the city
```

## What other tools do

| Tool | How threads line up | Borrowed | Left behind |
|---|---|---|---|
| Preceden | Real dates on one axis | Layers per thread; things that last drawn as bars (later) | Dates required: its own advice for dateless stories is to type fake years and hide them |
| Plottr | A grid: chapters across, plotlines down | The grid itself; one colour per thread | Lines up by chapter only, so book order, never "when it happened" |
| Aeon Timeline | Dates, plus a separate narrative view | When it happens vs. when the reader learns it | Weight: spreadsheets, attributes, a learning curve reviewers call "too organized" |
| Storyflow | Placed by hand on a canvas | Backstory to the left of the opening; reading order joined to story time | A hand-placed canvas can't be read in a file; AI-made outlines |
| ForgeTales, World Anvil | Invented calendars and eras | Eras as soft background bands (later) | Calendar maths; these are world-history tools more than plot tools |

Craft advice agrees with lining up only some moments: parallel threads don't need to be in step everywhere, only where the reader would notice, and the timeline must not suggest they are in step where they aren't.

## Decisions

1. **The job: parallel threads in step.** Board, List and Text keep showing the plot laid out. The timeline doesn't repeat them.
2. **One timeline per book,** opened as **Timeline** in the Plot group of the sidebar. It is not a fourth view in each outline's Board · List · Text switch, which stays as it is.
3. **A thread is an outline, and nothing else.** One row per outline on the timeline. Lanes built from links (the roadmap's earlier Milestone 21) are dropped: a second way to make a character's thread would confuse. A page's cards can be **highlighted** on the timeline instead (Milestone 21).
4. **Lining up** (option c below): a short line under a section's heading, linking to a section of another outline:

   ```markdown
   ## Hiding at the boathouse
   At the same time as [The night of the storm](main-story.md#the-night-of-the-storm)
   - Hides the letter in the boathouse
   ```

   The section keeps its own name. The words around the link are the author's own; the app writes "At the same time as" or "במקביל ל־" in the project's language. The author never types the link: they drag the section onto a moment, or choose **Line up with…**.
5. **Sections not lined up** keep their file order and sit between their lined-up neighbours, drawn a little lighter, so nothing looks in step that isn't.
6. **Story order vs. book order, kept simple:** a card that links to a chapter shows a small chip with the chapter's name. A chapter 7 chip at the start of the line is a flashback, visible at a glance. No second line, no connectors, no mode.
7. **No dates.** Headings are labels ("Spring, 1912", "Day 3", "Before the war"). Optional real dates stay a later idea with its own ADR.
8. **Time runs from the reading-start side:** earlier moments on the right in Hebrew, on the left in English (roadmap D8; confirmed by the owner).
9. **World history is just another outline.** "History of Marrow", with its last section lined up with the main story's opening, shows as backstory before it.

## Where the column titles come from

The timeline has no axis of its own. Its columns are **the section headings of the book's main outline**, in the order they appear in that outline:

- **Not chapters.** Chapters show only as small chips on cards.
- **Not dates.** Nothing is parsed; "Spring, 1912" is just a heading.
- **Not a separate list.** Renaming a column renames that section; **+** between columns adds a section to the main outline.
- **Said on screen, once:** a quiet line above the grid, "Column names come from the main outline, Main story. Change…". The main outline is the top row and carries a small "Main" label, in the sidebar too.
- **Which outline is main** is written in `project.md` (`mainOutline: outlines/main-story.md`), so it travels with the book:
  - a new book: its first outline (the templates' "Main story" / "העלילה");
  - a book that doesn't say: the first outline in the Plot group, and the app writes that down the next time an outline is added, so a new outline never takes over by accident;
  - the author changes it from an outline's ⋯, **Make this the main outline**, or **Change…** on the timeline;
  - deleting the main outline in the app says which outline becomes main.
- **Changing the main outline changes no file but `project.md`.** A line-up says "at the same time as", which reads both ways, so everything lined up stays lined up; only the column names change. The message says exactly that, rather than warning.
- **Other storylines** share a column where lined up with it, and otherwise sit in untitled gaps under their own section names.
- **Years, if wanted:** make an outline whose sections are "1840", "1912", "1913", and make it the main outline. Everything else lines up with the years.

So the x axis is **order, not measured time**: "after this, before that". Equal widths don't mean equal time.

## Lining up: the three options considered

| | Written as | For | Against |
|---|---|---|---|
| a | `## [The night of the storm](main-story.md#…)` | Explicit; survives renames | The section loses its own name; the heading looks like a link everywhere |
| b | `## The night of the storm` (same name lines up) | Nothing to learn | Also forces the same name; breaks silently on renames, typos, a missing yod; lines up by accident |
| **c** | A line under the heading with one link | Own name kept; reads as a sentence; any language; survives renames | Gives a meaning to text the format already keeps (a section's intro paragraph); one rule to document |

## Deferred, and documented

- **Three areas (Plot | World | Write) instead of Story | Write.** Possibly clearer, but it is a separate decision. The timeline is built so its place on screen can change without a rewrite: the grid is a pure projection, the component only draws it, and where it opens from is one navigation entry. Try it in Story first; revisit the split once writers have used it.
- Answers on 2026-11-05: all outlines show (each hideable); "storyline / קו עלילה" as the working word; "At the same time as" / "במקביל ל־"; chains allowed.
- **Bars** for things that last across several moments ("lives in the city"). Lining up the start already covers most of it.
- **Eras** as background bands; **optional real dates**; a **relationship map**; lanes from links, if writers ask for them.
