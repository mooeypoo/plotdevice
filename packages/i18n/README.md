# i18n

Interface translation: English and Hebrew catalogs in banana format (`src/messages/*.json`) and one
facade, `createTranslator`, over Wikimedia's banana-i18n (parameters, CLDR plurals, gender, fallback).

- Code asks for message keys; no interface text is hard-coded anywhere else.
- Hebrew wording is natural and gender-neutral.
- Interface direction (`uiDirection`) is separate from a book's text direction (domain).
- Framework-free: the Vue binding lives in `ui-vue`.
