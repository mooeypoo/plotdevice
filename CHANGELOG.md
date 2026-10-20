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
- Writer-authored outlines, a manuscript overview, story timelines, and character
  co-appearance views.
- Hebrew and mixed-direction prose support, focus mode, and writing appearance settings.
- Outside-edit detection and explicit conflict recovery, including saving a
  separate recovered copy without replacing the original.
- Linux AppImage and Debian packages, and a Windows installer built by CI.
- Read-only release preparation helpers and a maintainer release checklist.
- Tag-triggered draft release assembly with x64 installers, SHA-256 checksums,
  build metadata, and verified retry behavior.
- A locally previewable writer's manual with installation and safety guides,
  local search, mixed-direction examples, and gated GitHub Pages deployment.

### Known limitations before the first release

- Installer qualification is still required, including testing on a real Windows
  installation or VM.
- Windows installers are not signed. Signing policy remains a launch decision.
- The draft release pipeline still needs a real tagged Actions rehearsal. The
  documentation site is not publicly deployed; public publication, the version
  feed, and in-app update checks are not available yet.
- Recovery is session-local; persistent crash recovery is not provided.
