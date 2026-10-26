import type { Direction } from '@plotdevice/domain'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorSelection, type StateCommand } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { chapterState } from './chapter-state'
import { formatCommands, insertLink, type FormatCommand } from './format'
import { livePreview } from './live-preview'
import { pasteText } from './paste'
import { setParagraphDirection, setPhraseDirection } from './paragraph-direction'
import { editorSettings, type EditorSettings } from './settings'

/** The page: prose type, theme colours (CSS variables inherit into the shadow root), comfortable measure. */
const pageTheme = EditorView.theme({
  '&': { color: 'var(--color-text)', backgroundColor: 'transparent', fontSize: 'var(--writing-font-size, 1.15rem)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "Georgia, 'Noto Serif Hebrew', 'Frank Ruehl CLM', serif", lineHeight: '1.75' },
  '.cm-content': { caretColor: 'var(--color-text)', paddingBlock: '2rem' },
  '.cm-cursor': { borderInlineStartColor: 'var(--color-text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
  },
  '.cm-heading': { fontWeight: '650' },
  '.cm-h1': { fontSize: '1.6em' },
  '.cm-h2': { fontSize: '1.35em' },
  '.cm-h3': { fontSize: '1.15em' },
  '.cm-quote': { color: 'var(--color-text-secondary)', fontStyle: 'italic' },
  '.cm-kept': { fontFamily: 'ui-monospace, monospace', fontSize: '0.85em', color: 'var(--color-text-secondary)' },
  '.cm-scene-break': { display: 'inline-block', inlineSize: '100%', textAlign: 'center', color: 'var(--color-text-secondary)' },
  '.cm-bullet': { color: 'var(--color-text-secondary)' },
})

const prose = HighlightStyle.define([
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: tags.heading, fontWeight: '650' },
])

export interface ChapterEditorOptions {
  text: string
  settings: EditorSettings
  /** Called after each change the author makes; read the text with `text()` when it's time to save. */
  onChange: () => void
  /** Turns the clipboard's HTML and plain text into the Markdown to insert (ADR 0004). */
  convertPaste: (html: string, plain: string) => string
}

/** The chapter editor as the interface uses it. The text in and out is the chapter's Markdown body, byte for byte. */
export interface ChapterEditor {
  text(): string
  /**
   * Replaces the whole text (another chapter, or a reload). Undo history starts over. With `top`, the
   * paragraph starting there is shown at the top of the page; otherwise the cursor is scrolled into view.
   */
  load(text: string, cursor?: number, top?: number): void
  /** The start of the paragraph at the top of the page, or `null` while the editor isn't on screen. */
  top(): number | null
  /** Applies new settings in place: the editor, cursor and undo history stay. */
  updateSettings(settings: EditorSettings): void
  format(command: FormatCommand): void
  insertLink(url: string): void
  setParagraphDirection(direction: Direction | null): void
  setPhraseDirection(direction: Direction | null): void
  cursor(): number
  focus(): void
  destroy(): void
}

/**
 * Room above the paragraph shown at the top of the page, in pixels. Reading the position back looks
 * the same distance down, so showing a paragraph and reading it back lands on the same paragraph.
 */
const TOP_MARGIN = 32

const scrollToTop = (view: EditorView, top: number) =>
  EditorView.scrollIntoView(view.state.doc.lineAt(Math.min(top, view.state.doc.length)).from, { y: 'start', yMargin: TOP_MARGIN })

/** Where the visible page starts on screen: the editor scrolls inside a container of the page, not by itself. */
function visibleTop(view: EditorView): number {
  const top = view.scrollDOM.getBoundingClientRect().top
  for (let element = view.root instanceof ShadowRoot ? view.root.host : view.dom.parentElement; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element)
    if (overflowY === 'auto' || overflowY === 'scroll') return Math.max(top, element.getBoundingClientRect().top)
  }
  return Math.max(top, 0)
}

/**
 * CodeMirror edits the Markdown text itself, so saving returns exactly what is in the editor. It lives
 * in a shadow root, where its styles are constructed stylesheets rather than `<style>` tags, so the
 * page's strict Content Security Policy needs no exception (ADR 0004).
 */
export function createChapterEditor(parent: HTMLElement, options: ChapterEditorOptions): ChapterEditor {
  const root = parent.shadowRoot ?? parent.attachShadow({ mode: 'open' })
  const settings = new Compartment()
  let current = options.settings
  const contentAttributes = new Compartment()
  const attributesFor = (s: EditorSettings) =>
    EditorView.contentAttributes.of({
      dir: s.projectDirection,
      lang: s.language,
      spellcheck: 'true',
      'aria-label': s.labels.chapterText,
      'aria-multiline': 'true',
    })

  const viewExtensions = [
    EditorView.lineWrapping,
    syntaxHighlighting(prose),
    livePreview,
    pageTheme,
    contentAttributes.of(attributesFor(current)),
    EditorView.domEventHandlers({
      paste(event, view) {
        const data = event.clipboardData
        if (!data) return false
        const text = options.convertPaste(data.getData('text/html'), data.getData('text/plain'))
        event.preventDefault()
        if (text) pasteText(text)(view)
        return true
      },
    }),
    // `load` replaces the state without an update, so every change seen here is the author's.
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange()
    }),
  ]
  const stateFor = (text: string) => chapterState(text, settings, current, viewExtensions)
  const view = new EditorView({ parent: root, root, state: stateFor(options.text) })

  const run = (command: StateCommand): void => {
    command(view)
    view.focus()
  }

  return {
    // `sliceDoc` joins lines with the file's own line ending; `doc.toString()` would always use `\n`.
    text: () => view.state.sliceDoc(),
    load(text, cursor = 0, top) {
      view.setState(stateFor(text))
      const selection = EditorSelection.cursor(Math.min(cursor, view.state.doc.length))
      view.dispatch(top === undefined ? { selection, scrollIntoView: true } : { selection, effects: scrollToTop(view, top) })
    },
    top() {
      if (!view.dom.getClientRects().length) return null
      return view.lineBlockAtHeight(Math.max(0, visibleTop(view) + TOP_MARGIN - view.documentTop)).from
    },
    updateSettings(next) {
      current = next
      view.dispatch({ effects: [settings.reconfigure(editorSettings.of(next)), contentAttributes.reconfigure(attributesFor(next))] })
    },
    format: (command) => run(formatCommands[command]),
    insertLink: (url) => run(insertLink(url)),
    setParagraphDirection: (direction) => run(setParagraphDirection(direction)),
    setPhraseDirection: (direction) => run(setPhraseDirection(direction)),
    cursor: () => view.state.selection.main.head,
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  }
}
