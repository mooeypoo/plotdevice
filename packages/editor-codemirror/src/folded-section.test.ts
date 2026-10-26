import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { findSection } from './folded-section'

const HEADINGS = ['Relationships', 'קשרים']
const section = (text: string): string | null => {
  const doc = EditorState.create({ doc: text }).doc
  const found = findSection(doc, HEADINGS)
  return found ? doc.sliceString(found.from, found.to) : null
}

describe('the folded relationships section', () => {
  it('runs from its heading to its last line of text, before the next heading of the same or a higher level', () => {
    expect(section('Ilka’s aunt.\n\n## Relationships\n\n- Aunt of [Ilka](ilka.md)\n\n### Old\n- x\n\n## Habits\nCounts.\n')).toBe(
      '## Relationships\n\n- Aunt of [Ilka](ilka.md)\n\n### Old\n- x',
    )
    expect(section('## Relationships\n- Aunt of [Ilka](ilka.md)\n')).toBe('## Relationships\n- Aunt of [Ilka](ilka.md)')
  })

  it('finds the Hebrew name in any case, with a colon, and only outside code', () => {
    expect(section('תיאור.\n\n# קשרים:\n- אחות של [[bea]]\n')).toBe('# קשרים:\n- אחות של [[bea]]')
    expect(section('```\n## Relationships\n```\n')).toBeNull()
    expect(section('## RELATIONSHIPS\n')).toBe('## RELATIONSHIPS')
    expect(section('## Family\n- Aunt\n')).toBeNull()
  })
})
