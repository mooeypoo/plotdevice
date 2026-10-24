# U2b-4: Screenshot review

**Status:** done (2026-10-24). Every preview scenario was captured in English and Hebrew, in the
dark and light themes, and reviewed: 22 scenarios, 88 screens, in [screens/](screens/), as
`scenario.lang.theme.png`.
- The "before" set is U1's audit captures, in [../u1/screens/](../u1/screens/) (dark only; the
  light theme is new).
- A clickable before-and-after page is in [review.html](review.html), also published as a private
  page for the writer.

**What each screen was checked for:**
- **Names:** one name per concept, from the [glossary](../../guide/translation.md#glossary).
- **Clipping:** nothing cut off or overlapping.
- **Mirroring:** correct in Hebrew.
- **Contrast:** readable in both themes.
- **Controls:** no native control.
- **Sizes:** no size off the scales.

## Findings

| # | Screen | Finding | Fix |
|---|---|---|---|
| R1 | Cards (he) | A narrow side panel wrapped each card action word by word ("עריכת / פרטים"). | The actions wrap as a row under the title; each stays on one line. |
| R2 | Initialize | The "Make … a project?" heading named Georgia and fell back to a Times-like serif (F11). | It uses the prose face. A guard now fails on any `font-family` that isn't a font token. |
| R3 | Board, outline without columns | Edit as text appeared twice, and the obvious next step, a first column, wasn't offered. | The empty board shows its sentence and the **+ Add column** tile; Edit as text stays in the header. |
| R4 | Focus | Character and place links in dimmed paragraphs stayed bright: the Markdown highlighting inside a link kept its own colour. | Everything inside a link on a dimmed line dims with it. |
| R5 | Board (dark and light) | Beat cards looked sunk into their columns (found and fixed in U2b-1). | Columns use `--panel`, cards `--raised`. |
| R6 | All | Hard-coded colours, sizes and fonts (found and fixed in U2b-1 and U2b-2). | Tokens throughout; contrast, scale and font guards. |

## Looked at and left as they are

- **Links in prose** read in the prose colour with a dotted underline, as in the mock-ups, rather
  than in each kind's colour. Their kind still shows in their tooltip and their peek.
- **The interface language picker** sits above the heading on the initialize screen, as on the
  welcome screen.
- **The board scrolls** sideways to keep a focused "+ Add column" field in view, so the first
  column fades at its edge, which is the right cue that there is more to see.
