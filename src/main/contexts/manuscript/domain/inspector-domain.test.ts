import { describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { readEntryProperties } from './entry-properties'
import { uniqueFileName } from '../../../shared-kernel/unique-file-name'
import { newChapterText, newPartText } from './new-entry'
import { propertyWrites } from './property-changes'
import { readStatuses, withStatus } from './statuses'

const path = 'manuscript/Part One/The Ferry.md' as ProjectPath

const ferry = readEntryProperties(path, 'chapter', {
  type: 'chapter',
  title: 'The Ferry',
  part: '[[Part One]]',
  order: 1,
  status: 'draft',
  pov: '[[Ilka Szabó|Ilka]]',
  characters: ['[[Ilka Szabó]]', '[[Aunt Bea]]'],
  location: '[[Marrow]]',
  threads: ['main'],
  story_date: '1952-10-03',
  synopsis: 'Ilka crosses to Marrow.'
})

describe('readEntryProperties', () => {
  it('shows values as written', () => {
    expect(ferry).toEqual({
      path,
      kind: 'chapter',
      title: 'The Ferry',
      status: 'draft',
      pov: ['[[Ilka Szabó|Ilka]]'],
      characters: ['[[Ilka Szabó]]', '[[Aunt Bea]]'],
      location: ['[[Marrow]]'],
      threads: ['main'],
      storyDate: '1952-10-03',
      synopsis: 'Ilka crosses to Marrow.',
      part: '[[Part One]]',
      order: '1'
    })
  })

  it('shows tolerated shapes: unquoted links, single values, ranges, and odd orders', () => {
    expect(
      readEntryProperties(path, 'chapter', {
        pov: [['Ilka Szabó']],
        characters: '[[Aunt Bea]]',
        story_date: ['1952-11-15', '1952-11-21'],
        order: 'second'
      })
    ).toMatchObject({
      pov: ['[[Ilka Szabó]]'],
      characters: ['[[Aunt Bea]]'],
      storyDate: '1952-11-15, 1952-11-21',
      order: 'second'
    })
  })
})

describe('propertyWrites', () => {
  it('writes only what changed', () => {
    expect(propertyWrites(ferry, { status: 'revised' })).toEqual([
      { key: 'status', value: 'revised' }
    ])
  })

  it('removes a key when its field is emptied', () => {
    expect(propertyWrites(ferry, { synopsis: '  ', pov: [], characters: [] })).toEqual([
      { key: 'pov', value: undefined },
      { key: 'characters', value: undefined },
      { key: 'synopsis', value: undefined }
    ])
  })

  it('keeps a single-link key single, and characters a list even with one person', () => {
    expect(propertyWrites(ferry, { location: ['The Mill'], characters: ['Noël'] })).toEqual([
      { key: 'characters', value: ['[[Noël]]'] },
      { key: 'location', value: '[[The Mill]]' }
    ])
  })

  it('makes a single-link key a list when it gets a second link', () => {
    expect(propertyWrites(ferry, { location: ['Marrow', 'The Mill'] })).toEqual([
      { key: 'location', value: ['[[Marrow]]', '[[The Mill]]'] }
    ])
  })

  it('reuses the writer’s own link text for a target that stays', () => {
    expect(propertyWrites(ferry, { pov: ['ilka szabó'] })).toEqual([
      { key: 'pov', value: '[[Ilka Szabó|Ilka]]' }
    ])
  })

  it('sets an order, or removes it to take the chapter out of the numbered book', () => {
    expect(propertyWrites(ferry, { order: 3 })).toEqual([{ key: 'order', value: 3 }])
    expect(propertyWrites(ferry, { order: null })).toEqual([{ key: 'order', value: undefined }])
  })

  it('writes a story date as typed, a year as a number, and commas as a range', () => {
    expect(propertyWrites(ferry, { storyDate: '1952' })).toEqual([
      { key: 'story_date', value: 1952 }
    ])
    expect(propertyWrites(ferry, { storyDate: '1952-11-15, 1952-11-21' })).toEqual([
      { key: 'story_date', value: ['1952-11-15', '1952-11-21'] }
    ])
  })
})

describe('uniqueFileName', () => {
  it('uses the title when no file has that name', () => {
    expect(uniqueFileName('The Mill', 'chapter', new Set())).toBe('The Mill.md')
  })

  it('adds the type, then a number, when the name is taken (any case or form)', () => {
    const taken = new Set(['marrow', 'marrow (chapter)'])
    expect(uniqueFileName('Marrow', 'location', new Set(['marrow']))).toBe('Marrow (location).md')
    expect(uniqueFileName('Marrow', 'chapter', taken)).toBe('Marrow (2).md')
  })

  it('makes titles safe as file names', () => {
    expect(uniqueFileName('Ilka: The Return', 'chapter', new Set())).toBe('Ilka - The Return.md')
  })
})

describe('new entry text', () => {
  it('writes only the needed keys, quoting the title and link', () => {
    expect(newChapterText('Ilka: The Return', '[[Part One]]', 5)).toBe(
      '---\ntype: chapter\ntitle: "Ilka: The Return"\npart: "[[Part One]]"\norder: 5\n---\n'
    )
    expect(newChapterText('Loose', undefined, 1)).toBe(
      '---\ntype: chapter\ntitle: "Loose"\norder: 1\n---\n'
    )
    expect(newPartText('Part Four', 4)).toBe('---\ntype: part\ntitle: "Part Four"\norder: 4\n---\n')
  })
})

describe('statuses', () => {
  it('reads the project list, falling back to the book language’s statuses', () => {
    const fallback = ['רעיון', 'טיוטה']
    expect(readStatuses({ statuses: ['seed', 'draft'] }, fallback)).toEqual(['seed', 'draft'])
    expect(readStatuses({}, fallback)).toEqual(fallback)
    expect(readStatuses({ statuses: 'draft' }, fallback)).toEqual(fallback)
  })

  it('adds a status once, ignoring case', () => {
    expect(withStatus(['idea', 'draft'], 'maybe')).toEqual(['idea', 'draft', 'maybe'])
    expect(withStatus(['idea', 'draft'], 'Draft')).toBeUndefined()
  })
})
