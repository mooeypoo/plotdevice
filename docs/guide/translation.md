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

Use the established terms consistently:

| English | Hebrew |
| --- | --- |
| Part | חלק |
| Chapter | פרק |
| Binder | קלסר כתב היד |
| Outline | מתווה |
| Reference | לעיון |

The language changes only app-owned interface copy. It never translates or
rewrites a writer's novel.

## Review checklist

1. Update `en.json`, `he.json`, and `qqq.json` together for every new key.
2. Run `npm run test -- src/i18n/translator.test.ts`.
3. Review English and Hebrew in the app with mixed-script names and technical
   values; check both interface directions and longer translations.
4. Never claim visual qualification from catalog tests alone. Real browser,
   Linux package, and Windows installer checks are tracked separately in the
   project's localization ADR 0016.
