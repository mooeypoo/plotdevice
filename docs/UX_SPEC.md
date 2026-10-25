# Plot Device — UX & Visual Design Specification
Version: 0.3 draft

## Navigation
- Persistent Story | Write switch (Story is working term, not a pre-writing phase).
- Reopen to last workspace and context. A workspace remembers its last outline/view; Write remembers chapter, scroll and selection (subject to persistence safety).
- No necessary dashboard after initial project creation. Avoid developer vocabulary in regular UI.
- Do not automatically infer manuscript semantics from arbitrary outline titles.

## Write layout
- Central writing surface; hideable manuscript navigator and hideable reference shelf.
- Three layout presets: Standard, With References, Focus. All render one editor instance; layout changes never remount the editor or erase undo history.
- Search reference catalog by title; open overlay, peek or pin to shelf; move pinned cards by pointer or keyboard; linked contextual references may be suggested without AI.
- Chapter is the editing and autosave unit. Navigation can prefetch one adjacent chapter but does not load all chapters.
- Scene breaks can be inserted as `* * *` in chapter Markdown; no distinct scenes to manage in MVP.
- Primary writing shortcuts discoverable from menu/help; keyboard-only complete.

## Story layout
- An author can create multiple named outlines; each opens in Board, Outline or Cards view, with last selection preserved.
- Outline mapping: `#` optional document title; `##` headings -> sections/columns; first-level `-` bullets -> cards; nested bullets -> details. Depth may be collapsed and is not fixed at exactly two levels.
- Board drag to reorder a card and descendants; moving between columns only changes the outline document.
- Inline rename section/card/detail; clear affordance for Add section, Add card, Add detail; undo for structural edits.
- Derived Manuscript Outline is a distinct read-only projection of manuscript order, with explicit navigation/rename/reorder actions invoking manuscript commands.
- Character/place/notes views initially use a short title, description and expandable details, not developer-like forms.

## Outline UX edge cases
- Empty outline: guided first card or blank start, without forcing templates.
- Heading with zero cards: empty column shown.
- Very long card: collapse preview, full text in detail editor.
- Deep nested bullets: represent with visual nesting in Outline, preview truncation in Board.
- Unsupported Markdown blocks: preserve and show a visible warning; never discard silently.
- Drag/drop in RTL: logical beginning/end based on UI direction; equivalent explicit Move menu for access needs.

## Color system — preliminary design tokens
All proposed values require contrast checking on real components and both themes.
```
light:
  canvas:    #F7F5F1
  paper:     #FFFFFF
  surface:   #EFEEE9
  text:      #27313A
  secondary: #677480
  accent:    #288C89
  warning:   #A26832
  focus:     #246FC1

dark:
  canvas:    #191E27
  paper:     #242A34
  surface:   #303744
  text:      #EAE7E2
  secondary: #A8B0BC
  accent:    #64C6BB
  warning:   #E0AB76
  focus:     #9CBFF8
```
- Default accent candidate: Literary Teal; alternative palettes may be user-selectable later.
- Plotline/card colors must include labels, icons or patterns as redundant signals.
- No color-only status, no low contrast decorative text for essential controls.
- Theme switch updates token variables without editor remount.
- Respect reduced-motion and OS theme preference, with explicit override.

## Typography
- Prioritize readable, language-appropriate fonts; separate UI and manuscript font preferences; do not assume Latin and Hebrew share identical metrics.
- Adjustable writing font size, line height, text width and paragraph spacing, persisted as preference, not embedded in manuscript Markdown.
- Test Hebrew bold weights, punctuation and directional keyboard behavior in final fonts.

## RTL specification
- Locale and editor direction independent; allow auto/LTR/RTL direction for each writing block where supported.
- Use `dir=auto` and `bdi` or equivalent isolation for user-origin labels; avoid leaking BiDi control characters into content.
- Use CSS logical properties; icons and timeline order are not automatically mirrored without semantic review.
- Test navigation arrow keys, Home/End, selection, caret, mixed English/Hebrew numbers and quotes; voice/screen reader labels in both locales.

## UX validation tasks with authors
- 'Write without planning'; 'Find a character detail without losing cursor'; 'Move an idea on the board'; 'Reorganize chapters'; 'Open Markdown in another app'; 'Write mixed-direction dialogue'.
- Success measures: task completion, errors, hesitation, and self-reported clarity; do not prescribe target seconds without study data.
