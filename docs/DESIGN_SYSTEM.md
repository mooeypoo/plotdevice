# Plot Device — Design System v0.1

## Feeling
Modern literary studio: warm, clear, spacious, quietly creative. Do not emulate an IDE, grayscale wireframe or complicated productivity dashboard. Prose is the visual priority in Write; Story may use restrained color to clarify groupings.

## Themes
Offer `system` (default), `light`, and `dark`. Theme is a user preference stored in OS app data, not book Markdown. All component tokens must render under both themes and RTL layouts. Never derive essential meaning from color alone.

### Colour tokens

These values are the authority (owner decision, 2026-10-26, Milestone 9: the "Lamplight" direction; they replace the teal palette of 2026-10-25, which is in git history). The colours come from the logo: ink, cream and gold. Every pair is checked by an automated WCAG contrast test: 4.5:1 for text on every surface (`app`, `card`, `page`, `well`), 3:1 for focus rings, marks and colour chips.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `app` | `#E8E4DC` | `#101114` | The desk: window background, and the sidebars, which sit on it with no border |
| `card` | `#FFFFFF` | `#222227` | Menus, panels, dialogs, outline cards |
| `page` | `#F8F6F1` | `#1A1A1E` | The writing page |
| `well` | `#E0DBD0` | `#2A2620` | Selected rows; the track of segmented controls |
| `text` | `#1D1E23` | `#E9E2D3` | Primary text |
| `textSecondary` | `#5C5B5E` | `#9C9483` | Secondary text, labels |
| `accent` | `#2C3E63` (ink blue) | `#E0B66E` (gold) | Links, selected states, primary buttons |
| `onAccent` | `#FFFFFF` | `#101114` | Text and icons on an accent background |
| `mark` | `#8C6A2C` | `#B88E45` | Gold marks: the thread beside the open chapter, `+` signs, bullets, scene breaks, the logo's line |
| `warning` | `#844E1E` | `#E0AB76` | Warnings (always with an icon or word, never colour alone) |
| `focus` | `#2E62B8` | `#9CBFF8` | Keyboard focus rings |
| `plotAmber` | `#9A6A26` | `#E3B77E` | Plot and card colour category |
| `plotPlum` | `#8C628C` | `#C4A0D2` | Plot and card colour category |
| `plotTerracotta` | `#A55D44` | `#E4A186` | Plot and card colour category |

Shades such as hover backgrounds, hairlines and the glow behind the page are mixed from these tokens in CSS (`color-mix`), never written as new colours.

### Typography

- **Prose and titles:** Literata. **Interface:** Instrument Sans. Hebrew falls back, letter by letter, to Noto Serif Hebrew and Assistant. One family per role, everywhere; components use `--font-prose` and `--font-ui`.
- All four are bundled with the app (the Content-Security-Policy allows only the app's own fonts) from the `@fontsource-variable` packages, under the SIL Open Font License 1.1 (the owner's licence review is pending). They appear in About's list of open-source components.
- Titles and section names are an italic serif; Hebrew has no true italic, so in Hebrew they stay upright.
- The writing page: a centred chapter heading, paragraphs separated by space rather than indented.

### Shape and chrome

- One top bar: the logo and the book's title (which opens the book menu), Story | Write, the save status, **Aa** (Write only) and the app menu (☰). No native menu bar on Linux and Windows.
- Controls that aren't needed all the time are in menus. Adding things (`+ New chapter`) is a quiet link, not a button. A row's `⋯` menu shows on hover or keyboard focus.
- Rounded corners (8–16 px), soft shadows rather than borders, and the logo's gold line as the one decorative motif.

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
