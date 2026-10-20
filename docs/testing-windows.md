# Testing on Windows

Plot Device is built and unit-tested on Windows in CI, but the installer and the running app need a person to check them. Use a Windows 10 or 11 machine or VM. A test takes about twenty minutes.

## Get the installer

1. On GitHub, open **Actions → CI → Run workflow** (or push a `v*` tag).
2. When the run finishes, download the **plotdevice-Windows** artifact and unzip it: `plotdevice-<version>-setup.exe`.
3. Copy `fixtures/sample-novel` from the repository to the Windows machine, for example to `Documents\sample-novel`. Use a copy: the tests depend on the original's exact bytes.

## Install

- [ ] Run the installer. The installer isn't signed yet, so SmartScreen warns: choose **More info → Run anyway**. (Signing is planned; see the roadmap.)
- [ ] The installer runs without questions (a one-click, per-user install) and puts **Plot Device** on the desktop and in the Start menu.
- [ ] The app starts from the Start menu. The window, the taskbar, and the Start menu show the pen-nib icon, not Electron's.

## Open and write

- [ ] **Open folder…**, choose `sample-novel`. The binder shows three parts; Part Three's title is Hebrew (הנהר) and reads right to left.
- [ ] Open **The Ferry**, type a sentence, wait a second. The status bar says **Saved**. In Notepad, the file has the sentence and still has its frontmatter unchanged.
- [ ] Open **First frost** (its file uses Windows line endings, CRLF), type, save. In Notepad++ or VS Code, every line still ends in CRLF.
- [ ] Type Hebrew with niqqud in a chapter (Windows keyboard: add Hebrew in Settings → Time & language). It displays right to left, and saves.

## Files changed outside the app

- [ ] With **The Ferry** open and nothing unsaved, edit it in Notepad and save. The app shows "Updated from disk" with the new text.
- [ ] Type in the app without waiting, then edit the same file in Notepad and save. The app shows "Changed outside Plot Device" and keeps your text; **Keep mine** writes it.

## Renames, moves, and case

- [ ] Drag **First frost** from Part One into Part Two in the binder. The file moves into the `Part Two` folder.
- [ ] Change **The Ferry**'s title to "The Crossing" and accept **Rename file**. `The Ferry.md` becomes `The Crossing.md`, and `notes\Scene idea.md` now links to `[[The Crossing]]`.
- [ ] Change a title only in case ("the crossing"), rename. Windows treats the names as the same file; the rename still happens, with no error.
- [ ] Try to create a chapter named `CON` or `Aux`. The app adds `_` to the file name (these names are reserved on Windows), and the file opens normally.

## Views

- [ ] **Overview**, **Timeline** (reading and story order), and **Interactions** open and show the sample's chapters; Hebrew names display correctly next to Latin ones.
- [ ] The **Outline** tab: start an outline, link a chapter, open that chapter. The line about it is highlighted.

## Opening a project from outside

- [ ] Find where the app was installed: right-click the desktop shortcut → **Open file location** (usually a folder under `%LOCALAPPDATA%\Programs`). Note the path to `plotdevice.exe`.
- [ ] In Command Prompt: `"<that path>\plotdevice.exe" "%USERPROFILE%\Documents\sample-novel"` opens the project.
- [ ] With the app open, run the same command with another folder. It opens in the same window, not a second one.

## Uninstall

- [ ] **Settings → Apps → Plot Device → Uninstall** removes it. The `sample-novel` folder is untouched.
- [ ] Settings stay in `%APPDATA%\plotdevice\` (the recent-projects list), and nothing was ever written inside the novel folder besides your own changes and `novel.md`.

## Reporting

For anything that fails, note the step, what you saw, and attach a screenshot. The app's log is in the terminal if you start it from Command Prompt.
