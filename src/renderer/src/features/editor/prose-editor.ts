import { autocompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Compartment, EditorState, StateEffect } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import type { LinkTargetDto } from '../../../../contract/dtos'
import { focusDimming } from './focus-dimming'
import { autoLineDirection } from './line-direction'
import { proseAppearance } from './prose-theme'
import { wikiLinkDecorations } from './wiki-link-decorations'
import { linkAt, type LinkAt } from './link-at'
import { linkCompletionSource, type LinkCompletionTarget } from './link-completion'
import { createLinkKindLookup } from './wiki-link-scan'

/** What the editor needs when it is created. */
export interface ProseEditorOptions {
  readonly text: string
  /** Session state is reused only when its text still matches the freshly read file. */
  readonly state?: EditorState | undefined
  readonly readOnly: boolean
  readonly focusMode: boolean
  readonly linkTargets: readonly LinkTargetDto[]
  readonly onChange: (text: string) => void
  readonly onBlur: () => void
  /** What `[[` offers; read each time, so it follows the project as files change. */
  readonly completions: () => readonly LinkCompletionTarget[]
  /** Ctrl/Cmd+click on a link. */
  readonly onOpenLink: (link: LinkAt) => void
}

/** A mounted prose editor and the settings that can change while it is open. */
export interface ProseEditor {
  setReadOnly(on: boolean): void
  remeasure(): void
  setFocusMode(on: boolean): void
  setLinkTargets(targets: readonly LinkTargetDto[]): void
  focus(): void
  snapshot(): EditorState
  destroy(): void
}

/** Mounts a CodeMirror editor set up for prose: wrapped lines, per-line text direction (Hebrew). */
export function createProseEditor(parent: HTMLElement, options: ProseEditorOptions): ProseEditor {
  const focusCompartment = new Compartment()
  const linksCompartment = new Compartment()
  const editingCompartment = new Compartment()

  const extensions = [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown({ base: markdownLanguage }),
    proseAppearance(),
    EditorView.lineWrapping,
    // Each line runs left-to-right or right-to-left by its own first strong character.
    EditorView.perLineTextDirection.of(true),
    autoLineDirection(),
    EditorView.contentAttributes.of({
      spellcheck: 'true',
      autocorrect: 'on',
      'aria-label': 'Prose'
    }),
    placeholder('Begin writing…'),
    editingCompartment.of([
      EditorState.readOnly.of(options.readOnly),
      EditorView.editable.of(!options.readOnly)
    ]),
    focusCompartment.of(options.focusMode ? focusDimming() : []),
    linksCompartment.of(wikiLinkDecorations(createLinkKindLookup(options.linkTargets))),
    autocompletion({
      override: [linkCompletionSource(options.completions)],
      icons: false,
      activateOnTyping: true
    }),
    completionTheme,
    EditorView.domEventHandlers({
      mousedown(event, view) {
        if (!(event.ctrlKey || event.metaKey) || event.button !== 0) return false
        const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (position === null) return false
        const line = view.state.doc.lineAt(position)
        const link = linkAt(line.text, line.from, position)
        if (link === undefined) return false
        event.preventDefault()
        options.onOpenLink(link)
        return true
      }
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange(update.state.doc.toString())
      if (update.focusChanged && !update.view.hasFocus) options.onBlur()
    })
  ]
  const previous = options.state
  const state =
    previous !== undefined && previous.doc.toString() === options.text
      ? previous.update({ effects: StateEffect.reconfigure.of(extensions) }).state
      : EditorState.create({ doc: options.text, extensions })
  const view = new EditorView({ parent, state })

  return {
    setReadOnly(on) {
      view.dispatch({
        effects: editingCompartment.reconfigure([
          EditorState.readOnly.of(on),
          EditorView.editable.of(!on)
        ])
      })
    },
    remeasure() {
      view.requestMeasure()
    },
    setFocusMode(on) {
      view.dispatch({ effects: focusCompartment.reconfigure(on ? focusDimming() : []) })
    },
    setLinkTargets(targets) {
      view.dispatch({
        effects: linksCompartment.reconfigure(wikiLinkDecorations(createLinkKindLookup(targets)))
      })
    },
    focus() {
      view.focus()
    },
    snapshot() {
      return view.state
    },
    destroy() {
      view.destroy()
    }
  }
}

/** The link suggestions, in the app's dark palette. */
const completionTheme = EditorView.theme({
  '.cm-tooltip.cm-tooltip-autocomplete': {
    border: '1px solid var(--line-strong)',
    borderRadius: '8px',
    background: 'var(--raised)',
    fontFamily: 'var(--font-ui)',
    fontSize: '13px',
    overflow: 'hidden'
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'var(--font-ui)'
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '4px 10px',
    color: 'var(--text)'
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    background: 'var(--active)',
    color: 'var(--text-strong)'
  },
  '.cm-completionDetail': {
    marginInlineStart: '10px',
    fontStyle: 'normal',
    color: 'var(--text-muted)'
  }
})
