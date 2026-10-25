import type { Direction } from '@plotdevice/domain'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorSelection, type StateCommand } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { chapterState } from './chapter-state'
import { formatCommands, insertLink, type FormatCommand } from './format'
import { livePreview } from './live-preview'
import { setParagraphDirection, setPhraseDirection } from './paragraph-direction'
import { editorSettings, type EditorSettings } from './settings'

const prose = HighlightStyle.define([
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: tags.heading, fontWeight: '650' },
])

export interface ChapterEditorOptions {
  text: string
  settings: EditorSettings
  /** Nonce of the page's Content Security Policy, for the editor's own styles (ADR 0004). */
  cspNonce: string
  /** Called after each change the author makes; read the text with `text()` when it's time to save. */
  onChange: () => void
}

/** The chapter editor as the interface uses it. The text in and out is the chapter's Markdown body, byte for byte. */
export interface ChapterEditor {
  text(): string
  /** Replaces the whole text (another chapter, or a reload). Undo history starts over. */
  load(text: string, cursor?: number): void
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

/** CodeMirror edits the Markdown text itself, so saving returns exactly what is in the editor. */
export function createChapterEditor(parent: HTMLElement, options: ChapterEditorOptions): ChapterEditor {
  const settings = new Compartment()
  let current = options.settings
  const contentAttributes = new Compartment()
  const attributesFor = (s: EditorSettings) =>
    EditorView.contentAttributes.of({ dir: s.projectDirection, lang: s.language, spellcheck: 'true', 'aria-label': s.labels.chapterText, 'aria-multiline': 'true' })

  const viewExtensions = [
    EditorView.lineWrapping,
    syntaxHighlighting(prose),
    livePreview,
    EditorView.cspNonce.of(options.cspNonce),
    contentAttributes.of(attributesFor(current)),
    // `load` replaces the state without an update, so every change seen here is the author's.
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange()
    }),
  ]
  const stateFor = (text: string) => chapterState(text, settings, current, viewExtensions)
  const view = new EditorView({ parent, state: stateFor(options.text) })

  const run = (command: StateCommand): void => {
    command(view)
    view.focus()
  }

  return {
    // `sliceDoc` joins lines with the file's own line ending; `doc.toString()` would always use `\n`.
    text: () => view.state.sliceDoc(),
    load(text, cursor = 0) {
      view.setState(stateFor(text))
      view.dispatch({ selection: EditorSelection.cursor(Math.min(cursor, view.state.doc.length)), scrollIntoView: true })
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
