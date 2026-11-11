# Hebrew to review: Milestone 16

For the owner, after the design session. The Hebrew below was written for Milestone 16 by Claude, not by a Hebrew writer (`PRD.md` §7: Hebrew wording is written in Hebrew, not translated). The catalog's rule still applies: natural, gender-neutral wording.

Tick each item once it reads right; change the text in place if it doesn't.

## Interface words (`packages/i18n/src/messages/he.json`)

| Key | Hebrew now | English | Where it shows |
|---|---|---|---|
| `format-heading1` … `3` | כותרת 1, כותרת 2, כותרת 3 | Heading 1, 2, 3 | ¶ menu, the bubble's ⋯ |
| `format-body` | טקסט רגיל | Body text | ¶ menu, the bubble's ⋯ |
| `toolbar-link` | קישור | Link | The link popup's name, for screen readers |
| `link-goes-to` | מוביל אל $1 | Goes to $1 | The link popup ($1 is a page or chapter name) |
| `link-open` | פתיחה | Open | The link popup |
| `link-change` | שינוי הקישור… | Change link… | The link popup |
| `link-remove` | הסרת הקישור | Remove link | The link popup |
| `plain-text-edit` | עריכה כטקסט פשוט | Edit as plain text | ¶ in Write, ⋯ on a page or outline |
| `plain-text-banner` | טקסט פשוט. השינויים כאן נשמרים בדיוק כפי שהוקלדו. | Plain text. Changes here are saved exactly as typed. | Above the editor in plain text |
| `plain-text-back` | חזרה לתצוגה הרגילה | Back to normal view | The banner, ¶, ⋯ |
| `outline-text-hint` | כותבים בחופשיות: Enter מוסיף כרטיס, Tab הופך אותו לפרט, ו־$2 הופך שורה למקטע. @ מקשר לדף. $1 חוזר. | Type freely: Enter adds a card, Tab makes it a detail, and $2 makes a line a section. @ links a page. $1 goes back. | Above an outline's Text ($1, $2 are keys) |
| `settings-advanced` | מתקדם | Advanced | Settings |
| `settings-plain-text` | פתיחת דפים כטקסט פשוט | Show plain text when I open a page | Settings |
| `settings-plain-text-hint` | כל הסימונים גלויים, לתיקונים ידניים. כשהאפשרות כבויה, הדפים מוצגים מעוצבים. | Every mark shows, for fixing things by hand. When this is off, pages show formatted text. | Settings, under the checkbox |

Points worth a second look:

