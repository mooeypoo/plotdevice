# i18n

Interface translation: English and Hebrew catalogs in banana format (`src/messages/*.json`) and one
facade, `createTranslator`, over Wikimedia's banana-i18n (parameters, CLDR plurals, gender, fallback).

- Code asks for message keys; no interface text is hard-coded anywhere else.
- Every message is documented for translators in `src/messages/qqq.json`: what it is (a button, a heading, a notice), where it shows, what each `$1` holds, and anything that changes the translation. A new message comes with its note, and a test checks that every key has one. Translation tools such as Paper Lion show the note beside the message.
- Hebrew wording is natural and gender-neutral.
- Interface direction (`uiDirection`) is separate from a book's text direction (domain).
- Framework-free: the Vue binding lives in `ui-vue`.
