import { EditorSelection, EditorState, StateField, type Extension } from '@codemirror/state'
import { Decoration, EditorView, keymap, WidgetType, type DecorationSet } from '@codemirror/view'
import { linkQueryAt, linkRanges } from './item-text'

/**
 * A card's or item's one line of text, edited in place. Links show as their names and are added by
 * choosing a page, never by typing Markdown: `@` or `[[` starts a search the app shows beside the
 * text (Milestone 11, owner feedback). The text stays ordinary Markdown underneath.
 */
export interface ItemEditorOptions {
  text: string
  /** The field's accessible name. */
  label: string
  /** Placed on the editable element, so tests and assistive technology find it like a text field. */
  testId?: string
  /** The name being typed after `@` or `[[`, and where on screen it is; `null` when none. */
  onLinkQuery: (query: { text: string; x: number; y: number } | null) => void
  /**
   * Keys while a list of pages is offered: the app moves through it or picks from it, and returns
   * `true` when it used the key, so the editor doesn't.
   */
  onListKey: (key: 'up' | 'down' | 'pick' | 'close') => boolean
  /** Enter (`byEnter`) or leaving the field keeps the text; Escape gives `null`. */
  onDone: (text: string | null, byEnter: boolean) => void
  /** Tab and Shift+Tab, when the line can move in or out a level. */
  onNest?: (direction: 'in' | 'out', text: string) => void
}

export interface ItemEditor {
  text(): string
  /** Puts a link where the cursor is, or in place of the `@name` being typed. */
  insertLink(markdown: string): void
  focus(): void
  destroy(): void
}

class LinkChip extends WidgetType {
  constructor(readonly label: string) {
    super()
  }
  override eq(other: LinkChip): boolean {
    return other.label === this.label
  }
  toDOM(): HTMLElement {
    const chip = document.createElement('span')
    chip.className = 'cm-link-chip'
    chip.textContent = this.label
    return chip
  }
}

const decorate = (state: EditorState): DecorationSet =>
  Decoration.set(
    linkRanges(state.doc.toString()).map((link) => Decoration.replace({ widget: new LinkChip(link.label) }).range(link.from, link.to)),
  )

/** Each link is one chip: the cursor steps over it, and Backspace removes it whole. */
const chips = StateField.define<DecorationSet>({
  create: decorate,
  update: (value, transaction) => (transaction.docChanged ? decorate(transaction.state) : value),
  provide: (field) => [EditorView.decorations.from(field), EditorView.atomicRanges.of((view) => view.state.field(field))],
})

/**
 * The field's look. It lives in a shadow root, as the chapter editor does, so CodeMirror's styles are
 * constructed stylesheets and the page's Content Security Policy needs no exception (ADR 0004). The
 * app's colours and fonts reach it through CSS variables.
 */
const look = EditorView.theme({
  '&': { background: 'none', color: 'var(--color-text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-prose), serif', lineHeight: '1.45', overflow: 'visible' },
  '.cm-content': { padding: '0', fontSize: '1.05rem', caretColor: 'var(--color-text)' },
  '.cm-line': { padding: '0' },
  '.cm-link-chip': {
    paddingInline: '0.15em',
    borderRadius: '4px',
    background: 'var(--color-well)',
    color: 'var(--color-accent)',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-mark)',
    textUnderlineOffset: '0.22em',
  },
})

/** One line: pasted or typed line breaks become spaces. */
const oneLine = EditorState.transactionFilter.of((transaction) => {
  if (!transaction.docChanged || !/\r?\n/.test(transaction.newDoc.toString())) return transaction
  const changes: { from: number; to: number; insert: string }[] = []
  transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) => {
    changes.push({ from, to, insert: inserted.toString().replace(/\r?\n/g, ' ') })
  })
  return [{ changes, selection: transaction.selection ?? transaction.startState.selection, scrollIntoView: true }]
})

export function createItemEditor(parent: HTMLElement, options: ItemEditorOptions): ItemEditor {
  let done = false
  const finish = (text: string | null, byEnter: boolean): void => {
    if (done) return
    done = true
    options.onDone(text, byEnter)
  }
  const query = (view: EditorView): { from: number; text: string } | null => {
    const { main } = view.state.selection
    return main.empty ? linkQueryAt(view.state.doc.toString(), main.head) : null
  }
  const report = (view: EditorView): void => {
    const found = view.hasFocus ? query(view) : null
    const place = found ? view.coordsAtPos(found.from) : null
    options.onLinkQuery(found && place ? { text: found.text, x: place.left, y: place.bottom } : null)
  }
  const list = (key: 'up' | 'down' | 'pick' | 'close') => (): boolean => options.onListKey(key)

  const extensions: Extension[] = [
    look,
    chips,
    oneLine,
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({
      dir: 'auto',
      'aria-label': options.label,
      'aria-multiline': 'false',
      role: 'textbox',
      ...(options.testId ? { 'data-testid': options.testId } : {}),
    }),
    keymap.of([
      { key: 'ArrowDown', run: list('down') },
      { key: 'ArrowUp', run: list('up') },
      {
        key: 'Enter',
        run: (view) => {
          if (options.onListKey('pick')) return true
          finish(view.state.doc.toString(), true)
          return true
        },
      },
      {
        key: 'Escape',
        run: () => {
          if (options.onListKey('close')) return true
          finish(null, false)
          return true
        },
      },
      {
        key: 'Tab',
        run: (view) => {
          if (options.onListKey('pick')) return true
          if (!options.onNest) return false
          options.onNest('in', view.state.doc.toString())
          return true
        },
        shift: (view) => {
          if (!options.onNest) return false
          options.onNest('out', view.state.doc.toString())
          return true
        },
      },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged || update.selectionSet || update.focusChanged) report(update.view)
    }),
    EditorView.domEventHandlers({
      // Leaving the field keeps the text, unless focus went to something of the field's own (the list, the link button).
      blur: (event) => {
        const next = event.relatedTarget as Node | null
        if (next && parent.parentElement?.contains(next)) return false
        if (document.querySelector('dialog[open]')) return false
        finish(view.state.doc.toString(), false)
        return false
      },
    }),
  ]
  const root = parent.shadowRoot ?? parent.attachShadow({ mode: 'open' })
  const view = new EditorView({
    parent: root,
    root,
    state: EditorState.create({ doc: options.text, extensions, selection: EditorSelection.cursor(options.text.length) }),
  })

  return {
    text: () => view.state.doc.toString(),
    insertLink(markdown) {
      const found = query(view)
      const { main } = view.state.selection
      const from = found?.from ?? main.from
      const to = found ? main.head : main.to
      // A space after the link, so typing carries on as a new word.
      const insert = `${markdown} `
      view.dispatch({ changes: { from, to, insert }, selection: EditorSelection.cursor(from + insert.length) })
      view.focus()
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  }
}
