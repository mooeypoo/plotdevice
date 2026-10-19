import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate
} from '@codemirror/view'

const autoDirection = Decoration.line({ attributes: { dir: 'auto' } })

/**
 * Gives every line `dir="auto"`, so a Hebrew line runs and aligns right-to-left while an English
 * line beside it stays left-to-right. `EditorView.perLineTextDirection` then moves the cursor by
 * each line's own direction.
 */
export function autoLineDirection(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = build(view)
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) this.decorations = build(update.view)
      }
    },
    { decorations: (plugin) => plugin.decorations }
  )
}

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  let lastLine = 0
  for (const { from, to } of view.visibleRanges) {
    for (let position = from; position <= to;) {
      const line = view.state.doc.lineAt(position)
      if (line.number > lastLine) {
        builder.add(line.from, line.from, autoDirection)
        lastLine = line.number
      }
      position = line.to + 1
    }
  }
  return builder.finish()
}
