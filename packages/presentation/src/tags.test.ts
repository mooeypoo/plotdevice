import { describe, expect, it } from 'vitest'
import { groupByTags, tagRow, tagSuggestions } from './tags'

const pages = [
  { title: 'Bea', tags: ['Main', 'Varga family'] },
  { title: 'Ilka', tags: ['main', 'Part Two – main'] },
  { title: 'Josef', tags: ['Varga family'] },
  { title: 'Noël', tags: ['Part Two – main', 'Marrow folk'] },
  { title: 'Yael', tags: [] },
]

describe('the tag row', () => {
  it('lists each tag once, A to Z, with how many pages have it', () => {
    expect(tagRow(pages, 'en')).toEqual([
      { tag: 'Main', pages: 2 },
      { tag: 'Marrow folk', pages: 1 },
      { tag: 'Part Two – main', pages: 2 },
      { tag: 'Varga family', pages: 2 },
    ])
  })

  it('sorts Hebrew tags in Hebrew order', () => {
    expect(tagRow([{ tags: ['משפחה', 'ראשי', 'אורחים'] }], 'he').map((tag) => tag.tag)).toEqual(['אורחים', 'משפחה', 'ראשי'])
  })
})

describe('tag suggestions', () => {
  const tags = tagRow(pages, 'en')

  it('leave out tags already on the page, whatever their case', () => {
    expect(tagSuggestions(tags, ['MAIN', 'Marrow folk'], '')).toEqual(['Part Two – main', 'Varga family'])
  })

  it('put tags starting with what was typed first, then tags containing it', () => {
    expect(tagSuggestions(tags, [], 'ma')).toEqual(['Main', 'Marrow folk', 'Part Two – main'])
    expect(tagSuggestions(tags, [], 'family')).toEqual(['Varga family'])
    expect(tagSuggestions(tags, [], 'nothing like it')).toEqual([])
  })
})

describe('grouping a list by tags', () => {
  const titles = ({ groups, others }: ReturnType<typeof groupByTags<(typeof pages)[number]>>) => ({
    groups: groups.map((group) => [group.tag, group.pages.map((page) => page.title)]),
    others: others.map((page) => page.title),
  })

  it('puts each page in the first chosen group it belongs to, in the order the tags were chosen', () => {
    expect(titles(groupByTags(pages, ['Part Two – main', 'main']))).toEqual({
      groups: [
        ['Part Two – main', ['Ilka', 'Noël']],
        ['main', ['Bea']],
      ],
      others: ['Josef', 'Yael'],
    })
  })

  it('leaves out groups with nothing in them, and with no tag chosen keeps the list as it is', () => {
    expect(titles(groupByTags(pages, ['Gone', 'Varga family']))).toEqual({
      groups: [['Varga family', ['Bea', 'Josef']]],
      others: ['Ilka', 'Noël', 'Yael'],
    })
    expect(titles(groupByTags(pages, []))).toEqual({ groups: [], others: ['Bea', 'Ilka', 'Josef', 'Noël', 'Yael'] })
  })
})
