import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate
} from '@codemirror/view'

const autoDirection = Decoration.line({ attributes: { dir: 'auto' } })
const technicalDirection = Decoration.mark({ attributes: { dir: 'ltr' } })

/**
 * Gives every line `dir="auto"`, so a Hebrew line runs and aligns right-to-left while an English
 * line beside it stays left-to-right. `EditorView.perLineTextDirection` then moves the cursor by
 * each line's own direction. With `lettersOnly`, a line without letters (an empty one) is left to the
 * editor's base direction, so a new line in a Hebrew book starts right-to-left.
 */
export function autoLineDirection(lettersOnly = false): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = build(view, lettersOnly)
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = build(update.view, lettersOnly)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  )
}

/** Isolates inline Markdown code in LTR so technical paths do not reorder inside prose. */
export function technicalSpanDirection(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildTechnicalSpans(view)
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildTechnicalSpans(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  )
}

const LETTER = /\p{L}/u

function build(view: EditorView, lettersOnly: boolean): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  let lastLine = 0
  for (const { from, to } of view.visibleRanges) {
    for (let position = from; position <= to;) {
      const line = view.state.doc.lineAt(position)
      if (line.number > lastLine) {
        if (!lettersOnly || LETTER.test(line.text)) builder.add(line.from, line.from, autoDirection)
        lastLine = line.number
      }
      position = line.to + 1
    }
  }
  return builder.finish()
}

function buildTechnicalSpans(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const tree = syntaxTree(view.state)
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        if (node.name === 'InlineCode') builder.add(node.from, node.to, technicalDirection)
      }
    })
  }
  return builder.finish()
}
