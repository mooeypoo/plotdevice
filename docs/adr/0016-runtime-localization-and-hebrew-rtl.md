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
    - [x] **I2b.1 Warnings:** project/manuscript semantic warnings, file-problem
      descriptions, localized panel, locale-independent identities and fixes.
    - [ ] **I2b.2 Action failures:** expected errors and cached failure state
      across editor/recovery/navigation, remaining stores, handlers and fakes.
      - [x] **I2b.2a Save/recovery:** semantic file-body/save/recovery failures,
        cached editor notices, recovery controls and replacement confirmation.
      - [ ] **I2b.2b Remaining operations:** create/rename/move, property
        validation, workspace/reference/inspector errors and remaining caches.
        - [x] **I2b.2b.1 Properties/relationships:** semantic read/write refusals,
          live editor/background-synopsis errors and relationship safety details.
        - [ ] **I2b.2b.2 Remaining operations/caches:** create/rename/move,
          workspace/reference/inspector queries and partial-success summaries.
          - [x] **Structural operations:** rename/move/renumber refusals,
            cached partial-success notices and explicit rename-plan errors.
          - [x] **Creation/mutations:** create/template/type/status/fix
            diagnostics and reactive action/inspector error caches.
          - [x] **Workspace:** open/initialize/refresh refusals, technical
            creation details, live notices and explicit current-project errors.
          - [x] **Listings/readers:** live manuscript/codex listing errors,
            visible sidebar failures and cached reference/outline read notices.
          - [x] **Inspector queries:** independent vocabulary/date-check errors,
            visible live notices and document/calendar-aware request guards.
          - [x] **Cross-context queries:** timeline/interactions and appearance
            failures, live alerts and obsolete-request guards.
          - [x] **Reference actions/links:** semantic editor/reference/outline
            link notices, reactive reference edit failures and stale-action guards.
          - [x] **Storage notices:** document-tab load/save/invalid/pruning
            and writing-preference load/save/invalid notices.
          - [ ] **Remaining coverage:** audit remaining diagnostics and cached
            consumers before closing I2.
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

I2a was committed as `2d4e069`. The user then approved I2b.1 warnings as a
separate implementation/validation/documentation/commit slice. Action failures
remain I2b.2; I2b and I2 overall are not complete.

### I2b.1 handoff (2026-10-21)

Project and manuscript warnings now carry discriminated semantic parameters
instead of finished English sentences. Project warnings retain the unreadable
novel.md reason, newer format version, invalid settings key/value and expected
value category. Manuscript warnings retain duplicate order/titles, ambiguous
link source location and every target, unusable values and exact explicit fix
payloads. Domain code does not import translations; read-only/default decisions
and warning detection/deduplication rules are unchanged.

Contract version 16, both IPC mappers, preload and fake API share these warning
shapes. `features/warnings/format-warning.ts` translates cached warnings at
display time using English/Hebrew/qqq messages. File problems and all warning
panel copy (including open tooltips and fix buttons) also translate. User titles,
paths, YAML values and complete correction examples are display-only isolated;
catalog output stays escaped text, never HTML. Source keys and values are not
translated. General UI number formatting is still I3.

Warning groups use semantic IDs rather than translated headings. Row keys use
the serialized semantic source plus an occurrence number, never display text;
identical repeated diagnostics have distinct keys. Language switches retain
the same rows/buttons, keyboard focus and selected fix target. They do not
cause project reads, warning fixes or file writes. Tests cover all warning/file
problem branches, English detail preservation, source isolation, HTML escaping,
IPC parameters, read-only behavior and live switch/fix identity.

Verified lint and dependency boundaries, typecheck, all 1,207 tests across
146 files, and the production electron-vite build. The full suite includes
fixture-byte, recovery and editor regressions. A shared frontmatter-value
description helper preserves textual diagnostics even for missing list members;
it is not used for writing files. No dependencies or disk-format changes.
No new real-browser/packaged qualification or push was performed.

I2b.1 was committed as `217778c`. The user approved a bounded save/recovery
slice of I2b.2, including validation, documentation and commit. Remaining
operations require their own plan/approval rather than an unbounded migration.

### I2b.2a handoff (2026-10-21)

