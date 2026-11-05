# Plot Device — Product Requirements Document
Version: 0.4 (draft, 2026-11-04). Roadmap decisions D1–D9 (`docs/plans/roadmap-16-approachable-studio-and-timelines.md`) applied.

## 1. Product statement
Plot Device is a local-first, multilingual writing studio for non-technical writers, including people who are wary of technology: people who work in Word today, who distrust cloud tools and subscriptions, and who will never type `## ` on purpose. It combines a distraction-minimized chapter writer with a flexible Story workspace for outlines, plots, characters, places and whatever else the project needs.

What the author sees is calm, rendered text. Underneath, content remains human-readable Markdown in an organized folder, usable without Plot Device. Markdown is the safety net, not a feature authors have to see. Technical authors are still served, with plain-text ways in for fixing things by hand, but the everyday interface is for writers.

## 2. Target users
- A writer coming from Word, who is not technical and may be wary of technology, and expects text to look like text.
- Author who wants to open Chapter 1 and immediately write without outlining.
- Outliner who arranges beats, developments and ideas on a visual board.
- Discovery writer who alternates between prose, references and evolving story structure.
- A game master preparing a campaign: sessions instead of chapters, NPCs, factions and lore instead of characters and places.
- Bilingual author working in Hebrew and/or English, including mixed-direction text.
- A technical author who wants to edit the Markdown directly, in the app or elsewhere.

## 3. Goals and measurable acceptance
G1. Onboarding: a first-time user can create a local project and type prose into its first chapter without creating an outline, plotline or character.
G2. Navigation: resume last working workspace/chapter/view and preserve editor focus/selection when opening references or changing panels.
G3. Ownership: plain Markdown chapter and outline files remain readable in generic editors; `CONTENTS.md` plus the manuscript directory let a person recover reading order without running Plot Device.
G4. Safety: no acknowledged save overwrites concurrent on-disk edits silently; errors are explicit and writing remains recoverable.
G5. Accessibility and localization: the same primary journeys work with English and Hebrew UI, LTR and RTL prose, and keyboard-only navigation.
G6. Fluidity: editing a chapter does not mount the entire manuscript in one editor; reference and outline rendering are independently loaded.
G7. No visible Markdown: in normal use an author never sees Markdown symbols. Raw Markdown appears only when the author asks for plain text (ADR 0010).

## 4. Workspaces
### Write
- First-class chapter editing, optional part grouping, reorder chapters, create/rename/remove chapters with confirmation and undo/recovery where appropriate.
- Manuscript navigator; focus mode; on-demand searchable reference shelf; optional pinned reference cards.
- Configurable typography, paper width and comfortable spacing; accessible keyboard shortcuts.
- Rendered editing: headings, bold, italics and links show as formatting, never as Markdown marks, on every line including the cursor's (ADR 0010).
- Optional scene breaks inserted as conventional Markdown thematic breaks, **not** separate scene files or semantic Scene domain records in MVP.
- Editing chapters does not require outlines, characters or plots.

### Story (working label; user-testing may change it)
- User-created outlines shown as Board, List (Outline), Text and, from Milestone 20, Timeline views. Views are presentations of one outline, not duplicated content. (Cards was removed in Milestone 11.)
- Text shows the outline rendered (sections as headings, cards as bullets, links as names) and is typed freely (Milestone 14, rendered from Milestone 16).
- Every page, chapter and outline can be opened as **plain text**: the same file with every mark visible, saved exactly as typed (ADR 0010).
- Multiple independent outlines per project (`outlines/*.md`), e.g. main story, character arc, loose ideas.
- Simple model: Markdown `##` headings map to sections/board columns; primary bullets map to cards; nested bullets map to detail hierarchy. This shape is fixed, and explained to authors rather than made configurable.
- Drag cards within/between sections while keeping nested children; keyboard equivalents mandatory.
- **Timeline** (Milestone 20, ADR 0012): an outline's sections as moments in time and its cards as events. Lanes per page follow (Milestone 21), chosen by kind or by tag. A view of the outline only, never a separate timeline file or engine.
- World pages are of the **kinds the project defines** (ADR 0011): Characters, Places and Notes by default; NPCs, Factions, Items or anything else when the author adds them. All kinds behave the same: title, other names, description, relationships, tags.
- Create/edit pages as Markdown with human-friendly UI.
- Optional links from outline items to chapters and pages. A named heading 'Chapter 3' does **not** implicitly link to manuscript Chapter 3.
- A separate *derived* manuscript outline lists actual parts/chapters and reflects manifest order; not editable as an independent outline copy.

