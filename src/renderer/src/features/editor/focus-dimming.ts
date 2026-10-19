import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'

const dimmed = Decoration.line({ class: 'cm-dimmed' })

/** The line numbers of the paragraph holding the cursor: the run of non-blank lines around it. */
export function currentParagraph(state: EditorState): {
  readonly first: number
  readonly last: number
} {
  const { doc } = state
  const cursorLine = doc.lineAt(state.selection.main.head).number
  const blank = (number: number): boolean => doc.line(number).text.trim() === ''
  let first = cursorLine
  let last = cursorLine
  if (!blank(cursorLine)) {
    while (first > 1 && !blank(first - 1)) first -= 1
    while (last < doc.lines && !blank(last + 1)) last += 1
  }
  return { first, last }
}

/** Focus mode: every paragraph except the one being written fades back. */
export function focusDimming(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = build(view)
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = build(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  )
}

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { first, last } = currentParagraph(view.state)
  for (const { from, to } of view.visibleRanges) {
    for (let position = from; position <= to;) {
      const line = view.state.doc.lineAt(position)
      if (line.number < first || line.number > last) builder.add(line.from, line.from, dimmed)
      position = line.to + 1
    }
  }
  return builder.finish()
}