- [ ] **"טקסט פשוט"** for plain text: does it say "the raw file" to a Hebrew writer, or just "unformatted"? (In English "plain text" vs the outline's "Text" view is a known naming question, `PRD.md` §11.)
- [ ] **"מוביל אל"** (masculine, agreeing with "קישור"): fine as is, or rephrase gender-neutrally?
- [ ] **"מקטע"** for an outline section is the existing term; check it still reads well next to "כותרת".

## Guide pages (`apps/site/src/content/docs/he/`)

- [ ] `writing/formatting.mdx`: the new opening paragraph, the heading levels, the keyboard rows, and the new sections **קישורים** and **טקסט פשוט** (with their screenshot captions).
- [ ] `planning/outlines.mdx`: section **מקלידים כטקסט**, the first four bullets.
- [ ] `reference/shortcuts.mdx`: the two heading rows.
- [ ] `reference/settings.mdx`: the **מתקדם** item.

After changing a guide page, `pnpm site:translations` shows what is behind; the four pages above are stamped as up to date with their English pages.

## Older gap, not from Milestone 16

- [ ] `about/problems.mdx`: the English page changed after its Hebrew translation (it was already flagged before Milestone 16). Bring the Hebrew up to date, then re-stamp that page.

## Also worth checking by hand

- [ ] **Screen readers** (Orca, NVDA), in Hebrew and English: hidden marks stay silent, headings are announced as headings (ADR 0010, implementation note).

## Added in Milestone 17

| Key | Hebrew now | English |
|---|---|---|
| `sidebar-toggle` | סרגל צד | Sidebar |
| `start-writing` | כאן מתחילים לכתוב. | Start writing here. |
| `write-empty-title`, `-text` | עוד אין פרקים · ספר נכתב פרק אחרי פרק. מתחילים בראשון; את השם אפשר לתת עכשיו או אחר כך. | No chapters yet · A book is written one chapter at a time… |
| `story-empty-title`, `-text` | עוד אין מתווה · מתווה הוא התוכנית של הסיפור… לא צריך מתווה כדי לכתוב. | No outline yet · An outline is the plan of your story… |
| `gallery-empty-character`, `-text` | עוד אין דמויות · לכל דמות יש דף משלה… | No characters yet · Each character has a page of their own… |
| `gallery-empty-place`, `-text` | עוד אין מקומות · לכל מקום יש דף משלו… | No places yet · Each place has a page of its own… |
| `gallery-empty-note`, `-text` | עוד אין הערות · בהערות נכנס כל השאר על העולם… | No notes yet · Notes hold everything else about the world… |

- [ ] Guide pages changed for Format, the sidebar and Focus: `writing/formatting.mdx`, `start/tour.mdx`, `writing/hebrew-and-english.mdx`, `writing/the-page.mdx`, `reference/shortcuts.mdx`.

## Added in Milestone 18

| Key | Hebrew now | English |
|---|---|---|
| `kinds-menu`, `kinds-title` | סוגי דפים… · סוגי דפים | Kinds of pages… |
| `kinds-hint` | על מה הספר שומר דפים. שינוי שם של סוג משנה רק את השם ב־Plot Device; התיקייה נשארת כפי שהיא. | What your book keeps pages about… |
| `story-new-kind`, `kinds-add` | סוג דף · הוספת סוג | Kind of page · Add a kind |
| `new-page-of-kind` | הוספת $1 (avoids gender agreement with the author's own name) | New $1 |
| `story-unsorted`, `kinds-adopt` | עוד לא ממוינים · הפיכה לסוג… | Not sorted yet · Make this a kind… |
| `kinds-field-one`, `kinds-field-many` | שם · ברבים | Name · Plural |
| `kinds-remove-confirm` | להסיר את „$1” מסוגי הדפים? … שום דבר לא נמחק. | Remove "$1" from the kinds of pages? … |
| `kinds-unit-title`, `kinds-unit-hint` | איך קוראים לפרקים · רק המילים ב־Plot Device משתנות… | What chapters are called · … |
| `kinds-mismatch` | חלק משמות התיקיות כבר לא תואמים את השמות ב־Plot Device. זה חשוב רק אם פותחים את תיקיית הספר ביישומים אחרים. | Some folder names no longer match… |
| `kinds-match-folders`, `match-title` | התאמת שמות התיקיות… | Match folder names… |
| `match-hint` | כל תיקייה תקבל את השם של הסוג שלה. הדפים שבה יעברו איתה, וכל קישור אליהם יעודכן. | Each folder gets its kind's name… |
| `match-links` | {{PLURAL}} קישורים {{PLURAL}} בקבצים יעודכנו. | N links in N files will be updated. |
| `match-blocked-*` | five reasons a folder stays as it is | |
| `match-backup-*`, `match-have-backup` | קודם כל, גיבוי · גיבוי עכשיו · הגיבוי נשמר. הוא נמצא כאן: · יש לי גיבוי | First, a backup · Make a backup now · … |
| `match-rename`, `folders-renamed` | שינוי שמות התיקיות · שמות התיקיות שונו. N קישורים עודכנו. | Rename folders · Folders renamed… |
| `folders-undo`, `folders-undone`, `folders-undo-stale`, `folders-failed` | ביטול שינוי שמות התיקיות · … | Undo folder renames · … |
| `dialog-backup-location` | בחירת מיקום לגיבוי | Choose where to keep the backup |

- [ ] Guide pages new or changed: `planning/kinds.mdx` (new), `files/folder.mdx`, `files/pages.mdx`. „התחרטת?” in `planning/kinds.mdx` addresses the reader in the second person; check it fits the guide's voice.
- [ ] `match-blocked-case-only` says "אותיות גדולות וקטנות", which only applies to Latin names.

## Added in Milestone 19

| Key or file | Hebrew now | English |
|---|---|---|
| `new-project-question`, `new-project-adjust-later` | מה אתם כותבים? · אפשר לשנות הכול אחר כך: סוגי הדפים, המתווים והשמות. | What are you making? · Everything can be changed later… |
| `new-project-back`, `new-project-location-label`, `new-project-choose` | → חזרה · איפה לשמור · בחירה… | ← Back · Where to keep it · Choose… |
| `new-project-hint` | המתווים והשמות נכתבים בשפת הספר. | Outlines and names are written in the book's language. |
| `template-novel` | סיפור ארוך (from the mockups; „רומן” is the usual word) | Novel |
| `template-*-description`, `-kinds`, `-outlines`, `-summary` | the four cards | |
| `starter-*` | שלוש מערכות · נקודות מפנה · קשת של דמות · קשת המערכה · תוכנית למפגש | Three acts · Story beats · … |
| `new-outline-start` | מתחילים מ… | Start from |
| `outline-guide`, `outline-guide-done` | מקטעים הם הצעדים הגדולים של הסיפור, וכרטיסים הם הרגעים בכל צעד. מתחת לכרטיס אפשר להוסיף פרטים. · הבנתי | Sections are the big steps… · Got it |
| `menu-new-project` | פרויקט חדש… | New project… |
| `packages/templates/src/index.ts` | the campaign's kinds: דמות/דמויות (for NPCs), מקום, פלג, חפץ, ידע; מפגש/מפגשים; tags: דמות ראשית, דמות משנית, דמות שחקן, נבל, בן ברית; the novel's main outline is „העלילה” | |

- [ ] **The starter outlines** in `packages/templates/starters/he/` were written in Hebrew, not translated, but by me. The main character is „הגיבורה” throughout; check that's the voice you want, or whether the beats should avoid gender.
- [ ] Guide pages changed: `start/first-book.mdx`, `planning/outlines.mdx`, `planning/tags.mdx`, `files/folder.mdx`.

## Added in Milestone 20

**New messages** for backups, restoring, the sample book and the "?" links. They're written in Hebrew, and each has a translator's note in `qqq.json`:
- `backups-*`, `backup-*`, `restore-*` and `restored-*`;
- `welcome-try-sample` and `sample-*`;
- `help-about` and `help-topic-*`.

Worth checking:

- [ ] **The clean-up sentences** are built from two halves around a number box: `backups-cleanup-older-before` + [6] + `backups-cleanup-older-after`, and the same for `-newest-`. Check they read naturally in Hebrew.
- [ ] **`backups-sync-hint`** has a right-to-left mark (U+200F) after "Obsidian Sync." so the English names don't run together. Keep it if you rewrite the sentence.
- [ ] **Backup file names keep the English words** "backup" and "before restoring" ("מטע המלח backup 2026-11-05 14.30.zip"), so they sort and match the same in every language. Say if you'd rather have Hebrew words in Hebrew books.
- [ ] **`about-license`** now says „תוכנה בקוד פתוח” instead of „תוכנה חופשית”, following the rule against "free".
- [ ] **`chapter-remove`** is „שמירה להמשך”; the English is now "Put on the side", to match "On the side".

**English rewritten in the wording pass.** The Hebrew of these keys may need to follow:

`new-project-hint`, `open-failed-newer-format`, `create-failed-folder-exists`, `create-failed-inside-project`, `create-failed`, `chapter-remove`, `change-failed-stale`, `change-failed-name-taken`, `change-failed-invalid-name`, `chapter-unreadable`, `chapter-missing`, `direction-paragraph-clear`, `direction-phrase-clear`, `conflict-title`, `conflict-body`, `conflict-keep-both-detail`, `conflict-failed`, `kinds-rename`, `kinds-adopt`, `kinds-folder-stays`, `kinds-not-saved`, `kinds-unit-hint`, `kinds-mismatch`, `match-hint`, `match-blocked-case-only`, `match-blocked-invalid-name`, `match-blocked-other-files`, `match-blocked-missing`, `match-backup-failed`, `folders-undo-stale`, `folders-failed`, `item-edit`, `section-rename`, `confirm-delete-item`, `kept-explanation`, `locked-item`, `invalid-details`, `outline-changed-elsewhere`, `outline-undo-refused`, `outline-refused-multiline-heading`, `reference-failed`, `relationship-changed-elsewhere`, `tags-failed`, `tags-unreadable`, `prompt-tag-rename`, `arc-start-hint`, `arc-outline-title`, `resize-navigator`, `versions-stale`, `compiled`, `compiled-missing`, `compile-failed`, `about-license`, `settings-plain-text-hint`, `backup-problem-missing-folder`, `backup-problem-no-space`, `restore-changed`

## Added with the timeline

| Key or file | Hebrew now | English |
|---|---|---|
| `story-timeline`, `timeline-new-storyline`, `timeline-one-title` | ציר הזמן · קו עלילה חדש · קו עלילה אחד, בינתיים | Timeline · New storyline · One storyline so far |
| `outline-main-badge`, `timeline-main-outline`, `outline-make-main` | ראשי · המתווה הראשי · להפוך למתווה הראשי | Main · main outline · Make this the main outline |
| `timeline-columns-from`, `timeline-columns-hint`, `timeline-change-main` | שמות העמודות באים מהמתווה הראשי: · לחיצה על שם משנה אותו, ו־+ מוסיף מקטע. · החלפה… | Column names come from… · Click a name… · Change… |
| `timeline-same-time-as` (**written into the author's files**) | במקביל ל־ | At the same time as |
| `timeline-line-up`, `timeline-unpin`, `timeline-lined-up-with`, `timeline-not-lined-up` | יישור עם… · ביטול היישור · מיושר עם „…” · לא מיושר | Line up with… · Unpin · … |
| `timeline-cant-line-up-*`, `timeline-cant-line-up-fix`, `timeline-no-choices` | אי אפשר ליישר… · אפשר ליישר מחדש או לבטל את היישור דרך ⋯. · אין רגע שמתאים בלי לשנות את סדר קו העלילה. | Can't line up… |
| `main-swap-question`, `main-swap-action` | להפוך את „…” למתווה הראשי? העמודות בציר הזמן יקבלו… | Make "…" the main outline? … |
| `outline-set-aside`, `outline-bring-back`, `story-set-aside`, `outline-set-aside-instead` | להניח בצד · להחזיר · בצד · להניח בצד במקום | Set aside · Bring back · Set aside · Set aside instead |
| `outline-delete*`, `outline-deleted*`, `outline-undo-delete`, `outline-restored` | the delete question in four short paragraphs; העברה לפח; „…” נמצא בפח.; ביטול | Delete outline… · Move to Trash · … |
| `samples/מטע-המלח/outlines/הדרך של ביה.md` | a new storyline in the Hebrew sample, and line-ups in „הקשת של אילקה” | |

- [ ] **„במקביל ל־”** is written into authors' outlines, so it matters most. The literal alternative is „באותו זמן כמו”.
- [ ] **„קו עלילה”** for a storyline (a row of the timeline), beside „מתווה” for the outline itself: is the difference clear, or should the row just be called „מתווה”?
- [ ] **Imperatives:** the menu commands use infinitives (להניח בצד, להחזיר), as elsewhere; the delete question uses statements.
- [ ] Guide pages new or changed: `planning/timeline.mdx` (new), `planning/outlines.mdx`, `files/outlines.mdx`, `files/folder.mdx`.


## Added in Milestone 27 (poems and niqqud)

| Key | Hebrew | English |
| --- | --- | --- |
| `template-poetry`, `template-poetry-description`, `template-poetry-outlines`, `template-poetry-summary` | ספר שירה · שירים במקום פרקים, אחד מוכן לכתיבה, ומתווה לסדר אותם. · סדר הספר: שלוש אסופות · סוג דף אחד · מתווה אחד · שירים | Poetry collection · … |
| the template's words (**written into the author's files**) | שיר / שירים, אסופה / אסופות, טיוטה, מוכן | Poem / Poems, Section / Sections, Draft, Ready |
| `starters/he/collection.md` (**written into the author's files**) | סדר הספר; אסופה ראשונה, שנייה, שלישית; שיר שפותח את הדלת · שיר מאמצע הדברים · שיר לסיום | Order of the collection … |
| a new poem's file and contents line (**written into the author's files**) | שיר.md, `[שיר](manuscript/שיר.md)` | poem.md |
| `format-poem`, `chapter-form-poem`, `chapter-form-prose` | שיר · שיר · פרוזה | Poem · Poem · Prose |
| `new-chapters-poems` | פרקים חדשים כשירים | Start new chapters as poems |
| `poem-untitled`, `prompt-poem-title` | שיר ללא שם · שם השיר (אפשר להשאיר ריק) | Untitled poem · Poem title (you can leave it empty) |
| `part-rename-unit`, `prompt-part-unit-name` | שינוי שם ה$1… · שם ה$1 | Rename $1… · $1 name |
| `kinds-part-unit-*` | איך קוראים לחלקים · … · חלק · חלקים | What parts are called · … |
| `niqqud-menu`, `niqqud-title`, `niqqud-hint`, `niqqud-no-letter` | ניקוד… · ניקוד · בוחרים סימן כדי להוסיף אותו, ושוב כדי להסיר אותו. מקשי החיצים עוברים לאות הבאה. · מציבים את הסמן מיד אחרי אות עברית, ופותחים שוב את הניקוד. | Niqqud… · … |
| `niqqud-<mark>` | קמץ, פתח, צירי, סגול, חיריק, חולם, קובוץ, שווא, חטף פתח, חטף סגול, חטף קמץ, דגש, שין ימנית, שין שמאלית | the marks' names, read by screen readers |
| `tests/fixtures/chapters/poem-he.md` | „עֶרֶב בַּפַּרְדֵּס”, an invented poem with full niqqud, also used in screenshots | |

- [ ] **„פרקים חדשים כשירים”** in the book menu: short, but is it clear that it's a setting? Alternatives: „לפתוח פרקים חדשים כשירים”, „פרקים חדשים יהיו שירים”.
- [ ] **„שינוי שם ה$1…”** and **„שם ה$1”** add ה before the book's own word (האסופה). Fine for most words; a word that already starts with ה would read oddly.
- [ ] **The niqqud names** without niqqud themselves, as menu labels elsewhere. Should they be voweled (קָמָץ, פַּתָּח)?
- [ ] **The sample poem's niqqud** (`poem-he.md`): please check every mark.
- [ ] Guide pages new or changed: see the Milestone 27 plan's results.

## Added in Milestone 28

- [ ] **„שם”** is what screen readers call the title above the page, which can now be retyped ("Title" in English).
- [ ] Guide: the new section **„שינוי שם של פרק”** in Chapters and parts, and in Writing poems, **„באפור”** for how "Untitled poem" is shown ("faintly").
- [ ] Template words in the interface's language (campaign kinds as well: an English campaign in a Hebrew interface says „דמות”, „מקום”, „פלג”, „חפץ”, „ידע” for NPC, Location, Faction, Item, Lore; is „דמות” right for NPC?): **„שיר חדש”**, **„מפגש חדש”**, **„אסופה חדשה”**, **„שינוי שם האסופה…”**, **„שם האסופה”**, **„עוד אין שירים”**, **„עוד אין מפגשים”**. They replace „הוספת שיר” and the like for template books. The author's own words still use „הוספת $1”.
