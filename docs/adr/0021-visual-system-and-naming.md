# ADR 0021: One visual system and one name per concept

**Status:** proposed (2026-10-23), not yet approved. From roadmap U1; details in
`docs/plans/u1/redesign.md` and `docs/plans/u1/glossary.md`, evidence in
`docs/plans/u1/audit.md`.

## Context

The U1 audit found the interface drifting:
- **Sizes and shapes:** 21 font sizes and 8 corner radii, in px, rem and em mixed.
- **Native controls:** 20 unstyled or inconsistently styled (14 selects, 4 checkboxes, 2 ranges).
- **Names:** one panel called two things (Binder and Manuscript, Inspector and Properties), one
  word meaning three things ("Write"), and internal words on screen ("area", "Show stacked").

The writer asked for an interface that is "beautifully simple, with advanced features easy to
reach but never cluttering", and for every element to be styled (U2).

## Decision

- **Names.** The glossary is the source of truth for every user-facing name, in English and
  Hebrew. Message catalogs follow it, and a concept has exactly one name on screen. Code keeps
  its internal names; they never reach the screen.
- **Tokens.** `global.css` defines the only allowed values:
  - type sizes: caption 11, small 12, body 13, title 15, heading 22, display 32, plus the
    writer's prose size;
  - spacing steps: 2–48;
  - three radii: 6, 10, pill;
  - surfaces, text, lines and one accent, for dark and light themes.

  Components use tokens, never literal sizes or colours.
- **Shared controls.** Select, Checkbox, Switch, Range, Button, TextField and Menu live once in
  `renderer/src/shared/`. Features never use a native `<select>` or checkbox directly, and a
  test enforces it.
- **Tiers.**
  - **Always visible:** what's needed every minute.
  - **One step away:** one labelled control, the ⋯ menu, or Go to… (Ctrl+K).
  - **Advanced:** inside menus.

  A new feature states its tier, and nothing joins the always-visible tier without the writer's
  approval.
- **RTL and accessibility** (ADR 0016) apply to every shared control:
  - logical properties;
  - mirrored directional icons;
  - keyboard operation;
  - a visible focus ring;
  - reduced motion respected.

## Consequences

- Each existing component is migrated to tokens and shared controls in U2a and U2b. Until then,
  new code uses tokens where they exist.
- A light theme becomes possible, because colours come from tokens.
- Renaming is a catalog change (U3a) with a translator review. The glossary moves into the
  translator guide.
