# See the shape of the story

Step back from the chapter without leaving the manuscript behind.

## Your outline

An outline is a plan you write, not a report generated from your chapters. Use an
outline entry to think about sequences and link to chapters, then read it beside
the draft. The side panel renders Markdown headings, lists, emphasis, quotes, code,
and tables. Click a project link to open its file; passages linking to the open
chapter are highlighted. Choose **Edit** to change the raw Markdown in the main
editor. The reference returns when you open another entry.

If you have several outlines, choose one from the dropdown. Its label comes from
the file's frontmatter `title`, or its filename when no title is set. The selected
path appears below it, so you can distinguish files with similar titles.

Choose **Expand** in the panel's **⋯** (or double-click its inner edge) for a wider
reference view, and **Restore** to return to your preferred width. You can also drag the panel's inner edge. With that edge focused,
Left/Right resize it and Home/End choose the smallest/largest available width.
The width is remembered with your layout on this computer, and it is shared by
the panels in the same dock; narrower windows constrain it to leave room for the
editor.

Raw HTML is displayed as text, images show their descriptions rather than loading
content, and external web links are text with their URL in a tooltip. Only project
links open from this reference view.

An outline does not change chapter order simply because you rearrange its paragraphs.

## Plot on the board

Switch the top bar from **Write** to **Plot** to see your outline as a board.
Each `##` heading is a column and each bullet under it a beat. A beat that links to a
chapter shows that chapter's status, point of view and word count; a `#tag` that
matches one of your threads in `novel.md` marks the beat with that thread. Text the
board doesn't recognize stays exactly where it is.

Choose **Edit as text** beside the outline's name to edit the outline itself on the page,
in Write; switch back to Plot to look at the board again. **?** shows the board's keys. The board
reads the file each time; it stores nothing of its own. Use the arrow keys to move
between beats, and Enter to go and write a beat's chapter.

Drag a beat to another place or column, or drag a column by its heading. With a
beat or a column heading focused, **Alt+arrow keys** move it, and its **⋯** menu offers
the same moves. Only the moved lines change in the file; if the outline changed
since the board read it, nothing is written and the board reads it again. The Inbox
column always stays last; drag its beats out to sort them into the story.

**+ Add column**, after the last column, adds a `##` heading to the outline: type its name
and press Enter. If no part of your manuscript has that name yet, the board offers to
create one too; nothing is created unless you choose **Create part**.

Write on the board, too. **+ Add beat** at the foot of a column adds beats one after
another: type a line, press Enter, and type the next. **F2** renames a focused beat,
and its **⋯** menu edits its notes. When a beat links to a chapter, the same menu sets
that chapter's synopsis and status, exactly as Details would.

**Capture a beat** is an experimental setting in Appearance. When it's on,
**Go to…** (Ctrl+K) offers **Capture a beat…**: type one line and press Enter,
and it is added to the end of the outline's Inbox section, which is created if
missing. Nothing else in the outline changes.

## Overview

The overview is derived from the manuscript: parts, chapters, statuses, point of view,
threads, and synopses. Filter to focus on a strand of the story, edit synopses inline,
or open a chapter to return to its prose.

![Manuscript overview showing chapters, statuses, point of view, threads, and short synopses.](../images/overview.png)

## Timeline

Choose manuscript order or story-date order. Threads or characters form rows, with
chapters across the grid. A chapter with several dates spans its date range.

Undated chapters remain visible in a separate tray. Filters and missing-for-several-
chapters highlights can help you notice a thread you have left behind. They are
prompts for your judgment, not a rule that every character must appear regularly.

## Interactions

The co-appearance matrix counts characters sharing chapters, based on chapter
`characters` and `pov` properties. Select a cell to see the chapters behind its count.

Co-appearance is not the same as a relationship, conversation, or mention in prose.
Use the matrix to ask questions of your draft, not to infer events you have not written.
