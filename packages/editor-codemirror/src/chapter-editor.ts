import type { Direction } from '@plotdevice/domain'
import { Compartment, EditorSelection, type Extension, type StateCommand } from '@codemirror/state'
import { Direction as TextDirection, EditorView, placeholder } from '@codemirror/view'
import { chapterState } from './chapter-state'
import { formatCommands, insertLink, type FormatCommand } from './format'
import type { FoldedSection } from './folded-section'
import { changeLink, linkAt, removeLink } from './links'
import { insertChosenLink, linkSuggestions, outlineText, type LinkSuggestionOptions, type OutlineTextOptions } from './outline-text'
import { letterBefore, moveToLetter, toggleNiqqud } from './niqqud'
import { pasteText } from './paste'
import { poemFromPlainText } from './poem'
import { setParagraphDirection, setPhraseDirection } from './paragraph-direction'
import { rendered } from './rendered'
import { editorSettings, type EditorSettings } from './settings'

/** Rendered shows what the text means; plain text shows every mark, saved exactly as typed (ADR 0010). */
export type EditorMode = 'rendered' | 'plain'

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
  '.cm-list-mark': { color: 'var(--color-text-secondary)', paddingInlineEnd: '0.5em' },
  // A poem: a line too long for the page carries on indented, so the reader sees where it really ends (ADR 0013).
  '&.cm-poem .cm-line': { paddingInlineStart: '2em', textIndent: '-2em' },
  '.cm-link': {
    color: 'var(--color-accent)',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-mark, currentColor)',
    textUnderlineOffset: '0.22em',
  },
})

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
  /** `@` or `[[` offers pages to link, without the outline's keys (a page, Milestone 16). */
  links?: LinkSuggestionOptions
  /** Rendered (the default) or plain text. */
  mode?: EditorMode
  /** Told where the link the cursor is in goes, and where it is on screen, for the link popup; `null` when not in one. */
  onLink?: (link: LinkReport | null) => void
}

/** The link the cursor is in: where it goes, and where its words start on screen. */
export interface LinkReport {
  target: string
  x: number
  y: number
  focused: boolean
  /** The link's words run right to left, so `x` is their right edge and the popup grows leftwards. */
  rtl: boolean
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

/** The Hebrew letter before the cursor, for the niqqud picker: the letter, its marks, and where it is on screen. */
export interface NiqqudReport {
  letter: string
  marks: string[]
  x: number
  y: number
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
  /** Points the link the cursor is in somewhere else, keeping its words. */
  changeLink(target: string): void
  /** Removes the link the cursor is in, keeping its words. */
  removeLink(): void
  /** Switches between rendered and plain text in place: the text, cursor, selection and undo history stay. */
  setMode(mode: EditorMode): void
  mode(): EditorMode
  /** Outline text and pages: puts a chosen link in place of the `@name` being typed, or at the cursor. */
  pickLink(markdown: string): void
  setParagraphDirection(direction: Direction | null): void
  setPhraseDirection(direction: Direction | null): void
  cursor(): number
  /** Selects `from` to `to` (or puts the cursor at `from`) and scrolls it into view; undo history stays. */
  select(from: number, to?: number): void
  /** Where selected text is now (after the page around it scrolled, say), or `null`. */
  selectionPlace(): SelectionPlace | null
  /** The Hebrew letter before the cursor and its niqqud, or `null` (ADR 0013). */
  niqqud(): NiqqudReport | null
  /** Adds the mark to that letter, replacing another of its kind, or removes it if it's there. */
  toggleNiqqud(mark: string): void
  /** Moves to the next or previous Hebrew letter on the line, for pointing a word letter by letter. */
  moveToLetter(forward: boolean): void
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

function linkReport(view: EditorView): LinkReport | null {
  const { main } = view.state.selection
  const link = linkAt(view.state, main.from, main.to)
  const place = link ? view.coordsAtPos(link.wordsFrom, 1) : null
  const rtl = link ? view.textDirectionAt(link.wordsFrom) === TextDirection.RTL : false
  return link && place ? { target: link.target, x: place.left, y: place.bottom, focused: view.hasFocus, rtl } : null
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

  const mode = new Compartment()
  let currentMode: EditorMode = options.mode ?? 'rendered'
  const { outline } = options
  const modeExtensions = (m: EditorMode): Extension =>
    m === 'rendered'
      ? rendered({
          ...(outline ? { nestingUnit: outline.nestingUnit } : {}),
          ...(options.foldedSection ? { foldedSection: options.foldedSection } : {}),
        })
      : []

  const viewExtensions = [
    EditorView.lineWrapping,
    pageTheme,
    // An empty page says where to start, in the interface's language.
    placeholder((view) => {
      const hint = document.createElement('span')
      hint.textContent = view.state.facet(editorSettings).labels.startWriting ?? ''
      return hint
    }),
    contentAttributes.of(attributesFor(current)),
    EditorView.editorAttributes.compute([editorSettings], (state) => ({
      class: state.facet(editorSettings).form === 'poem' ? 'cm-poem' : '',
    })),
    EditorView.domEventHandlers({
      paste(event, view) {
        const data = event.clipboardData
        if (!data) return false
        const plain = data.getData('text/plain')
        // A poem keeps the pasted lines as lines (ADR 0013); prose keeps the clipboard's formatting.
        const poem = view.state.facet(editorSettings).form === 'poem' && plain.trim() !== ''
        const text = poem ? poemFromPlainText(plain) : options.convertPaste(data.getData('text/html'), plain)
        event.preventDefault()
        if (text) pasteText(text)(view)
        return true
      },
    }),
    // `load` replaces the state without an update, so every change seen here is the author's.
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange()
      const moved = update.selectionSet || update.focusChanged || update.geometryChanged || update.docChanged
      if (options.onSelection && moved) options.onSelection(selectionPlace(update.view))
      if (options.onLink && moved) options.onLink(currentMode === 'rendered' ? linkReport(update.view) : null)
    }),
  ]
  const stateFor = (text: string) =>
    chapterState(text, settings, current, [
      viewExtensions,
      mode.of(modeExtensions(currentMode)),
      outline ? outlineText(outline, text) : options.links ? linkSuggestions(options.links) : [],
    ])
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
    setMode(next) {
      if (next === currentMode) return
      currentMode = next
      view.dispatch({ effects: mode.reconfigure(modeExtensions(next)) })
      // Back in rendered text, a cursor left inside a mark moves to where it rests.
      view.dispatch({ selection: view.state.selection, scrollIntoView: true })
      options.onLink?.(next === 'rendered' ? linkReport(view) : null)
    },
    mode: () => currentMode,
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
    niqqud() {
      const { main } = view.state.selection
      const letter = main.empty ? letterBefore(view.state, main.head) : null
      const place = letter ? view.coordsAtPos(letter.from, 1) : null
      return letter && place ? { letter: letter.letter, marks: letter.marks, x: place.left, y: place.bottom } : null
    },
    // The picker keeps the keyboard while the author points letter by letter.
    toggleNiqqud: (mark) => void toggleNiqqud(mark)(view),
    moveToLetter: (forward) => void moveToLetter(forward)(view),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  }
}
