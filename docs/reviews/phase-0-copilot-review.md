# Phase 0 Architecture Proposal — Independent Review

## Overall assessment

The proposal is fundamentally sound and preserves the product's core architecture: a clean-room, local-first application with Markdown as author-owned content, manifest-defined manuscript order, independent outline projections, strict layer boundaries, and explicit persistence safeguards. No blocking contradiction was found. A few points should be tightened before they become implementation assumptions.

## What the proposal gets right

- Keeps domain and application logic independent of Electron, Vue, Node, and Markdown parsing, with automated boundary enforcement.
- Treats Markdown as authoritative and proposes source-preserving edits, byte-identical no-op saves, revision checks, atomic writes, and non-destructive handling of parse failures.
- Preserves the chapter-first manuscript and independent-outline models; does not turn outline cards or scene breaks into manuscript entities.
- Makes editor selection and file persistence evidence-based spikes, and includes EN/HE, mixed-direction, accessibility, and cross-platform cases.
- Keeps the UI focused on writer workflows rather than exposing storage or domain structures.

## Blocking findings

None.

## Important non-blocking findings

1. **Legacy decisions are incorrectly framed as a blocker** — Proposal §§1, 10.1–10.3; [AGENTS.md](../AGENTS.md), “Mission and priority” and “Clean-room migration rule.” The current instructions already say the new specifications take precedence over legacy material and that conflicts must be recorded rather than resolved by copying old behavior. Reopening whether the new specs replace old decisions can delay the spikes without resolving a real ambiguity. **Smallest correction:** mark Q1 resolved by the current authority hierarchy; record any specific remaining conflict, if one exists, rather than blocking work generally. **Decision timing:** now, as a planning correction.

2. **The proposed prose-direction default may not satisfy mixed RTL/LTR writing** — Proposal §8.1 and Q5; [PRD.md](../PRD.md) §7, [UX_SPEC.md](../UX_SPEC.md) “RTL specification,” and [AGENTS.md](../AGENTS.md) “Product invariants.” Using project language as the paragraph base and omitting per-block overrides can mishandle paragraphs such as `Daniel אמר: "שלום".` The proposal recognizes this risk, but its recommendation could prematurely rule out the behavior the specifications call for. **Smallest correction:** make Spike B test and report paragraph/block direction behavior, including the cited case and keyboard selection; leave the storage representation open until that evidence exists. **Decision timing:** before choosing the editor or implementing the writing experience; it need not block other spikes.

3. **Autosave concurrency is identified but not made an acceptance requirement** — Proposal §5.2 and §10.4; [PRD.md](../PRD.md) §§3–4 and scenario G. Revision-checked saves protect against external edits, but overlapping autosaves from the app itself can also race: a later save may use a stale revision, surface a false conflict, or fail to persist the latest editor state. **Smallest correction:** before the Write milestone, specify per-file save serialization or coalescing and test overlapping saves alongside an external-edit conflict. **Decision timing:** defer implementation details until the Write slice, but add the invariant to its acceptance criteria.

4. **“Protected raw text” for unsupported chapter Markdown needs a writer-UX check** — Proposal §10.3 Q3 and Spike B; [PRD.md](../PRD.md) §§1, 6, and 11. Preserving unfamiliar constructs is safer than silently rewriting them, but exposing their raw syntax as the proposed fallback could make ordinary Markdown content awkward or inaccessible to nontechnical authors. The format subset is explicitly open, so this is not a contradiction yet. **Smallest correction:** treat the narrow subset and raw-text presentation as hypotheses for the editor spike; evaluate common existing Markdown and show how unsupported content is preserved and safely edited or left untouched. **Decision timing:** before finalizing editor scope, not before starting the spike.

## Optional suggestions

- The contrast audit and token-source mismatch noted in proposal §8.2 are practical to resolve during UI implementation. Keep the palette provisional and validate actual text, controls, focus, and component boundaries in both themes rather than treating token-only results as certification.

## Decisions to resolve now vs. later

**Resolve now / before the relevant spike:** define the supported-formatting question sufficiently for Spike B to compare editors; include the mixed-direction behavior above in that spike; remove Q1 as a general blocker under the current specification hierarchy. Approve dependencies when they are about to be added, consistent with the instruction to obtain approval before adding dependencies.

**Resolve before the relevant implementation slice, not before Phase 0:** autosave concurrency behavior before the Write slice; manifest ID-to-path mapping and missing/unlisted-file handling before the storage vertical slice; part representation before manuscript ordering is implemented.

**Safely defer:** Story's final label, final palette, contents-list presentation, outline item ID/link encoding until the outline spike, and richer compilation decisions.

## Recommended next step

**Approve with targeted changes.** Update the proposal's decision gates as above, then proceed with the throwaway spikes. No architecture redesign or additional pre-implementation gate is warranted.
