# Make room for the words

The Manuscript panel is your book's structure. The page is the chapter's text.
The Details panel holds the details that make the rest of the story visible.

## Arrange parts and chapters

Create parts and chapters from the Manuscript panel. Drag to reorder chapters, move them
between parts, or reorder parts. Keyboard alternatives in Details include
**Move up**, **Move down**, and a part selector.

The unordered tray holds chapters outside the numbered manuscript. Removing a
chapter from manuscript order does not delete its file. A title change can offer a
file rename; review the prompt, especially when links in other files will change.

Folders are organization, not manuscript meaning. The `part` and `order` properties
define placement. [Read the exact rules](../file-format.md#order).

## Write and save

The page shows Markdown source. Changes autosave after a short pause and when
the page loses focus. Check the save status before closing or switching tools.

If saving fails or a file changes outside the app, stop and read the notice.
Do not assume the page's visible text has reached disk. The
[safety guide](safety.md) explains the available choices.

## Give the chapter its place in the story

In Details, set status, point of view, characters, location, threads, dates,
and a short synopsis. Use what helps; metadata is not homework you must finish
before writing.

Statuses and threads are defined in `novel.md`. A value outside the project's
list stays visible rather than being silently removed.

## A comfortable writing desk

### Consult another page without leaving your draft

Select a character, location, or note in **Codex** to read it in the right-hand
**Reference** panel. Each part and chapter in the Manuscript panel also has an **Open in
reference** button beside it; the normal chapter button still opens it on the page.
The manuscript's cursor, selection, scroll position and undo history stay in place
when you switch references.

Use **Expand/Restore** or drag the panel separator for more reading space. With
the separator focused, Left/Right adjusts its width; Home/End chooses its limits.
The preferred reading width is shared with **Outline** and remembered on this
computer. References remain readable during a manuscript conflict, but **Open on the
page** still requires resolving any unsaved changes before leaving that draft.

### Keep your writing chapter close

The first manuscript page you open becomes **Your chapter**, shown first in the
tabs. While it is unpinned, actually editing another part or chapter makes
that one your chapter instead. Reading another page or editing a
character does not change it.

Use **Pin** on your chapter to lock it while comparing or annotating other
chapters. **Write here** on another manuscript tab explicitly chooses and pins
that document instead. **Unpin** releases the lock; it does not close the tab.
Pinning another tab keeps it available without changing your chapter.

**Back to your chapter** brings you back from another entry, Overview, Timeline,
or Interactions. A document's undo history, selection and reading position survive
switching tabs during this project session. If its text changes outside the app,
reopening it loads the disk version with fresh editor history.

Opening a different page normally reuses a single **Preview** tab. Use **Keep
open**, double-click its tab, pin it, or edit its text to keep it. New documents
start kept. Opening a page already in the strip activates its existing tab.

Close an ordinary tab with its **×**, or use **Close other unpinned** to clear
comparisons while keeping the current entry, your chapter and pinned tabs. Unpin
other pinned tabs before closing them. To close your chapter, first choose another
manuscript with **Write here**. Closing tabs never deletes files.

Switching or closing tabs saves first. A conflict, missing file or failed save
keeps your draft open until you resolve it; read-only Reference lookups still work.
Tab paths, order, pins and your chapter are remembered per project on this computer.
Reopening reads the files on disk: tabs are **not an unsaved-draft backup**, and
undo, selection and scroll are not restored after closing the project or app.

### Adjust the writing surface

Use **Appearance…** in the top bar's **⋯** menu to adjust prose size and line width.
**Focus** hides the surrounding panels. Appearance preferences belong to the app's
per-user settings, not the novel's Markdown.

| Action | Shortcut |
| --- | --- |
| Toggle Manuscript | `Ctrl+\` |
| Toggle Details | `Ctrl+Shift+I` |
| Toggle Outline panel | `Ctrl+Shift+O` |
| Focus | `Ctrl+Shift+F` |
| Back to your chapter | `Ctrl+Shift+Enter` |
| Next / previous document | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Close current document tab | `Ctrl+W` |

These are the Linux/Windows shortcuts. Tab shortcuts also work in Focus.
With the document strip focused, use Left/Right or Home/End to activate tabs.
The native **Edit** menu includes undo, redo, cut, copy, paste, and select all.

## More than one writing direction

The page supports right-to-left prose alongside left-to-right text. For example:

<p dir="rtl" lang="he">יעל פתחה את המחברת. <bdi lang="en">Chapter One</bdi> עדיין חיכה לשם.</p>

Titles and names may use Hebrew, accented letters, or other scripts. This is prose
support, not a promise of a fully translated interface. New file names are validated
for Linux and Windows; the title you see is separate from the safe file name.
