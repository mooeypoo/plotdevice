// @vitest-environment happy-dom
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { technicalSpanDirection } from './line-direction'

describe('technicalSpanDirection', () => {
  it('isolates inline code in LTR without changing mixed-script prose', () => {
    const parent = document.createElement('div')
    const text = 'עברית `path/to/file.md` نهاية'
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: text,
        extensions: [markdown({ base: markdownLanguage }), technicalSpanDirection()]
      })
    })

    const technicalSpan = parent.querySelector('[dir="ltr"]')
    expect(technicalSpan).not.toBeNull()
    expect(technicalSpan?.textContent).toBe('`path/to/file.md`')
    expect(view.state.doc.toString()).toBe(text)
    view.destroy()
  })
})
