# ADR 0016: Runtime localization and independent content direction

## Decision

Ship one app with bundled English and Hebrew catalogs and a persistent interface
language selector. Use banana-i18n with flat JSON catalogs, stable message IDs,
numbered parameters, plural rules, metadata, and matching `qqq` documentation.
No translation service or network request is required. English is the fallback.

Interface language, content direction, and project content are separate:

- Hebrew sets the interface root to `lang="he" dir="rtl"`; English uses LTR.
- Writing and reading retain automatic per-line/paragraph direction regardless
  of interface language. A later independent Auto/LTR/RTL override is user state.
- Switching language never translates or writes project files, statuses, names,
  templates, paths, YAML/schema tokens, or application/installer identities.

Main owns a validated, atomically written `userData/ui-preferences.json`. An
explicit choice wins over the system language; unsupported system languages
fall back to English. Load preferences before displaying the app. Persist a
switch before applying it; failed writes retain the current language and report
the error. Invalid/unreadable settings are reported and left untouched on load.
The typed API synchronizes main and renderer. App-owned native menus rebuild
without changing commands or accelerators. OS-owned chrome and dictionaries
may continue to follow the OS language.

Keep the runtime outside domain/application and the preload thin. Translate at
presentation boundaries, not in pure domain code. The eventual diagnostic/date
contract carries semantic reasons, parameters, endpoints and precision instead
of finished English sentences. Broad error codes alone are insufficient.
Stores retain semantic state so already-visible notices can translate live.

Messages are escaped text, not translation-driven HTML; Banana wiki-link
rendering remains disabled. Isolate interpolated user content with the existing
DOM/plain-text bidi helpers. Isolation controls must never enter saved content.
Use logical CSS and selectively mirror directional icons, not every SVG.
In Hebrew, panels and timeline progression run from inline-start on the right;
underlying chronology, manuscript order, file identity and link matching stay
unchanged. Display collation must not change identity or persisted ordering.

## Why

Hebrew requires more than translating buttons or setting global RTL. Mixed
writing, warnings, native menus, timeline geometry, and existing unsaved drafts
must remain correct. Banana catalogs are practical to maintain directly in git
and leave translation-platform integration optional.

## Follow-up and session handoff

Work one approved phase per session. Update this checklist with verified
progress, remaining limitations, and the next slice before ending a session.

- [x] **I1 Foundation:** typed Banana runtime; English/Hebrew/qqq catalogs;
  persisted locale; welcome/project selectors; explicit root language/direction;
  main/renderer synchronization and native menu refresh. Limited translated
  shell only: not a claim of complete Hebrew or RTL support.
- [ ] **I2 Diagnostics/dates:** structured errors, warnings and date readings
  through every IPC/fake/store consumer; late presentation formatting; stable
  warning identity; preserve signed/large years, precision and day counts.
  - [x] **I2a Story dates:** structured readings/issues across chronology, IPC,
    fake API, inspectors and timeline; localized cached dates and axis labels.
  - [ ] **I2b General diagnostics:** semantic failures/warnings, stable identity,
    and reactive formatting across all handlers, fakes, stores and consumers.
- [ ] **I3 Complete translation:** all components/helpers, accessibility text,
  existing notices, number formatting, display collation, native dialogs and
  controlled destructive confirmations; complete Hebrew and qqq coverage.
- [ ] **I4 RTL interface:** binder indentation/disclosures, logical layout,
  icons, responsive chrome, timeline coordinates/scroll, sticky matrix headers,
  keyboard/pointer interaction, selection retained by identity.
- [ ] **I5 Writing/reading:** independent direction preference; live CodeMirror
  phrases/placeholders; mixed-script caret/selection, completions and technical
  spans; consistent outline/reference policy without losing history or scroll.
- [ ] **I6 Qualification:** catalog validation, translator guide/glossary,
  expanded-text checks, real browser and packaged Linux/Windows journeys.
- [ ] **D1 Separate approval:** Hebrew VitePress manual/navigation/search/RTL
  and supported distribution descriptions, without language-specific installers.

Acceptance includes English UI/Hebrew content and Hebrew UI/English content,
mixed paragraphs with niqqud and Markdown, switching during unsaved/conflicted/
missing drafts, and byte-identical project files after language-only changes.
Happy DOM cannot certify bidi geometry, shaping, native menus or keyboard input.
Each implementation phase must pass lint, typecheck, all tests and the
electron-vite build; documentation work also runs its applicable site checks.

