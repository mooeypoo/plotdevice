# Changelog

Notable changes to Plot Device are recorded here using
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

No version has been published yet. The first candidate is `0.1.0-beta.1`;
the first stable MVP is planned as `0.1.0`. The app version is independent of
the novel file format, which remains `format: 1`.

## [Unreleased]

### Added

- Local-first novel projects in plain Markdown, with a manuscript binder, chapter
  editor, autosave, and frontmatter property editing.
- Parts and chapters with reordering, file renames, and wikilink updates.
- Characters, locations, notes, templates, link completion, and relationships.
- Overlapping character groups with inspector assignment, collapsible cast lists,
  name/alias search, group filters, and remembered per-project navigation preferences.
- Writer-authored outlines, a manuscript overview, story timelines, and character
  co-appearance views.
- Rendered Markdown outline references with raw editing, explicit loading/error
  states, stale-load protection, and an expandable, resizable panel with remembered width.
- Hebrew and mixed-direction prose support, focus mode, and writing appearance settings.
- Outside-edit detection and explicit conflict recovery, including saving a
  separate recovered copy without replacing the original.
- Linux x64 AppImage and Debian packages. Windows code remains checked in CI,
  with manual installer builds available for future qualification.
- Read-only release preparation helpers and a maintainer release checklist.
- Tag-triggered draft release assembly with x64 installers, SHA-256 checksums,
  build metadata, and verified retry behavior.
- A locally previewable writer's manual with installation and safety guides,
  local search, mixed-direction examples, and gated GitHub Pages deployment.
- Published-release discovery powering consistent download links and a version-1
  JSON feed, with stale-deployment guards and anonymous post-deployment checks.
- Linux software-center metadata with developer attribution, GPL license,
  documentation/help links, a screenshot, and packaged license information.

### Known limitations before the first release

- The first candidate is Linux-only. Actual packaged Linux installation and
  data-safety qualification are still required before publication.
- Windows installers are not distributed: real Windows/VM installation testing is
  pending, and signing policy is unresolved. Passing CI is not installer qualification.
- The draft release pipeline still needs a real tagged Actions rehearsal.
  The public documentation and version feed are deployed; no stable app release
  exists yet, and the in-app update checker is not implemented.
- Recovery is session-local; persistent crash recovery is not provided.
