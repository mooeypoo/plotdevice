import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import type { LinkTargetDto } from '../../../../contract/dtos'
import { focusDimming } from './focus-dimming'
import { autoLineDirection } from './line-direction'
import { proseAppearance } from './prose-theme'
import { wikiLinkDecorations } from './wiki-link-decorations'
import { createLinkKindLookup } from './wiki-link-scan'

/** What the editor needs when it is created. */
export interface ProseEditorOptions {
  readonly text: string
  readonly readOnly: boolean
  readonly focusMode: boolean
  readonly linkTargets: readonly LinkTargetDto[]
  readonly onChange: (text: string) => void
  readonly onBlur: () => void
}

/** A mounted prose editor and the settings that can change while it is open. */
export interface ProseEditor {
  setFocusMode(on: boolean): void
  setLinkTargets(targets: readonly LinkTargetDto[]): void
  focus(): void
  destroy(): void
}

/** Mounts a CodeMirror editor set up for prose: wrapped lines, per-line text direction (Hebrew). */
export function createProseEditor(parent: HTMLElement, options: ProseEditorOptions): ProseEditor {
  const focusCompartment = new Compartment()
  const linksCompartment = new Compartment()

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.text,
      extensions: [
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
        EditorState.readOnly.of(options.readOnly),
        EditorView.editable.of(!options.readOnly),
        focusCompartment.of(options.focusMode ? focusDimming() : []),
        linksCompartment.of(wikiLinkDecorations(createLinkKindLookup(options.linkTargets))),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) options.onChange(update.state.doc.toString())
          if (update.focusChanged && !update.view.hasFocus) options.onBlur()
        })
      ]
    })
  })

  return {
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
    destroy() {
      view.destroy()
    }
  }
}
