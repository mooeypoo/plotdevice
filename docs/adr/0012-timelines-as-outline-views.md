# ADR 0012: Timelines as views of an outline

Status: **Accepted** (owner, 2026-11-04, roadmap decisions D7 and D8) · Built in Milestones 20 and 21

## In short

Authors want to see their story laid out in time, and each character's path through it. Plot Device already has the material: an outline's sections are steps of the story, and its cards are what happens in each.

So a timeline is **another way to look at an outline**, beside Board, List and Text. It has no file of its own, no new fields and no new syntax:

```markdown
## Spring, 1912
- Ilka finds the letter
- The auction is announced

## The night of the storm
- [Bea](../characters/bea.md) leaves Marrow
```

"Spring, 1912" and "The night of the storm" are two moments on the line; the cards are the events at each. With **lanes**, Bea's card shows in Bea's lane.

## Decision

1. **A timeline reads an outline with the existing mapping** (ADR 0003). Each `##` section is a **moment**, in file order, labelled by its heading. Each card is an **event** at that moment, with its details folded under it. Cards before the first section form a moment called "Before".
2. **No dates are parsed.** "Day 3", "Before the war" and invented calendars all work, because order comes from the file.
3. **Moving a card on the timeline is a Board move.** It produces exactly the same file change as moving the card to another column.
4. **Lanes come only from what the author wrote** (Milestone 21): a card is in a page's lane when it, or one of its details, links to that page. Tags choose which pages get lanes ("main cast"), reusing Milestone 12's tag filter. Nothing is guessed from names. *Open for the Milestone 21 plan:* the roadmap also mentions lanes per tag, but today only pages carry tags, not cards; whether a tag's lane collects the cards linked to its pages is decided there. A card linked to two pages shows in both, marked as shared; unlinked cards go in a folded lane.
5. **Time runs from the reading-start side** (D8): earlier moments on the right in a Hebrew interface, on the left in an English one. A working rule, validated with Hebrew testers before Milestone 20 ships.
6. **Views register themselves.** Timeline is added through an internal view registry (id, name, icon, the projection it needs, its component) instead of another branch in the Story view. Board, List and Text move onto it when they are next touched. There is no public plugin API.

## Rejected

| Option | Why not |
|---|---|
| A separate timeline file or data store | A second place to keep in step with the outline (PRD §9, OUT) |
| Dates on every moment, calendar spacing | Most stories don't have dates; may come later as an option, with its own ADR |
| Dates or events guessed from prose | Against the invariant that nothing is inferred |
| A hand-drawn timeline | Not readable or editable outside the app |

## Later, designed with the owner first

Each needs a design session before a plan: story order vs. book order (chapters joined to the moments they tell); several outlines on one timeline; optional real dates; a read-only relationship map drawn from ADR 0009 relationships.

## Engineering notes

- **Presentation** builds the timeline projection from the outline model; no new parsing or storage. Lanes reuse the link resolution behind "Linked from".
- **Fidelity test:** a shared fixture checks that a Timeline move and the equivalent Board move produce identical files.
- **Accessibility:** each lane is a labelled region; cards are reachable by keyboard in moment order; the Move menu is the keyboard equivalent of dragging.
- **Performance:** 300 cards in 40 lanes within the existing budget.

## Consequences

- PRD §9 moves timelines, as outline views, from OUT to IN. A timeline engine stays OUT.
- An author who needs a different structure makes another outline; the mapping stays fixed.
