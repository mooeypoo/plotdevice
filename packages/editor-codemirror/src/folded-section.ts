import type { RangeSet } from '@codemirror/state'
import { StateEffect, StateField, type EditorState, type Extension, type Text } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'

/**
 * A section folded into one quiet line, because the app shows it elsewhere: a page's relationships
 * (ADR 0009), listed beside the page. Clicking the line unfolds it for editing by hand.
 */
export interface FoldedSection {
  /** The heading's names, in every language the app speaks; any level, any case, a trailing colon allowed. */
  headings: readonly string[]
  /** What the folded line says, in the interface language. */
  label: () => string
}

const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t#]*$/
const FENCE = /^ {0,3}(```|~~~)/
const nameKey = (name: string): string =>
  name
    .normalize('NFC')
    .trim()
    .replace(/[:：]$/, '')
    .trim()
    .toLocaleLowerCase()

/** The section's text, from its heading line to its last non-blank line, or `null` when there is none. */
export function findSection(doc: Text, headings: readonly string[]): { from: number; to: number } | null {
  const names = new Set(headings.map(nameKey))
  let fenced = false
  let start: { from: number; level: number } | null = null
  let lastText = 0
  for (let number = 1; number <= doc.lines; number++) {
    const line = doc.line(number)
    if (FENCE.test(line.text)) fenced = !fenced
    const heading = fenced ? null : HEADING.exec(line.text)
    if (heading) {
      const level = heading[1]?.length ?? 1
      if (start && level <= start.level) return { from: start.from, to: lastText }
      if (!start && names.has(nameKey(heading[2] ?? ''))) start = { from: line.from, level }
    }
    if (line.text.trim() !== '') lastText = line.to
  }
  return start ? { from: start.from, to: Math.max(lastText, start.from) } : null
}

class FoldLine extends WidgetType {
  constructor(private readonly label: string) {
    super()
  }
  override eq(other: FoldLine): boolean {
    return other.label === this.label
  }
  toDOM(view: EditorView): HTMLElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'cm-folded-section'
    button.textContent = this.label
    button.addEventListener('click', () => view.dispatch({ effects: unfold.of(null) }))
    return button
  }
  override ignoreEvent(): boolean {
    return false
  }
}

const unfold = StateEffect.define<null>()

export function foldedSection(options: FoldedSection): Extension {
  const decorate = (state: EditorState): DecorationSet => {
    const section = findSection(state.doc, options.headings)
    if (!section) return Decoration.none
    return Decoration.set(Decoration.replace({ widget: new FoldLine(options.label()), block: true }).range(section.from, section.to))
  }
  // Once unfolded, it stays open until the page is loaded again.
  const field = StateField.define<{ open: boolean; decorations: DecorationSet }>({
    create: (state) => ({ open: false, decorations: decorate(state) }),
    update(value, transaction) {
      const open = value.open || transaction.effects.some((effect) => effect.is(unfold))
      if (open) return { open, decorations: Decoration.none }
      return { open, decorations: transaction.docChanged ? decorate(transaction.state) : value.decorations }
    },
    provide: (f) => [
      EditorView.decorations.from(f, (value) => value.decorations),
      // The cursor steps over the folded line instead of into hidden text.
      EditorView.atomicRanges.of((view) => view.state.field(f).decorations as RangeSet<Decoration>),
    ],
  })
  return [
    field,
    EditorView.baseTheme({
      '.cm-folded-section': {
        display: 'block',
        width: '100%',
        margin: '0.4em 0',
        padding: '0.35em 0.75em',
        border: '1px dashed var(--hair-strong, #c9c1b0)',
        borderRadius: '8px',
        background: 'none',
        color: 'var(--color-text-secondary, #5c5b5e)',
        font: '0.85rem var(--font-ui, sans-serif)',
        textAlign: 'start',
        cursor: 'pointer',
      },
    }),
  ]
}
