import { describe, expect, it } from 'vitest'
import { cleanTags, nearDuplicateTags, projectTags, tagKey, type ProjectTag } from './tags'

describe('tags', () => {
  it('are the same tag when only case and spacing differ', () => {
    expect(tagKey('  Marrow   Folk ')).toBe(tagKey('marrow folk'))
    expect(tagKey('Part Two – main')).not.toBe(tagKey('Part Two main'))
    expect(tagKey('משפחת ורגה')).toBe('משפחת ורגה')
  })

  it('are written tidied, without blanks, each once with its first spelling', () => {
    expect(cleanTags([' Marrow  folk', 'marrow folk', '', 'Main', 'MAIN', 'יעל'])).toEqual(['Marrow folk', 'Main', 'יעל'])
  })

  it('in a project, keep the first spelling found and count the pages', () => {
    const pages = [{ tags: ['Main', 'Varga family'] }, { tags: ['main'] }, { tags: [] }, { tags: ['Varga Family', 'Main'] }]
    expect(projectTags(pages)).toEqual([
      { tag: 'Main', pages: 3 },
      { tag: 'Varga family', pages: 2 },
    ])
  })
})

describe('near-duplicate tags', () => {
  const tag = (name: string, pages = 1): ProjectTag => ({ tag: name, pages })
  const pairs = (tags: ProjectTag[]): string[][] => nearDuplicateTags(tags).map((found) => found.tags.map((t) => t.tag))

  it('are found when only spaces, dashes or punctuation differ', () => {
    expect(pairs([tag('Part Two – main', 3), tag('Part Two main'), tag('part-two: main')])).toEqual([
      ['Part Two – main', 'Part Two main'],
      ['Part Two – main', 'part-two: main'],
      ['Part Two main', 'part-two: main'],
    ])
  })

  it('are found when a longer tag differs by a letter or two, the more used one first', () => {
    expect(pairs([tag('Varga famliy'), tag('Varga family', 4)])).toEqual([['Varga family', 'Varga famliy']])
    expect(pairs([tag('the Marrow plot'), tag('the Marow plott')])).toEqual([['the Marrow plot', 'the Marow plott']])
    expect(pairs([tag('משפחת ורגה'), tag('משפחת ורגא')])).toEqual([['משפחת ורגה', 'משפחת ורגא']])
  })

  it('are not found for short tags that merely look alike, numbers against words, or different scripts, though punctuation still counts as nothing', () => {
    expect(pairs([tag('Main'), tag('Maid'), tag('Part 2'), tag('Part Two'), tag('Bea'), tag('באה')])).toEqual([])
    expect(pairs([tag('Ilka'), tag('Ilka!'), tag('Noël')])).toEqual([['Ilka', 'Ilka!']])
  })

  it('are recognised later whatever their spelling or order', () => {
    const [first] = nearDuplicateTags([tag('Varga famliy'), tag('Varga family')])
    const [again] = nearDuplicateTags([tag('Varga Family', 2), tag('varga famliy')])
    expect(first?.key).toBe(again?.key)
  })
})