`DomainError` and `ApiError` now support optional discriminated diagnostics.
Stable error codes still control behavior; legacy English descriptions remain
for compatibility. The renderer formats migrated failures using their semantic
reason, never by parsing English or guessing from broad codes like `unreadable`.
Unmigrated failures explicitly retain their original message until I2b.2b.
The pure shared-kernel type and standalone contract DTO stay structurally
aligned through the IPC mapper. Contract version 17, preload and fake agree.

File-body reads/writes, frontmatter editing used by recovered templates, recovery
snapshots and recovered-copy publication retain semantic reasons and all existing
path/parser/technical details. Shared manuscript/codex handler guards are also
semantic. The main-process atomic writers, exclusive recovered-copy publication,
version checks and read-only decisions are unchanged. No new dependency or
on-disk format change was needed.

Editor save/action/recovery errors and disk notices retain their semantic source
and format reactively. Already-visible failures retranslate without retrying
operations, rereading files or losing drafts. Conflict/missing-file controls,
read-only copy, navigation blockers and the destructive replacement confirmation
are translated, retaining their actions, disabled states and safety promises.
Dynamic paths and technical details are isolated only in presentation; source
values and persisted project files never acquire bidi control characters.
Property-result and rename-skipped summaries remain deferred, not silently
treated as fully translated.

Regressions cover formatter branches and legacy compatibility, diagnostic IPC
passthrough, exact failed-write details and unchanged fixture bytes, cached
manuscript/codex save failures, explicit recovered-copy retries and a replacement
race that preserves newer outside bytes. Banner tests preserve button identity/
focus, raw isolated paths, emitted choices and read-only/busy behavior on a live
switch. Verified lint and dependency boundaries, typecheck, all 1,250 tests across
150 files, and the production electron-vite build. This is not real-browser or
packaged bidi certification; no push or release was performed.

I2b.2a was committed as `d1a7f13`. The user approved the next bounded slice:
property/relationship failures, including validation, documentation and commit.

### I2b.2b.1 handoff (2026-10-21)

Property and relationship commands now provide semantic diagnostics for read-only,
stale-version, unsafe character groups and non-character relationship refusals.
Both markdown adapters retain the exact path when an entry is no longer a
readable manuscript/codex type. Mapping-list editing provides the same semantic
frontmatter refusal reasons as scalar editing, and `writeMappingList` preserves
them instead of dropping diagnostics while wrapping `cannot-edit`. Existing
source-preservation checks, error codes and technical details remain unchanged.
The common IPC mapper already preserves these parameters; handler regressions
exercise the new failures. Contract version 18, preload and renderer fake agree.

`propertiesWritten` now accepts the full API failure instead of an English string.
Manuscript/codex property updates, background synopsis edits and relationship
updates retain semantic source state. The relationship safety explanation is a
documented English/Hebrew message wrapping a cached semantic failure, not a
preformatted English sentence. Property-read failures for the current entry are
now explicitly reported via the action-error surface rather than silently
returning empty properties; stale responses for another entry are still ignored.
Language switches reformat already-visible failures without triggering reads,
writes or retries, changing the writing target or resetting input controls.

The fake supplies semantic property/relationship missing/stale/unsafe/type
failures, with matching group/character guards. No new domain rules, dependencies
or disk-format changes. Save-first ordering, conflict transitions, read-only
checks and version preconditions remain intact. Remaining static inspector
labels/read-only explanations are I3, not claimed translated by this slice.

Regressions first reproduced missing mapping-list diagnostics and frozen cached
property/relationship messages. Tests now cover command/IPC diagnostics, refused
edits with byte-identical BOM/CRLF/comment/body fixtures, entry-type changes,
property reads and background synopsis failures, live cached English/Hebrew
switches without retries, and escaped relationship details while preserving DOM
controls/focus. Verified lint and dependency boundaries, typecheck, all 1,273
tests across 150 files, and the production electron-vite build. Documentation
build/link checks also pass. No real-browser/packaged qualification, push or
release was performed.

I2b.2b.1 was committed as `fb74094`. The user approved rename/move/renumber
diagnostics and partial-success notices as the next bounded slice, including
validation, documentation and commit.

### I2b.2b.2 structural-operations handoff (2026-10-21)

