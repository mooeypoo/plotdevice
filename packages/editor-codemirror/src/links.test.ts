import { ensureSyntaxTree } from '@codemirror/language'
import { Compartment, type EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { renderedRules } from './caret'
import { chapterState } from './chapter-state'
import { changeLink, linkAt, removeLink } from './links'
import type { EditorSettings } from './settings'

const english: EditorSettings = {
  projectDirection: 'ltr',
  directionMode: 'project',
  language: 'en',
  labels: { chapterText: 'Chapter text', sceneBreak: 'Scene break' },
}

function stateOf(text: string): EditorState {
  const state = chapterState(text, new Compartment(), english, renderedRules())
  ensureSyntaxTree(state, state.doc.length, 5000)
  return state
}

const apply = (state: EditorState, spec: ReturnType<typeof changeLink>): string => state.update(spec).state.sliceDoc()

describe('the link popup', () => {
  const text = 'Ask [Aunt Bea](../characters/bea.md "her") now\r\nand [the ledger](<https://example.com/the ledger>).\r\n'

  it('finds the link the cursor is in or beside, and where it goes', () => {
    const state = stateOf(text)
    expect(linkAt(state, text.indexOf('Bea'))?.target).toBe('../characters/bea.md')
    expect(linkAt(state, text.indexOf(' now'))?.target).toBe('../characters/bea.md')
    expect(linkAt(state, text.indexOf('ledger'))?.target).toBe('https://example.com/the ledger')
    expect(linkAt(state, text.indexOf('now') + 1)).toBeNull()
  })

  it('changing it keeps its words and the file’s line endings', () => {
    const state = stateOf(text)
    const link = linkAt(state, text.indexOf('Bea'))
    if (!link) throw new Error('no link')
    expect(apply(state, changeLink(state, link, '../characters/ilka varga.md'))).toBe(
      'Ask [Aunt Bea](<../characters/ilka varga.md>) now\r\nand [the ledger](<https://example.com/the ledger>).\r\n',
    )
  })

  it('removing it keeps its words', () => {
    const state = stateOf('ראה את [בּיה](bea.md) שם')
    const link = linkAt(state, 9)
    if (!link) throw new Error('no link')
    expect(apply(state, removeLink(state, link))).toBe('ראה את בּיה שם')
  })

  it('a labelled wikilink becomes an ordinary link when changed', () => {
    const state = stateOf('Ask [[bea|Aunt Bea]] now')
    const link = linkAt(state, 14)
    expect(link?.target).toBe('bea')
    if (!link) throw new Error('no link')
    expect(apply(state, changeLink(state, link, '../characters/bea.md'))).toBe('Ask [Aunt Bea](../characters/bea.md) now')
  })
})
