# Plot Device — Product Requirements Document
Version: 0.3 (draft, 2026-10-25)

## 1. Product statement
Plot Device is a local-first, multilingual writing studio for nontechnical fiction authors. It combines a distraction-minimized chapter writer with a flexible Story workspace for outlines, plots, character development, locations and notes. Content remains human-readable Markdown in an organized folder, usable without Plot Device.

## 2. Target users
- Author who wants to open Chapter 1 and immediately write without outlining.
- Outliner who arranges beats, developments and ideas on a visual board.
- Discovery writer who alternates between prose, references and evolving story structure.
- Bilingual author working in Hebrew and/or English, including mixed-direction text.

## 3. Goals and measurable acceptance
G1. Onboarding: a first-time user can create a local project and type prose into its first chapter without creating an outline, plotline or character.
G2. Navigation: resume last working workspace/chapter/view and preserve editor focus/selection when opening references or changing panels.
G3. Ownership: plain Markdown chapter and outline files remain readable in generic editors; `project.md` plus the manuscript directory let a person recover reading order without running Plot Device.
G4. Safety: no acknowledged save overwrites concurrent on-disk edits silently; errors are explicit and writing remains recoverable.
G5. Accessibility and localization: the same primary journeys work with English and Hebrew UI, LTR and RTL prose, and keyboard-only navigation.
G6. Fluidity: editing a chapter does not mount the entire manuscript in one editor; reference and outline rendering are independently loaded.

## 4. Workspaces
### Write
- First-class chapter editing, optional part grouping, reorder chapters, create/rename/remove chapters with confirmation and undo/recovery where appropriate.
- Manuscript navigator; focus mode; on-demand searchable reference shelf; optional pinned reference cards.
- Configurable typography, paper width and comfortable spacing; accessible keyboard shortcuts.
- Optional scene breaks inserted as conventional Markdown thematic breaks, **not** separate scene files or semantic Scene domain records in MVP.
- Editing chapters does not require outlines, characters or plots.

### Story (working label; user-testing may change it)
- User-created outlines shown as Board or List (Outline) views. Views are presentations of one outline, not duplicated content. (Cards was removed in Milestone 11.)
- Multiple independent outlines per project (`outlines/*.md`), e.g. main story, character arc, loose ideas.
- Simple model: Markdown `##` headings map to sections/board columns; primary bullets map to cards; nested bullets map to detail hierarchy.
- Drag cards within/between sections while keeping nested children; keyboard equivalents mandatory.
- Create/edit character, place and note pages as Markdown with human-friendly UI.
- Optional links from outline items to chapters/characters/places. A named heading 'Chapter 3' does **not** implicitly link to manuscript Chapter 3.
- A separate *derived* manuscript outline lists actual parts/chapters and reflects manifest order; not editable as an independent outline copy.

## 5. New project and continuity
- New project: title, location and optionally story language; sensible defaults for remainder.
- On first launch, no mandatory creative template; optional ideas for getting started.
- On reopening, resume prior activity rather than forcing a dashboard.
- Workspace and panel arrangement are preferences and must not alter story content.

## 6. File-based interoperability
- Chapter body in **one Markdown file per chapter**; no automatic chapter-to-scene splitting.
- Outline files are standard Markdown headings/lists.
- Author-owned content and portable references in project folder; per-user UI language/theme in OS application data; optional nonauthoritative workspace layout state in `.plot-device/`.
- Manifest establishes manuscript order, independently from filename order.
- Advanced 'Rename source file' and 'Synchronize filenames with manuscript order' operations may be introduced after basic file safety; provide preview, collision checks and update of managed references.
- Editing externally is supported for close/reopen, not as a collaborative live-edit guarantee. Warn on ambiguous or concurrent changes.
- Basic manuscript compilation: concatenate ordered chapter bodies with clearly defined part/chapter delimiters; richer publishing is deferred.

## 7. Localization and bidirectionality
- English primary and Hebrew secondary UI catalogs, both usable in the initial release.
- Banana-style JSON keyed messages with placeholders, CLDR plural/gender capabilities and fallback; no POT/gettext primary workflow.
- Distinguish UI locale, UI direction, project language and per-block text direction.
- Isolate user-generated names in mixed-direction UI; use logical CSS properties; test selection and punctuation with BiDi text.
- External and imported author text must not be treated as trusted UI markup.

## 8. Themes and design language
- Ship polished light, dark and system-following appearance.
- Brand direction: **modern literary studio** rather than IDE or grayscale dashboard.
- Colours come from the logo (ink, cream and gold), chosen in Milestone 9; `DESIGN_SYSTEM.md` holds the values.
- Light warm canvas and comfortable white/cream paper; dark ink/slate surfaces (not pure black), gentle paper contrast.
- Plot-card color categories can aid scanning; every color-coded state requires a noncolor cue.
- Design tokens control palette, spacing, typography, elevation, motion and focus rings.
- Editor-focused layout must remain visually quieter than Story workspace.

## 9. MVP scope
IN: local project management; chapter writing; optional parts; manuscript ordering; Markdown persistence; Story outlines; Board/List projections; basic characters/places/notes; quick reference shelf; English/Hebrew; RTL/BiDi; light/dark/system; autosave and external-change guardrails; keyboard access; basic compiled manuscript output.
OUT: cloud sync, collaboration, AI writing, full publishing suite, relationship graphs, elaborate timeline engine, arbitrary block database, semantic scenes, generalized board configuration language and real-time multieditor merge.

## 10. End-to-end acceptance scenarios
A. New author creates project, writes Chapter 1, exits, reopens and sees prose intact in Write.
B. Author creates `outlines/main-story.md`, adds sections and nested cards visually, switches between Board and List, and verifies no Markdown content was lost.
C. Author moves a card to another column and sees only the expected heading/list structure change; written chapters stay untouched.
D. Author links a card to a chapter, character or place and can consult those links while writing; no automatic prose changes.
E. Author moves a chapter in the manuscript, and both derived manuscript outline and compiled output reflect the new order without renaming the underlying chapter file.
F. Author writes Hebrew prose with embedded English names and punctuation, switches the UI language independently, saves/reopens, and sees correct characters and direction.
G. Author changes a file externally after it was loaded, attempts to save stale editor content, and receives a conflict with recovery/copy options rather than silent overwrite.
H. Switch theme while writing: no content, cursor or editor state loss.
I. Missing/malformed chapter is reported with a safe, non-destructive recovery path.

## 11. Open product decisions
- Final public label for 'Story' workspace.
- Rich editor candidate and allowed formatting subset.
- Whether authors can have rich prose inside outline bullets or only nested simple item text in MVP.
- Optional document links and outline item stable-ID encoding after proof of concept.
- Final color palette and theme contrast audits.
- Whether generated human-readable table of contents lives in `project.md` or `CONTENTS.md`.