Manuscript/codex rename commands and manuscript move/renumber commands now emit
semantic reasons for read-only, unchanged name, missing chapter/part and required
destination refusals. The markdown relocator and in-memory relocation fake retain
the source or destination path for move failure/collision diagnostics. Existing
error codes, descriptions, link reports and file operations are unchanged; no
technical detail is discarded or invented. The common IPC mapper preserves the
new reasons, with handler regressions for the exposed paths. Contract version 19,
preload and renderer fake agree; success-only fake structural actions are
unchanged, with injected failure/partial-success results used in renderer tests.

Structural operations retain the full API error instead of copying its English
message. Partial renumbering and skipped-link rename results are semantic cached
notices, formatted using documented English/Hebrew Banana PLURAL messages.
Skipped paths are copied into source state and isolated only at presentation.
English singular grammar is corrected without changing the notice's meaning.
No language switch retries a move/rename, reloads files or changes the draft.
Failed rename planning is explicitly shown in the existing action-error surface;
results for a document that is no longer current are still ignored.

Save-first sequencing, stuck-draft blockers, move-following tabs/references and
partial-success behavior remain unchanged. In particular, moving between parts
still keeps successful metadata changes if the optional physical file move fails;
this slice does not redesign relocation, transactions or its reports. No new
dependencies, project-file format changes or RTL-geometry changes.

Regressions first reproduced frozen structural errors/notices and hidden plan
errors. Tests cover semantic command and IPC refusals, fixture collision/failure
paths without modified source/destination/linking files, English singular/plural
and Hebrew counts, exact skipped paths, cached manuscript/codex rename errors,
no retries/extra reads/writes on switches, saved drafts and stale-plan responses.
Verified lint and dependency boundaries, typecheck, all 1,301 tests across 150
files, and the production electron-vite build. Documentation build/link checks
also pass. No real-browser/packaged qualification, push or release was performed.

Structural operations were committed as `c23ee00`. The user approved creation/
template/type/status/fix diagnostics as the next bounded slice, including
validation, documentation and commit.

### I2b.2b.2 creation/mutations handoff (2026-10-21)

Chapter/part/codex/outline creation, template opening/creation, entry typing,
status addition and warning-fix commands now retain semantic refusal reasons.
Read-only and missing-part failures reuse existing diagnostics. New reasons cover
an unusable template folder, an already-typed entry, unsafe frontmatter link
rewriting and obsolete folder/quote fixes, with exact link names and source keys.
Existing file-create/write failures retain paths and technical details through
the same IPC mapper. Contract version 20, preload and renderer fake agree.

Manuscript/codex action consumers preserve full API errors instead of English
strings. The inspector error cache also retains semantic source state. Status-add
failures were previously cached but not displayed: the status section now exposes
them as escaped alert text, with an explicit successful retry clearing the notice.
Live switches retranslate failures without another API call or resetting unsaved
inspector input, DOM identity or focus. Other inspector query failure producers
remain queued below; retaining source state is not a claim they are all migrated.

The fake rejects obsolete type actions semantically before changing its listing;
its other success-only mutation actions remain unchanged, with injected failures
used for renderer regressions. Existing template-open/read-only exceptions,
save-first ordering, generated filenames/default titles/template text, fix rules
and source-preserving writes remain unchanged. No new dependencies or disk-format
changes. This does not localize generated manuscript content or remaining labels.

Regressions first reproduced frozen failures for all eight mutation consumers.
Tests cover read-only refusals without writes, existing read-only templates,
obsolete fixes with exact dynamic values and unchanged fixture bytes, unsafe link
rewrites, failed creation technical details without publication, IPC passthrough,
live English/Hebrew switching without retries, escaped status details and retained
input/focus, plus clearing the status notice after an explicit successful retry.
Verified lint and dependency boundaries, typecheck, all 1,326 tests across 150
files, and the production electron-vite build. Documentation build/link checks
also pass. No real-browser/packaged qualification, push or release was performed.

Creation/mutations were committed as `7bd6d98`. The user approved workspace
diagnostics/caches as the next bounded slice, including validation, documentation
and commit.

### I2b.2b.2 workspace handoff (2026-10-21)

Workspace open/read/initialize commands now emit semantic reasons for missing
folders, absent project markers, existing projects and nested projects. Diagnostic
parameters retain the exact chosen, containing or contained OS path; existing
`projectAbove`/`projectBelow` fields and authorization behavior remain intact.
Failed `novel.md` creation retains its exact OS path and raw technical detail
through initialization and IPC. Workspace request/authorization/no-open-project
refusals are semantic too. Error codes and legacy descriptions remain unchanged.
Contract version 21, preload and renderer fake agree.

