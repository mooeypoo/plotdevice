import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate
} from '@codemirror/view'
import { findWikiLinks, type LinkKind } from './wiki-link-scan'

const hidden = Decoration.replace({})

/**
 * Styles `[[links]]` by the type of file they point to. On lines without the cursor the brackets
 * (and a target with shown text) are hidden, so prose reads cleanly; the file keeps every character.
 * Callers provide localized tooltips, while each target receives its own automatic text direction.
 */
export function wikiLinkDecorations(
  kindOf: (target: string) => LinkKind,
  tooltip: (target: string, embed: boolean) => string
): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = build(view, kindOf, tooltip)
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet ||
          update.focusChanged
        ) {
          this.decorations = build(update.view, kindOf, tooltip)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  )
}

function build(
  view: EditorView,
  kindOf: (target: string) => LinkKind,
  tooltip: (target: string, embed: boolean) => string
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { state } = view
  const cursorLines = new Set(
    state.selection.ranges.flatMap((range) => {
      const first = state.doc.lineAt(range.from).number
      const last = state.doc.lineAt(range.to).number
      return Array.from({ length: last - first + 1 }, (_, index) => first + index)
    })
  )
  const tree = syntaxTree(state)

  for (const { from, to } of view.visibleRanges) {
    for (const link of findWikiLinks(state.doc.sliceString(from, to), from)) {
      const node = tree.resolveInner(link.from, 1)
      if (/Code/u.test(node.name) || /Code/u.test(node.parent?.name ?? '')) continue

      const editing = view.hasFocus && cursorLines.has(state.doc.lineAt(link.from).number)
      const kind = kindOf(link.target)
      const mark = Decoration.mark({
        class: `cm-wikilink cm-wikilink-${kind}${link.embed ? ' cm-wikilink-embed' : ''}`,
        attributes: { dir: 'auto', title: tooltip(link.target, link.embed) }
      })

      if (editing) {
        builder.add(link.from, link.to, mark)
      } else {
        builder.add(link.from, link.labelFrom, hidden)
        builder.add(link.labelFrom, link.labelTo, mark)
        builder.add(link.labelTo, link.to, hidden)
      }
    }
  }
  return builder.finish()
}
