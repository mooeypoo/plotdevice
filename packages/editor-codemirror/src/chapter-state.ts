import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState, type Compartment, type Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { formatCommands } from './format'
import { lineBreak, newParagraph } from './keys'
import { paragraphDirection } from './paragraph-direction'
import { editorSettings, type EditorSettings } from './settings'

/** The line ending a chapter mostly uses. CodeMirror would otherwise turn every `\r\n` into `\n` (ADR 0003). */
export function lineEndingOf(text: string): '\n' | '\r\n' {
  const crlf = text.split('\r\n').length - 1
  const lf = text.split('\n').length - 1 - crlf
  return crlf > lf ? '\r\n' : '\n'
}

/**
 * Everything about a chapter's editor that doesn't need a screen: the text, its line ending, the
 * keys, the commands and the direction rules. `settings` can be reconfigured later without
 * recreating the editor, so undo history and the cursor survive a change of theme or language.
 */
export function chapterState(text: string, settings: Compartment, initial: EditorSettings, extra: Extension = []): EditorState {
  return EditorState.create({
    doc: text,
    extensions: [
      EditorState.lineSeparator.of(lineEndingOf(text)),
      history(),
      keymap.of([
        { key: 'Enter', run: newParagraph },
        { key: 'Shift-Enter', run: lineBreak },
        { key: 'Mod-b', run: formatCommands.bold },
        { key: 'Mod-i', run: formatCommands.italic },
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      markdown({ base: markdownLanguage }),
      paragraphDirection,
      settings.of(editorSettings.of(initial)),
      extra,
    ],
  })
}
