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
