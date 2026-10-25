# Plot Device — Design System v0.1

## Feeling
Modern literary studio: warm, clear, spacious, quietly creative. Do not emulate an IDE, grayscale wireframe or complicated productivity dashboard. Prose is the visual priority in Write; Story may use restrained color to clarify groupings.

## Themes
Offer `system` (default), `light`, and `dark`. Theme is a user preference stored in OS app data, not book Markdown. All component tokens must render under both themes and RTL layouts. Never derive essential meaning from color alone.

### Proposed tokens (exploratory; test contrast)
| Token | Light | Dark |
| --- | --- | --- |
| app background | `#F7F5F1` | `#191E27` |
| surface/card | `#FFFFFF` | `#272D38` |
| prose/page | `#FFFDF8` | `#222831` |
| primary text | `#27313A` | `#EAE7E2` |
| secondary text | `#677480` | `#A8B0BC` |
| brand teal | `#288C89` | `#64C6BB` |
| plot accent amber | `#C48D50` | `#E3B77E` |
| optional plum | `#8C628C` | `#C4A0D2` |
| optional terracotta | `#BA7158` | `#E4A186` |

These are starting colors, not accessibility-certified. Validate contrast for text, icons, boundaries, selected items and focus states and adjust accordingly. Define semantic tokens (`--color-surface`, `--color-focus`, etc.), never sprinkle hex values across components.

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
