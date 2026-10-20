# Make room for the words

The binder is your manuscript's structure. The editor is the chapter's text.
The inspector holds the properties that make the rest of the story visible.

## Arrange parts and chapters

Create parts and chapters from the binder. Drag to reorder chapters, move them
between parts, or reorder parts. Keyboard alternatives in the inspector include
**Move up**, **Move down**, and a part selector.

The unordered tray holds chapters outside the numbered manuscript. Removing a
chapter from manuscript order does not delete its file. A title change can offer a
file rename; review the prompt, especially when links in other files will change.

Folders are organization, not manuscript meaning. The `part` and `order` properties
define placement. [Read the exact rules](../file-format.md#order).

## Write and save

The editor shows Markdown source. Changes autosave after a short pause and when
the editor loses focus. Check the save status before closing or switching tools.

If saving fails or a file changes outside the app, stop and read the notice.
Do not assume the editor's visible text has reached disk. The
[safety guide](safety.md) explains the available choices.

## Give the chapter its place in the story

In the inspector, set status, point of view, characters, location, threads, dates,
and a short synopsis. Use what helps; metadata is not homework you must finish
before writing.

Statuses and threads are defined in `novel.md`. A value outside the project's
list stays visible rather than being silently removed.

## A comfortable writing desk

Use **Writing appearance** in the status bar to adjust prose size and line width.
Focus mode hides the surrounding panels. Appearance preferences belong to the app's
per-user settings, not the novel's Markdown.

| Action | Shortcut |
| --- | --- |
| Toggle binder | `Ctrl+\` |
| Toggle inspector | `Ctrl+Shift+I` |
| Toggle outline panel | `Ctrl+Shift+O` |
| Focus mode | `Ctrl+Shift+F` |

These are the Linux/Windows menu shortcuts. The native **Edit** menu includes undo,
redo, cut, copy, paste, and select all.

## More than one writing direction

The editor supports right-to-left prose alongside left-to-right text. For example:

<p dir="rtl" lang="he">יעל פתחה את המחברת. <bdi lang="en">Chapter One</bdi> עדיין חיכה לשם.</p>

Titles and names may use Hebrew, accented letters, or other scripts. This is prose
support, not a promise of a fully translated interface. New file names are validated
for Linux and Windows; the title you see is separate from the safe file name.
