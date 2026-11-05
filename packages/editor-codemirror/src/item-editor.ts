import { EditorSelection, EditorState, StateField, type Extension } from '@codemirror/state'
import { Decoration, Direction, EditorView, keymap, placeholder, type DecorationSet } from '@codemirror/view'
import { caretKeymap, renderedRules } from './caret'
import { hiddenIn } from './hidden'
import { linkHidden, linkQueryAt } from './item-text'
import { changeLink, linkAt, removeLink } from './links'
import { decorationsFor } from './live-preview'

/**
 * A card's or item's one line of text, edited in place. Links show as their words, edited like any
 * words (Milestone 16), and are added by choosing a page, never by typing Markdown: `@` or `[[` starts
 * a search the app shows beside the text (Milestone 11, owner feedback). The text stays ordinary
 * Markdown underneath.
 */
export interface ItemEditorOptions {
  text: string
  /** The field's accessible name. */
  label: string
  /** Placed on the editable element, so tests and assistive technology find it like a text field. */
  testId?: string
  /** Shown while the line is empty: what it is ("New detail of …"). */
  placeholder?: string
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
  /** Told where the link the cursor is in goes, and where it is on screen, for the link popup; `null` when not in one. */
  onLink?: (link: { target: string; x: number; y: number; rtl: boolean } | null) => void
}

export interface ItemEditor {
  text(): string
  /** Puts a link where the cursor is, or in place of the `@name` being typed. */
  insertLink(markdown: string): void
  /** Points the link the cursor is in somewhere else, keeping its words. */
  changeLink(target: string): void
  /** Removes the link the cursor is in, keeping its words. */
  removeLink(): void
  focus(): void
  destroy(): void
}

const itemHidden = (state: EditorState) => linkHidden(state.doc.toString())

function draw(state: EditorState) {
  const drawn = decorationsFor(hiddenIn(state, 0, state.doc.length), '')
  return {
    decorations: Decoration.set(drawn.all, true),
    atomic: Decoration.set(drawn.atomic, true),
    isolates: Decoration.set(drawn.links, true),
  }
}

/** Links drawn as their words; the cursor steps over the hidden marks, as in a chapter (ADR 0010). */
const links = StateField.define<{ decorations: DecorationSet; atomic: DecorationSet; isolates: DecorationSet }>({
  create: draw,
  update: (value, transaction) => (transaction.docChanged ? draw(transaction.state) : value),
  provide: (field) => [
    EditorView.decorations.from(field, (value) => value.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).atomic),
    EditorView.bidiIsolatedRanges.of((view) => view.state.field(field).isolates),
  ],
})

/**
 * The field's look. It lives in a shadow root, as the chapter editor does, so CodeMirror's styles are
 * constructed stylesheets and the page's Content Security Policy needs no exception (ADR 0004). The
 * app's colours and fonts reach it through CSS variables.
 */
const look = EditorView.theme({
  '&': { background: 'none', color: 'var(--color-text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--item-font, var(--font-prose)), serif', lineHeight: '1.45', overflow: 'visible' },
  '.cm-content': { padding: '0', fontSize: 'var(--item-font-size, 1.05rem)', caretColor: 'var(--color-text)' },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: 'var(--color-text-secondary)' },
  '.cm-link': {
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
    renderedRules({ source: itemHidden }),
    links,
    caretKeymap,
    ...(options.placeholder ? [placeholder(options.placeholder)] : []),
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
      if (!(update.docChanged || update.selectionSet || update.focusChanged)) return
      report(update.view)
      if (options.onLink) {
        const { main } = update.state.selection
        const link = update.view.hasFocus ? linkAt(update.state, main.from, main.to) : null
        const place = link ? update.view.coordsAtPos(link.wordsFrom, 1) : null
        const rtl = link ? update.view.textDirectionAt(link.wordsFrom) === Direction.RTL : false
        options.onLink(link && place ? { target: link.target, x: place.left, y: place.bottom, rtl } : null)
      }
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
    changeLink(target) {
      const { main } = view.state.selection
      const link = linkAt(view.state, main.from, main.to)
      if (link) view.dispatch(changeLink(view.state, link, target))
      view.focus()
    },
    removeLink() {
      const { main } = view.state.selection
      const link = linkAt(view.state, main.from, main.to)
      if (link) view.dispatch(removeLink(view.state, link))
      view.focus()
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  }
}
