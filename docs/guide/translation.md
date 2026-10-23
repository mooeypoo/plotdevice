# Translate the interface

This guide is for contributors translating Plot Device's bundled interface. It
does not describe translated installers, novel files, or the public Hebrew manual.

## Catalogs

- `src/i18n/en.json` is the source catalog.
- `src/i18n/he.json` is the Hebrew interface catalog.
- `src/i18n/qqq.json` documents meaning, context, parameters, and content that
  must stay literal. It is not shown to app users.
- Keep the same message keys in all three catalogs. Do not rename keys to
  improve a translation; keys are part of the code interface.

Keep each message translatable as a whole sentence or phrase. Add a typed
parameter entry in `src/i18n/translator.ts` when a message takes arguments.
Use numbered Banana placeholders so translators can reorder them:

```json
"chapter-count": "{{PLURAL:$1|one chapter|$1 chapters}}"
```

Preserve every `$n` parameter used by English. Translate every plural form
needed by the target language; English singular/plural rules do not apply to
Hebrew. In `qqq`, explain what each parameter contains, whether it is formatted,
and whether it is user-authored or technical. The catalog tests check key parity,
placeholder signatures, plural-parameter parity, and that notes mention each
parameter.

## Hebrew and mixed-direction text

Write natural Hebrew; do not reverse characters or manually reorder a sentence
to imitate right-to-left layout. The interface direction is supplied by the app.
Keep project-authored titles, names, aliases, Markdown, file paths, shortcuts,
schema values, and code literal. Use parameters for those values and describe
their handling in `qqq`.

Use the glossary's terms consistently.

## Glossary

Each concept has exactly one name on screen, in English and in Hebrew. The
"Avoid" column lists names that were used before and must not come back; a
catalog test fails if a retired name appears in `en.json` or `he.json`. Code
keeps its internal names in message keys and ids (`binder`, `inspector`,
`scene-card`, `cast`); those never reach the screen.

**The two modes.** The mode switch is the only control named Write.

| English | Hebrew | Meaning | Avoid |
| --- | --- | --- | --- |
| Write | כתיבה | Working on the prose: the page, with panels beside it. | Writing mode |
| Plot | עלילה | Seeing the whole story: the board, Overview, Timeline, Interactions. | Plotting |

**Places on screen.**

| English | Hebrew | Meaning | Avoid |
| --- | --- | --- | --- |
| Page | עמוד | The writable editor in the middle, and the center view that shows it. | editor, document, Write (as a tab) |
| Panel | חלונית | One tool beside the page, such as Manuscript or Details. | view, section |
| Layout | פריסה | A saved arrangement of panels. Shipped layouts: Standard (רגילה), Side by side (זה לצד זה), Board (לוח). | Write, Revise, Plot as layout names |
| Split | פיצול | A second, read-only page beside yours. | חלונית for a split |
| Focus | ריכוז | The page alone. One word, not a third mode. | Focus mode, מיקוד |
| Your chapter | הפרק שלך | The chapter you are writing, marked on its tab. | Writing (as a marker), יעד הכתיבה |

**Things in the book.**

| English | Hebrew | Meaning | Avoid |
| --- | --- | --- | --- |
| Manuscript | כתב יד | Parts and chapters in reading order, and the panel that lists them. | Binder, קלסר כתב היד |
| Part, Chapter | חלק, פרק | As in the file format. | |
| Codex | קודקס | Characters, places and notes, and the panel that lists them. | אוסף רשומות העולם |
| Entry | רשומה | Any one file the app lists. | document, item, פריט |
| Note (codex kind) | הערה | A codex note. | רשומה for a note |
| Outline | מתווה | A planning file. | מתווה הכתיבה |
| Board | לוח העלילה | The outline shown as columns of beats. The layout of the same name is just לוח. | Plot board in one place and Board in another |
| Beat | נקודת עלילה | One bullet of the outline; one item on the board. | card (on the board) |
| Inbox | רעיונות | The outline's column for captured beats. | תיבת הרעיונות |
| Thread | קו עלילה | A plotline from `novel.md`. | עלילה (that is the Plot mode) |

**Panels.**

| English | Hebrew | Meaning | Avoid |
| --- | --- | --- | --- |
| Details | פרטים | An entry's keys: status, point of view, synopsis and the rest. | Inspector, Properties, מאפיינים |
| Reference | עיון | An entry read beside the page. | לעיון as the panel's name |
| Cards | כרטיסים | Entries you pinned, stacked. "Card" means only these. | |
| Chapter card | כרטיס הפרק | The chapter at a glance. | Chapter (as a panel title), scene card |
| In this chapter | בפרק הזה | Who and where the chapter mentions. | cast |
| Needs attention | דורש טיפול | Problems the app found in files. | warnings, אזהרות, תשומת לב |

**Actions.**

| English | Hebrew | Meaning | Avoid |
| --- | --- | --- | --- |
| Open | פתיחה | Show an entry on the page. | Open in editor |
| Peek | הצצה | A small card for a link, without leaving the page. | |
| Pin | הצמדה | Keep a card in Cards, or keep a tab open. | נעיצה |
| Edit details | עריכת פרטים | Open Details for an entry. | Edit in Properties |
| Open beside | פתיחה בצד | Show an entry in a split. | פתיחה לצד |
| Write here | כתיבה כאן | Make a split's or tab's chapter your chapter. | |
| Back to your chapter | חזרה לפרק | Return to the chapter you are writing. | Return to writing |
| Capture | תפיסה | Add a beat to the Inbox from anywhere. | |
| Go to… | מעבר אל… | Find anything, run any command (Ctrl+K). | Command palette, לוח פקודות (clashes with the board) |

**Settings.** Interface language (שפת הממשק), Book language (שפת הספר),
Appearance (מראה), Experimental (ניסיוני).

The language changes only app-owned interface copy. It never translates or
rewrites a writer's novel.

## Review checklist

1. Update `en.json`, `he.json`, and `qqq.json` together for every new key.
2. Use the glossary's names. If a new concept needs a name, add it to the
   glossary first.
3. Run `npm run test -- src/i18n`.
4. Review English and Hebrew in the app with mixed-script names and technical
   values; check both interface directions and longer translations.
5. Never claim visual qualification from catalog tests alone. Real browser,
   Linux package, and Windows installer checks are tracked separately in the
   project's localization ADR 0016.