## 5. New project and continuity
- New project starts by asking what the author is making, from templates: Novel, Short story, D&D campaign and Blank (Milestone 19). Blank is always offered, so no creative template is mandatory.
- A template is a bundled project skeleton: the right kinds of pages, the name of the manuscript unit (chapter, session), starter outlines. Once created, the project is simply the author's; a template leaves nothing behind that matters.
- Then title, location and story language; sensible defaults for the remainder.
- On reopening, resume prior activity rather than forcing a dashboard.
- Workspace and panel arrangement are preferences and must not alter story content.

## 6. File-based interoperability
- Chapter body in **one Markdown file per chapter**; no automatic chapter-to-scene splitting.
- Outline files are standard Markdown headings/lists.
- Author-owned content and portable references in project folder; per-user UI language/theme in OS application data; optional nonauthoritative workspace layout state in `.plotdevice/`.
- Manifest establishes manuscript order, independently from filename order.
- Advanced 'Rename source file' and 'Synchronize filenames with manuscript order' operations may be introduced after basic file safety; provide preview, collision checks and update of managed references.
- Renaming a kind of page never renames its folder. A separate, explicit **Match folder names…** helper does, with a preview, a backup step and undo (D5, ADR 0011).
- Editing externally is supported for close/reopen, not as a collaborative live-edit guarantee. Warn on ambiguous or concurrent changes.
- Basic manuscript export: concatenate ordered chapter bodies with clearly defined part/chapter delimiters; richer publishing is deferred.
- **Import from Word** (Milestone 22): a `.docx` manuscript split into chapters, with a preview before anything is created; the original file is never changed. Chapters only: world material is still moved in by hand or with an assistant (Milestone 13).

## 7. Localization and bidirectionality
- English and Hebrew are both first-class. Every release is complete, working and tested in both; neither is a fallback or an afterthought.
- Hebrew leads: the first promotion is to Hebrew writers, mockups are drawn in Hebrew first, and Hebrew wording is written by a Hebrew writer, not translated. English stays the source catalog in development.
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

## 9. Scope
IN: local project management; chapter writing; optional parts; manuscript ordering; Markdown persistence; Story outlines; Board/List/Text projections; rendered editing with a plain-text mode; page kinds per project; templates for new projects; timelines and lanes as views of outlines; Word import for chapters; basic characters/places/notes; quick reference shelf; English/Hebrew; RTL/BiDi; light/dark/system; autosave and external-change guardrails; keyboard access; basic manuscript export.

LATER, designed together with the owner before any plan: export to Word; backups to a folder the author chooses; story order vs. book order on the timeline; several outlines on one timeline; optional real dates on moments; tags on cards (ADR 0012); optional nikkud, possibly with a dedicated way to type it; a read-only relationship map drawn from existing relationships (ADR 0009). See the roadmap's Milestone 21 and 22 tables.

OUT: cloud sync, collaboration, AI writing, full publishing suite, hand-drawn relationship webs, a separate timeline engine or timeline file, dates guessed from prose, arbitrary block database, semantic scenes, generalized board configuration language, a public plugin API and real-time multieditor merge.

## 10. End-to-end acceptance scenarios
A. New author creates project, writes Chapter 1, exits, reopens and sees prose intact in Write.
B. Author creates `outlines/main-story.md`, adds sections and nested cards visually, switches between Board and List, and verifies no Markdown content was lost.
C. Author moves a card to another column and sees only the expected heading/list structure change; written chapters stay untouched.
D. Author links a card to a chapter, character or place and can consult those links while writing; no automatic prose changes.
E. Author moves a chapter in the manuscript, and both derived manuscript outline and exported manuscript reflect the new order without renaming the underlying chapter file.
F. Author writes Hebrew prose with embedded English names and punctuation, switches the UI language independently, saves/reopens, and sees correct characters and direction.
G. Author changes a file externally after it was loaded, attempts to save stale editor content, and receives a conflict with recovery/copy options rather than silent overwrite.
H. Switch theme while writing: no content, cursor or editor state loss.
I. Missing/malformed chapter is reported with a safe, non-destructive recovery path.
J. Author writes an outline in Text without typing any Markdown symbol, switches to Board and sees the expected sections and cards.
K. Author adds a "Factions" kind, creates a faction, links it from a card, renames the kind, matches folder names, and the link still works in the app and in the file.

## 11. Open product decisions
- Final public label for 'Story' workspace.
- Names for the rendered Text view and the plain-text mode, if "Text" and "plain text" prove confusing in testing.
- Which way time runs in a Hebrew interface (D8): earlier on the reading-start side (right in Hebrew, left in English) is the working rule, to validate with Hebrew testers.
- Optional document links and outline item stable-ID encoding after proof of concept.
- Final color palette and theme contrast audits.
