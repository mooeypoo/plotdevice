import type { Direction } from '@plotdevice/domain'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorSelection, type StateCommand } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { chapterState } from './chapter-state'
import { formatCommands, insertLink, type FormatCommand } from './format'
import { foldedSection, type FoldedSection } from './folded-section'
import { livePreview } from './live-preview'
import { insertChosenLink, outlineText, type OutlineTextOptions } from './outline-text'
import { pasteText } from './paste'
import { setParagraphDirection, setPhraseDirection } from './paragraph-direction'
import { editorSettings, type EditorSettings } from './settings'

/** The page: prose type, theme colours (CSS variables inherit into the shadow root), comfortable measure. */
const pageTheme = EditorView.theme({
  '&': { color: 'var(--color-text)', backgroundColor: 'transparent', fontSize: 'var(--writing-font-size, 1.15rem)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "var(--font-prose, Georgia), 'Noto Serif Hebrew', serif", lineHeight: '1.75' },
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
  '.cm-scene-break': { display: 'inline-block', inlineSize: '100%', textAlign: 'center', color: 'var(--color-mark, currentColor)' },
  '.cm-bullet': { color: 'var(--color-text-secondary)' },
})

const prose = HighlightStyle.define([
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.link, color: 'var(--color-accent)', textDecoration: 'underline' },
  { tag: tags.heading, fontWeight: '650' },
])

export interface ChapterEditorOptions {
  text: string
  settings: EditorSettings
  /** Called after each change the author makes; read the text with `text()` when it's time to save. */
  onChange: () => void
  /** Turns the clipboard's HTML and plain text into the Markdown to insert (ADR 0004). */
  convertPaste: (html: string, plain: string) => string
  /** Told where selected text is on screen, so formatting can be offered beside it; `null` when nothing is selected. */
  onSelection?: (place: SelectionPlace | null) => void
  /** A section shown elsewhere, folded into one line (a page's relationships). */
  foldedSection?: FoldedSection
  /** An outline written as text (Milestone 14): Tab nests list lines, and `@` offers pages to link. */
  outline?: OutlineTextOptions
}

/**
 * Where selected text is, in viewport pixels: the middle of its first line (`x`), and that line's top
 * (`y`). `focused` says whether the editor has the keyboard.
 */
export interface SelectionPlace {
  x: number
  y: number
  focused: boolean
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
  /** Outline text: puts a chosen link in place of the `@name` being typed, or at the cursor. */
  pickLink(markdown: string): void
  setParagraphDirection(direction: Direction | null): void
  setPhraseDirection(direction: Direction | null): void
  cursor(): number
  /** Selects `from` to `to` (or puts the cursor at `from`) and scrolls it into view; undo history stays. */
  select(from: number, to?: number): void
  /** Where selected text is now (after the page around it scrolled, say), or `null`. */
  selectionPlace(): SelectionPlace | null
  focus(): void
  destroy(): void
}

/**
 * Room above the paragraph shown at the top of the page, in pixels. Reading the position back looks
 * the same distance down, so showing a paragraph and reading it back lands on the same paragraph.
 */
const TOP_MARGIN = 32

function selectionPlace(view: EditorView): SelectionPlace | null {
  const { main } = view.state.selection
  if (main.empty) return null
  const start = view.coordsAtPos(main.from, 1)
  const end = view.coordsAtPos(main.to, -1)
  if (!start || !end) return null
  // On one line, centre over the selection (whichever way the text runs); across lines, over its start.
  const oneLine = Math.abs(start.top - end.top) < 2
  const x = oneLine ? (Math.min(start.left, end.left) + Math.max(start.right, end.right)) / 2 : start.left
  return { x, y: Math.min(start.top, end.top), focused: view.hasFocus }
}

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
      if (options.onSelection && (update.selectionSet || update.focusChanged || update.geometryChanged || update.docChanged))
        options.onSelection(selectionPlace(update.view))
    }),
  ]
  if (options.foldedSection) viewExtensions.push(foldedSection(options.foldedSection))
  const { outline } = options
  const stateFor = (text: string) =>
    chapterState(text, settings, current, outline ? [viewExtensions, outlineText(outline, text)] : viewExtensions)
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
    pickLink: (markdown) => insertChosenLink(view, markdown),
    setParagraphDirection: (direction) => run(setParagraphDirection(direction)),
    setPhraseDirection: (direction) => run(setPhraseDirection(direction)),
    cursor: () => view.state.selection.main.head,
    select(from, to = from) {
      const length = view.state.doc.length
      view.dispatch({ selection: EditorSelection.range(Math.min(from, length), Math.min(to, length)), scrollIntoView: true })
      view.focus()
    },
    selectionPlace: () => selectionPlace(view),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  }
}