Initial scope: I1 only, approved 2026-10-21, including banana-i18n as a dependency.
Generated template language and alternate part numbering remain unchanged.
Next sessions should consult this ADR and the roadmap, not assume RTL is done
because the root direction or a partial Hebrew catalog exists.

### I1 handoff (2026-10-21)

Implemented 30 documented English/Hebrew messages in `src/i18n/`, a typed
instance-local formatter, and locale metadata. `main/ui-language.ts` serializes
changes through an atomic settings adapter; `ipc/ui-language-ipc.ts` exposes
fixed trusted channels. Contract version 14 includes `uiLanguage`; preload and
the renderer fake implement it. Renderer bootstrap initializes
`app/ui-language-store.ts` before mounting; `shared/LanguageSelector.vue` is
available on welcome, initialization and project screens. Native menus and
About use the same bundled catalogs. A failed preference write leaves the
previous language active rather than silently applying a session-only choice.

Verified lint, typecheck, 1,144 tests across 142 files, and electron-vite build.
New regressions cover system-tag selection, catalog parity/documentation,
Banana fallback/parameter ordering/Hebrew plurals, failed/invalid persistence,
serialized changes, trusted IPC arguments, reactive messages, error reporting,
menu roles/accelerators and unchanged project bytes. An isolated real-browser
preview verified Hebrew switching/restoration, mirrored panel placement and
preservation of the same editor DOM, mixed-language text and undo through a
language switch. This preview used the fake API: actual disk restoration is
covered by infrastructure tests, not a packaged Electron UI certification.
The pre-existing shared browser preview was not reloaded or modified.

Remaining: all I2-I6/D1 items above, including many English strings, native
folder-dialog/destructive-confirmation text, CodeMirror phrases, full bidi/
geometry qualification and Hebrew language review. Development-only menu roles
still use Electron's default labels. The Hebrew selector explicitly discloses
that translation/RTL support is in progress.

I1 was committed as `111e5be`. The user approved continuing with I2a separately
from the broader I2b diagnostics migration, including documentation and a second
commit. I2 overall remains incomplete until both slices pass.

### I2a handoff (2026-10-21)

Chronology now returns semantic `StoryDateIssue` reasons and structured date/
range readings instead of English descriptions. Contract version 15 carries
the endpoints and their precision through the inspector and timeline APIs;
timeline numeric spans are unchanged. The preload and renderer fake implement
the same shapes. No new dependencies or changes to the on-disk format.

`shared/story-date-format.ts` formats English/Hebrew dates at render time, with
documented Banana messages for month names, BCE, day counts, ranges and all date
validation reasons. It does not use JavaScript Date, change calendars or invent
precision. Invalid source values receive display-only bidi isolation. Both
inspectors reformat cached checks, and the timeline reformats columns, tooltips,
invalid-date tray and axis labels on a switch, without rereading or writing
project files. Axis tick positions and chronological ordering are unchanged;
RTL timeline coordinates are still I4, not implemented by translating labels.

Tests cover semantic domain failures, signed/large years, year zero, IPC
endpoint preservation, English/Hebrew formatting, source isolation, invariant
axis positions and live cached inspector/timeline switches without API reads or
writes. Unsaved prose and date input remain intact. This is not a real-browser
or packaged bidi qualification; those remain I6.

Verified lint (including dependency boundaries), typecheck, all 1,166 tests
across 144 files, and the production electron-vite build. The full suite includes
fixture round-trip and existing editor/recovery regressions. Patch whitespace
checks passed. No packaged release or push was performed.

**Next session:** plan I2b before implementation and obtain approval. Inventory
domain/application failures and warnings, design discriminated semantic
parameters rather than guessing translations from broad error codes, preserve
warning identity, and migrate every handler, fake, store and display consumer.
Include already-visible errors, ambiguous links, conflicts/recovery and failed
writes; do not lose details or change recovery behavior. General errors and
many labels/native dialogs remain English until I2b/I3. Restart the desktop
development process when testing I2a: renderer hot reload cannot upgrade an
already-running version-14 preload to version 15.