The workspace store retains full API errors and a semantic unsaved-draft
navigation notice. Shared presentation formatting uses documented English/Hebrew
messages, with dynamic paths/details isolated only when displayed. No error text
is inferred from a broad code. Unmigrated errors explicitly retain their original
message, rather than the previous workspace-specific code-based substitution.
Cached failures retranslate without another project open, recent-list read or
write. Initialization input retains its DOM identity, unsaved title and focus.

Refresh failures were previously discarded, and the draft-safety notice had no
project-screen surface. Both now appear as escaped alerts in the project layout,
including focus mode. Refresh has a separate semantic error cache: a successful
refresh clears only its own failure, never an unresolved navigation notice.
Closing/opening clears the refresh cache; request generations and project identity
discard stale replies after closing, switching, reopening the same root or a newer
refresh. The project remains open on failure; no new automatic retries are added.

Generated project content, title fallback, read-only decisions, nesting checks,
recents recording/removal and atomic-write behavior are unchanged. The renderer
fake's success-only workspace methods remain unchanged; injected failures exercise
presentation and IPC paths. Recent-project list/remove and folder-choice methods
currently return values/void rather than structured failure results; redesigning
those APIs is deferred, not hidden behind a fabricated successful result here.
Initialization labels/native dialogs and close-window confirmation remain I3.

Regressions first reproduced cached English notices and invisible refresh errors.
Tests cover semantic application refusals, creation races/failures without project
publication or recents changes, unchanged existing marker bytes, exact adapter/
IPC technical details, cached English/Hebrew alerts with escaped dynamic text,
unchanged initialization input/focus, no locale-triggered retry, retained conflicted
drafts and outside bytes, refresh-only clearing and stale-response rejection.
Verified lint/dependency boundaries, typecheck, all 1,347 tests across 151 files,
and the production electron-vite build. Documentation build/link checks also pass.
No real-browser/packaged qualification, push or release was performed.

Workspace diagnostics were committed as `fa1107c`. The user approved listing/
reference/outline diagnostics as the next bounded slice, including validation,
documentation and commit.

### I2b.2b.2 listing/reading handoff (2026-10-21)

Manuscript/codex listing stores, the reference store and the outline composable
now retain full API failures for shared reactive presentation. Existing semantic
no-project/open-entry failures retranslate in place; unmigrated technical messages
remain explicit legacy text. The local unlisted-reference notice has documented
English/Hebrew/qqq coverage and retains the exact project-relative path, isolated
only when displayed. This is renderer-only source state, not a new IPC shape:
contract version remains 21, with no domain/application producer changes.

Listing failures were cached but not rendered. Each active sidebar tab now shows
its escaped failure alert, including failed initial loads without a listing.
The last successful listing remains available after a failed refresh, and only
that listing's successful query or project close clears its notice. Request
generations reject replies superseded by a newer load or completed after close,
so old results cannot restore a cleared error or overwrite a newer query outcome.
No new retry controls or automatic retries were introduced.

Reference/outline loading, request identity checks, independent reading selection,
scroll storage, editor-draft reading policy and navigation protections are
unchanged. Language changes do not trigger reads, listing reloads, saves or
reference scroll restoration. Reference's existing explicit Retry action and
outline reloads clear their read failures through the existing query path.
Other reference action/link notices and remaining labels still await migration.
The fake API already carries semantic open-entry failures; it is unchanged.
IPC regression assertions cover both listing no-project reasons.

Regressions first reproduced invisible listing failures and cached legacy reading
text. Mounted tests cover English/Hebrew switching without extra reads, initial
load errors, retained successful listings, per-query clearing, escaped legacy
details, draft/selection/scroll preservation, successful read retries, isolated
unlisted-reference paths and stale listing results after close/newer requests.
Existing reference/outline navigation and race tests continue to pass.
Verified lint/dependency boundaries, typecheck, all 1,359 tests across 152 files,
the production electron-vite build and documentation build/link checks.
No new dependencies, file-format changes, real-browser/packaged qualification,
push or release.

Listing/reference diagnostics were committed as `dd1b69f`. The user approved
inspector vocabulary/date-check diagnostics as the next bounded slice, including
validation, documentation and commit.

### I2b.2b.2 inspector-query handoff (2026-10-21)

