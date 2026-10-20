# Keep your work safe

The novel folder is the source of truth. You should be able to understand, copy,
back up, and edit it without Plot Device.

## Know what is saved

The app saves chapter text after a short pause and on blur. Watch the save status.
Failures are not success: keep the draft open and read any error before closing.

Properties are changed surgically. Unknown YAML keys, comments, ordering, body text,
and line endings are preserved. Files that cannot be parsed safely are left untouched
and reported as warnings.

## When another editor changes a file

Obsidian, git, sync tools, and text editors can change the folder while Plot Device
is open. A clean outside change loads with a notice. If your open draft conflicts,
autosave pauses and the app asks you to make a decision.

- **Use disk version** discards the unsaved draft in favor of what is on disk.
- **Save recovered copy** keeps the draft in a separate file without replacing the
  original or changing its links.
- **Replace disk text** is an explicit, confirmed overwrite, checked against the
  current disk version. Use it only after deciding the disk text should be replaced.

If the original was deleted, recovery does not silently recreate it. Read the offered
recovery/close choices. Keep a pending decision open until you understand both versions.

## Recovery has limits

Recovery snapshots are session-local. They are **not persistent crash recovery**
and do not replace a backup or version history. There is no general undo for
multi-file renames, moves, or every property operation.

Back up the project folder independently. Git can provide useful history if you
already know how to use it; synchronization alone may replicate an accidental deletion.

## Settings are separate

Window geometry, recent projects, and appearance belong to per-user app settings:

- Linux: `~/.config/plotdevice/`
- Windows: `%APPDATA%\plotdevice\`

They are not hidden files added to your novel. Uninstalling the app should not
delete your project. When reporting a problem, do not upload a real manuscript;
make a small, non-sensitive example instead.
