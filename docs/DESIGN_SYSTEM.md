# Plot Device — Design System v0.1

## Feeling
Modern literary studio: warm, clear, spacious, quietly creative. Do not emulate an IDE, grayscale wireframe or complicated productivity dashboard. Prose is the visual priority in Write; Story may use restrained color to clarify groupings.

## Themes
Offer `system` (default), `light`, and `dark`. Theme is a user preference stored in OS app data, not book Markdown. All component tokens must render under both themes and RTL layouts. Never derive essential meaning from color alone.

### Colour tokens

These values are the authority (owner decision, 2026-10-25). Every pair below is checked by an automated WCAG contrast test: 4.5:1 for text, 3:1 for focus rings, icons and colour chips. Four light values were darkened slightly from the first proposal so they pass. The originals are in git history.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `app` | `#F7F5F1` | `#191E27` | App background |
| `card` | `#FFFFFF` | `#272D38` | Panels, cards, dialogs |
| `page` | `#FFFDF8` | `#222831` | The writing page |
| `text` | `#27313A` | `#EAE7E2` | Primary text |
| `textSecondary` | `#5E6A75` (was `#677480`) | `#A8B0BC` | Secondary text, labels |
| `accent` | `#1F7A77` (was `#288C89`) | `#64C6BB` | Brand teal: links, selected states, primary buttons |
| `warning` | `#9C6430` (was `#A26832`) | `#E0AB76` | Warnings (always with an icon or word, never colour alone) |
| `focus` | `#246FC1` | `#9CBFF8` | Keyboard focus rings |
| `plotAmber` | `#BB803F` (was `#C48D50`) | `#E3B77E` | Plot and card colour category |
| `plotPlum` | `#8C628C` | `#C4A0D2` | Plot and card colour category |
| `plotTerracotta` | `#BA7158` | `#E4A186` | Plot and card colour category |

Light text on the light accent (white on `#1F7A77`) is 5.1:1. Dark text on the dark accent is 8.2:1.

**One source of truth.** All colours are defined in a single constants file in the UI package. CSS custom properties (`--color-text`, `--color-accent`, …) are generated from it, and components use only those variables, never hex values. Changing a colour, adding a palette, or (later) letting authors choose or import their own theme means swapping that set of constants, not editing components. Any replacement set must pass the same contrast test.

## Components and interaction
- Shared primitives: Button, IconButton, Dialog, Menu, Tabs, Field, Search, Status, Toast, Card, ResizablePanel, TreeItem, EmptyState, ReferenceCard.
- Story-specific: OutlineSection, OutlineCard, NestedDetail, OutlineTree, BoardColumn. Each supports keyboard interaction and accessible names.
- Write-specific: ChapterNavigator, ChapterEditor, ReferenceShelf, SearchPalette, FocusModeControls. Opening references or changing appearance must not recreate the editor instance.
- Add design tokens for typography, prose measure, spacing, radius, elevation, motion, and reduced-motion variants.
- Clear selected/hovered/focus-visible states. Motion must be subtle and reduced on preference.
- English/Hebrew fonts must render clear mixed-script punctuation and consistent metrics. Prefer system font stacks initially; no external font files committed without license review.
- Use `dir` deliberately; no blanket CSS transform/mirror. CSS logical properties and BiDi isolation for user-supplied labels.

## UX design gates
1. Test a brand-new writer creating a project and writing a chapter without any outline.
2. Test outline Board ↔ Outline ↔ Cards without content loss.
3. Test Hebrew UI + English prose, English UI + Hebrew prose, and mixed-direction references.
4. Test narrow screens, large zoom, keyboard-only and screen-reader basics.
5. Test both themes and contrast, especially in manuscript text and plotline color labels.