Inspector IPC now retains existing no-project/invalid-request reasons as semantic
diagnostics, reusing the English/Hebrew catalogs and shared formatter. Contract
version remains 21: no new boundary shapes/reasons, dependencies or disk-format
changes. Legacy technical descriptions remain explicit escaped text when no
semantic diagnostic is available.

Vocabulary-query failures have a separate reactive cache from status-add failures.
Both manuscript and codex inspectors expose the vocabulary alert even without
properties. A failed reload keeps the last vocabulary; a successful reload clears
only its own notice, and a successful status action cannot hide it. Generations
reject vocabulary replies after clear or newer queries; status results completing
after clear cannot restore prior-project error state. Status writes and their
existing visible chapter controls otherwise remain unchanged.

Date-check failures were previously discarded as undefined readings. Shared
`useStoryDateCheck` now owns per-field reading/error state for chapter story dates
and character birth dates. A query failure is shown beside its input, distinct
from an invalid-date reading. New input clears the previous reading/notice;
empty input or no document clears locally without querying. Successful subsequent
checks clear the failure. No retry button/automatic retry loop was added.
Document/input/calendar identity, request generations and scope disposal reject
old replies, including A-to-B-to-A navigation. A real project calendar change
rechecks unchanged text, while switching interface language only reformats cached
readings/failures and never queries or writes. Components retain existing local
input values, DOM identity, focus and change-to-save behavior.

Regressions first reproduced invisible query failures in both inspectors. Tests
cover semantic IPC refusals without running invalid requests, vocabulary/status
notice independence, retained vocabulary, clear/newer-request races, mounted
English/Hebrew error switching without retries/writes/input/focus replacement,
exact escaped legacy details, successful later checks, blank input, stale document
replies, out-of-order/disposed checks and project-calendar changes. Existing
English/Hebrew date-reading and property-write tests continue to pass.
Verified lint/dependency boundaries, typecheck, all 1,376 tests across 156 files,
the production electron-vite build and documentation build/link checks.
No real-browser/packaged qualification, push or release.

Inspector diagnostics were committed as `d16a54c`. The user approved timeline/
interactions/appearance query failures as the next bounded slice, including
validation, documentation and commit.

### I2b.2b.2 cross-context-query handoff (2026-10-21)

Timeline and interactions IPC now include the existing no-project semantic reason.
Their view composables retain full failures and render escaped, reactive alerts.
A failed refresh keeps the last successful grid/matrix and all existing controls,
zoom, order and picked-pair state. A later successful query clears only its own
notice. Request generations and scope disposal reject obsolete success/failure
replies; no language switch queries, retries, replaces views or writes files.
Existing refresh triggers remain manuscript/codex changes, not locale changes.

Codex appearance failures were previously discarded into an empty array, making
the inspector incorrectly claim no chapters listed the entry. They now have a
separate semantic cache and alert beside Appears in, replacing that empty-state
claim when the query failed. Existing property failures remain independent.
The notice is scoped to the current editor path; another property read clears
the old notice and project close clears its cache and invalidates pending reads. Property-read request
generations plus current-path checks reject stale appearance/property results.
Successful reads restore the normal chapter list. The failed appearance array
still clears as before; this slice does not add cross-document cached appearances.

The shared formatter/catalogs already cover these reasons; no new messages or
diagnostic shapes were needed. Contract version remains 21. Success-only fake
query methods are unchanged; injected failures exercise presentation. No new
dependencies, file-format changes, new retry controls or transaction changes.
Interaction selection behavior on successful data changes is not redesigned.

Regressions first reproduced silent failures for all three query surfaces.
Tests cover semantic IPC no-project/appearance-authorization refusals, initial
query failures, cached English/Hebrew alerts without extra reads, exact escaped
legacy detail, retained view DOM/controls/pair state and conflicted manuscript
drafts on failed refresh, successful query clearing, unchanged inspector input/
focus, obsolete/disposed replies and newer same-document appearance results.
Verified lint/dependency boundaries, typecheck, all 1,390 tests across 158 files,
the production electron-vite build and documentation build/link checks.
No real-browser/packaged qualification, push or release.

Committed as `8cea98c feat: localize cross-context query failures`.

### I2b.2b.2 reference-action/link handoff (2026-10-21)

