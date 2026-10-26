import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, type Range } from '@codemirror/state'
import { Decoration, ViewPlugin, WidgetType, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view'
import { editorSettings } from './settings'

/**
 * Live preview: Markdown markup is hidden except on lines with the cursor, so the author sees formatted
 * prose while the file stays plain Markdown. Nothing here changes the text.
 */
const hide = Decoration.replace({})

class SymbolWidget extends WidgetType {
  constructor(
    readonly symbol: string,
    readonly className: string,
    readonly label: string,
  ) {
    super()
  }
  override eq(other: SymbolWidget): boolean {
    return other.symbol === this.symbol && other.className === this.className && other.label === this.label
  }
  toDOM(): HTMLElement {
    const element = document.createElement('span')
    element.className = this.className
    element.textContent = this.symbol
    element.setAttribute('role', 'img')
    element.setAttribute('aria-label', this.label)
    return element
  }
}

const bullet = Decoration.replace({ widget: new SymbolWidget('•', 'cm-bullet', '') })
/** Shown as written, never hidden: Markdown the editor doesn't format (ADR 0004, unsupported Markdown). */
const KEPT = new Set(['HTMLBlock', 'HTMLTag', 'Comment', 'CommentBlock', 'Table', 'FencedCode', 'CodeBlock', 'Image', 'LinkReference'])

function build(view: EditorView): DecorationSet {
  const { state } = view
  const sceneBreak = Decoration.replace({ widget: new SymbolWidget('⁂', 'cm-scene-break', state.facet(editorSettings).labels.sceneBreak) })
  const activeLines = new Set(state.selection.ranges.flatMap((r) => [state.doc.lineAt(r.from).number, state.doc.lineAt(r.to).number]))
  const marks: Range<Decoration>[] = []
  const lineClasses = new Map<number, Set<string>>()
  const addLineClass = (pos: number, className: string): void => {
    const line = state.doc.lineAt(pos)
    lineClasses.set(line.from, (lineClasses.get(line.from) ?? new Set()).add(className))
  }

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const active = activeLines.has(state.doc.lineAt(node.from).number)
        const name = node.name
        if (/^ATXHeading\d$/.test(name)) addLineClass(node.from, `cm-heading cm-${name.slice(3).toLowerCase()}`)
        if (name === 'Blockquote') {
          for (let pos = node.from; pos <= node.to; pos = state.doc.lineAt(pos).to + 1) addLineClass(pos, 'cm-quote')
        }
        if (KEPT.has(name)) {
          for (let pos = node.from; pos <= node.to; pos = state.doc.lineAt(pos).to + 1) addLineClass(pos, 'cm-kept')
          return false
        }
        if (active) return
        if (name === 'EmphasisMark' || name === 'LinkMark' || name === 'URL' || name === 'LinkTitle') {
          if (name === 'URL' && node.node.parent?.name !== 'Link') return
          marks.push(hide.range(node.from, node.to))
        } else if (name === 'HeaderMark' || name === 'QuoteMark') {
          const next = state.doc.sliceString(node.to, node.to + 1)
          marks.push(hide.range(node.from, next === ' ' ? node.to + 1 : node.to))
        } else if (name === 'HardBreak' && state.doc.sliceString(node.from, node.from + 1) === '\\') {
          marks.push(hide.range(node.from, node.from + 1))
        } else if (name === 'HorizontalRule') {
          marks.push(sceneBreak.range(node.from, node.to))
        } else if (name === 'ListMark' && /^[-+*]$/.test(state.doc.sliceString(node.from, node.to))) {
          marks.push(bullet.range(node.from, node.to))
        }
      },
    })
  }

  const builder = new RangeSetBuilder<Decoration>()
  const all = [...marks, ...[...lineClasses].map(([pos, classes]) => Decoration.line({ class: [...classes].join(' ') }).range(pos))]
  for (const range of all.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide))
    builder.add(range.from, range.to, range.value)
  return builder.finish()
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = build(view)
    }
    update(update: ViewUpdate): void {
      const settingsChanged = update.startState.facet(editorSettings) !== update.state.facet(editorSettings)
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        settingsChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
)
