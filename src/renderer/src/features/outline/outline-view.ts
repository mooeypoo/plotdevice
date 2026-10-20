import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Compartment, EditorState, RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import type { LinkTargetDto } from '../../../../contract/dtos'
import { linkAt, type LinkAt } from '../editor/link-at'
import { autoLineDirection } from '../editor/line-direction'
import { proseAppearance } from '../editor/prose-theme'
import { wikiLinkDecorations } from '../editor/wiki-link-decorations'
import { createLinkKindLookup } from '../editor/wiki-link-scan'
import { linesLinkingHere } from './outline-highlight'

/** A read-only view of an outline, beside the draft. */
export interface OutlineView {
  setText(text: string): void
  setLinkTargets(targets: readonly LinkTargetDto[]): void
  /** Highlights the lines linking to the open entry and scrolls the first into view. */
  highlight(pointsHere: (link: LinkAt) => boolean): void
  destroy(): void
}

const currentLine = Decoration.line({ class: 'cm-outline-current' })

/** Mounts a read-only prose view; a click on a link calls `onOpenLink`. */
export function createOutlineView(
  parent: HTMLElement,
  options: {
    readonly text: string
    readonly linkTargets: readonly LinkTargetDto[]
    readonly onOpenLink: (link: LinkAt) => void
  }
): OutlineView {
  const links = new Compartment()
  const highlights = new Compartment()

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.text,
      extensions: [
        markdown({ base: markdownLanguage }),
        proseAppearance(),
        EditorView.lineWrapping,
        EditorView.perLineTextDirection.of(true),
        autoLineDirection(),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({ 'aria-label': 'Outline', 'aria-readonly': 'true' }),
        links.of(wikiLinkDecorations(createLinkKindLookup(options.linkTargets))),
        highlights.of([]),
        EditorView.theme({
          '.cm-outline-current': {
            background: 'var(--accent-soft)',
            borderRadius: '4px'
          }
        }),
        EditorView.domEventHandlers({
          click(event, target) {
            const position = target.posAtCoords({ x: event.clientX, y: event.clientY })
            if (position === null) return false
            const line = target.state.doc.lineAt(position)
            const link = linkAt(line.text, line.from, position)
            if (link === undefined) return false
            options.onOpenLink(link)
            return true
          }
        })
      ]
    })
  })

  let pointsHere: ((link: LinkAt) => boolean) | undefined

  const applyHighlight = (): void => {
    const doc = view.state.doc
    const lines = pointsHere === undefined ? [] : linesLinkingHere(doc.toString(), pointsHere)
    const builder = new RangeSetBuilder<Decoration>()
    for (const number of lines) {
      if (number <= doc.lines)
        builder.add(doc.line(number).from, doc.line(number).from, currentLine)
    }
    const first = lines[0]
    view.dispatch({
      effects: [
        highlights.reconfigure(EditorView.decorations.of(builder.finish())),
        ...(first !== undefined && first <= doc.lines
          ? [EditorView.scrollIntoView(doc.line(first).from, { y: 'center' })]
          : [])
      ]
    })
  }

  return {
    setText(text) {
      if (text === view.state.doc.toString()) return
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
      applyHighlight()
    },
    setLinkTargets(targets) {
      view.dispatch({
        effects: links.reconfigure(wikiLinkDecorations(createLinkKindLookup(targets)))
      })
    },
    highlight(next) {
      pointsHere = next
      applyHighlight()
    },
    destroy() {
      view.destroy()
    }
  }
}
