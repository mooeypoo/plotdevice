# Localization presentation support

Bundled `en`, `he` and translator-documentation `qqq` catalogs use banana-i18n.
Add whole messages with stable keys and document every parameter in `qqq`.
The typed formatter is instance-local; Vue owns reactive locale invalidation.
Render escaped text, never catalog HTML; callers isolate dynamic content.
Story-date messages retain Gregorian precision, signed years and day counts; no calendar conversion.
Main owns persisted interface language; manuscript direction is independent.
This module must not import main, renderer, preload, Node or Electron.
Domain/application code must not import this module or translation libraries.
ADR 0016 tracks the incomplete translation and RTL migration across sessions.
