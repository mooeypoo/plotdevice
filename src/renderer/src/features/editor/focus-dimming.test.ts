import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { currentParagraph } from './focus-dimming'

function stateWithCursorAt(text: string, marker = '|'): EditorState {
  const position = text.indexOf(marker)
  return EditorState.create({
    doc: text.replace(marker, ''),
    selection: { anchor: position }
  })
}

describe('currentParagraph', () => {
  it('spans the run of non-blank lines around the cursor', () => {
    const state = stateWithCursorAt('One.\n\nTwo starts\nand |continues.\n\nThree.')
    expect(currentParagraph(state)).toEqual({ first: 3, last: 4 })
  })

  it('is just the cursor line when it is blank', () => {
    const state = stateWithCursorAt('One.\n|\nTwo.')
    expect(currentParagraph(state)).toEqual({ first: 2, last: 2 })
  })

  it('reaches the edges of the document', () => {
    expect(currentParagraph(stateWithCursorAt('|Only\nparagraph'))).toEqual({ first: 1, last: 2 })
  })
})