Shared link navigation now retains semantic unresolved wikilink/Markdown-link
notices and the unsupported-target refusal. English/Hebrew/qqq messages have
typed parameters; exact written targets, addresses and project-relative paths
are isolated only for display. Completion, resolution, routing and fallback
behavior remain unchanged. The shared composable covers editor, outline and
reference consumers. Unresolved notices still expire five seconds after the
action, not after the last language switch; disposing their scope cancels the
timer and clears the notice.

Reference Open in editor now captures the editor's semantic failure source
instead of copying already-formatted text. The editor exposes a narrow snapshot
getter, not a writable source ref; subsequent unrelated editor notices cannot
replace the reference's cached failure. Existing unsaved-navigation diagnostics
and explicit legacy API details are retained, with a localized fallback only
when no editor source exists. A new explicit attempt clears the reference action
notice. Request generations invalidate panel actions on another attempt,
reference selection changes (including A-to-B-to-A) and unmount. Obsolete
completions cannot set a panel error or change the inspector tab. This does not
cancel an already-requested editor navigation or redesign its serialized guards.

Regressions first reproduced cached English, missing display isolation and
obsolete panel failures. Coverage includes exact escaped mixed-script values,
the unchanged five-second expiry across language switches, scope timer cleanup,
semantic and explicit legacy failure snapshots, fallback and successful retry,
stale success/failure results, retained conflicted drafts and reference/outline
view DOM, scroll and focus without language-triggered reads/writes.
Verified lint/dependency boundaries, typecheck, all 1,409 tests across 158 files,
the production electron-vite build and documentation build/link checks.
Contract version remains 21. No new dependencies, disk-format changes or main/
preload/fake changes. Full RTL geometry and real-browser/packaged qualification
remain separate work.

Committed as `5a783a8 feat: localize reference actions and link notices`.

### I2b.2b.2 preference/session-notice handoff (2026-10-21)

Document tabs and writing preferences now retain typed catalog keys rather than
English strings for their storage notices. The seven English/Hebrew/qqq messages
cover tab load/save failures, invalid saved tab metadata, inactive-document
pruning, and preference load/save failures or invalid saved preferences. Existing
empty-string presentation interfaces and consumers are preserved through computed
text. No new helper, boundary shape or persistence format was needed.

Technical failures still log explicitly at the operation site, with a stable
English diagnostic label, semantic key and original error object. A locale switch
only formats cached keys: no storage reads/writes, logs, retries, navigation or
preference mutations. Invalid JSON and schema-invalid settings share the same
notice but keep their distinct original errors in the log.

Existing lifecycle behavior is intentionally unchanged. Tab notices clear on
clear/restore, not after an unrelated successful persistence operation; pruning
may replace the previous notice and never discards an active missing draft.
Writing-preference notices clear on a successful explicit save; failed saves
still apply the requested preferences in memory. Defaulting, schema validation,
tab restoration, corruption handling and storage keys/formats are not redesigned.
The notice is read-only presentation; the old appearance test now triggers a
real storage failure rather than injecting an English string into the store.

Regressions first reproduced all seven frozen-English notices. Store tests cover
malformed JSON, schema-invalid data, unavailable/full storage, round-trip locale
switches, no repeated logging/storage access, retained tab IDs and CodeMirror
state/selection/scroll, retained preference values and existing notice clearing.
Mounted tests retain tab/control DOM and focus, conflicted drafts, current range
values and visible tab notices in focus mode without language-triggered file or
storage operations. No browser/packaged RTL qualification is claimed.
Verified lint/dependency boundaries, typecheck, all 1,421 tests across 158 files,
the production electron-vite build and documentation build/link checks.
Contract version remains 21; no dependencies or novel-file changes.

**Next session:** audit remaining I2 diagnostics/cached consumers and propose a
bounded plan before changing code; do not mark I2 complete from this slice alone.
Logging-only invalid programmatic writing-preference values still return the
original Zod detail and have no displayed consumer; translating those diagnostics
or adding a UI surface was outside this scope. Full appearance/tab labels remain I3.
Preserve exact details and existing navigation/recovery behavior; avoid guessing
text from broad codes. Recent-project/folder-choice failure API design remains
explicitly deferred.
I2b/I2 remain incomplete. Full interface/native translation remains I3, and RTL
geometry/writing/reading qualification remains I4-I6. Restart the desktop process
for contract version 21: renderer hot reload cannot upgrade an older preload.
