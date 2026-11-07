import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { Contents } from '../manuscript/index'
import { chosenChapters, defaultExportChoices, firstChapters, paperForRegion } from './export-choices'

const p = (path: string) => path as ProjectPath

const contents: Contents = {
  entries: [
    { kind: 'chapter', file: p('manuscript/a.md'), linkText: 'A' },
    {
      kind: 'part',
      name: 'One',
      chapters: [
        { kind: 'chapter', file: p('manuscript/b.md'), linkText: 'B' },
        { kind: 'chapter', file: p('manuscript/c.md'), linkText: 'C' },
        { kind: 'chapter', file: p('manuscript/d.md'), linkText: 'D' },
      ],
    },
  ],
}

describe('paper size from the computer’s region', () => {
  it.each([
    ['US', 'letter'],
    ['CA', 'letter'],
    ['MX', 'letter'],
    ['IL', 'a4'],
    ['GB', 'a4'],
    ['DE', 'a4'],
  ])('%s → %s', (region, paper) => {
    expect(paperForRegion(region)).toBe(paper)
  })

  it('reads a full locale, in any case, and falls back to A4 when there is no region', () => {
    expect(paperForRegion('en-US')).toBe('letter')
    expect(paperForRegion('en_us')).toBe('letter')
    expect(paperForRegion('he-IL')).toBe('a4')
    expect(paperForRegion('en')).toBe('a4')
    expect(paperForRegion('ca')).toBe('a4') // Catalan, not Canada
    expect(paperForRegion('zh-Hant-TW')).toBe('a4')
    expect(paperForRegion('es-419')).toBe('a4')
    expect(paperForRegion(null)).toBe('a4')
  })
})

describe('the Export window’s first choices', () => {
  it('starts with Word, a title page with the word count, both heading parts, double spacing and the whole book', () => {
    expect(defaultExportChoices('he-IL')).toEqual({
      format: 'word',
      titlePage: true,
      wordCount: true,
      headings: 'number-and-name',
      doubleSpaced: true,
      paper: 'a4',
      chapters: 'all',
      cover: null,
    })
    expect(defaultExportChoices('en-US').paper).toBe('letter')
  })
})

describe('which chapters are exported', () => {
  it('is every chapter for the whole book', () => {
    expect(chosenChapters(contents, 'all')).toBeUndefined()
  })

  it('keeps remembered chapters that are still in the book, and forgets ones that are gone', () => {
    const chosen = chosenChapters(contents, [p('manuscript/c.md'), p('manuscript/gone.md')])
    expect(chosen && [...chosen]).toEqual(['manuscript/c.md'])
  })

  it('offers the first three chapters in reading order, across parts', () => {
    expect(firstChapters(contents)).toEqual(['manuscript/a.md', 'manuscript/b.md', 'manuscript/c.md'])
    expect(firstChapters({ entries: [{ kind: 'chapter', file: p('manuscript/a.md'), linkText: 'A' }] })).toEqual(['manuscript/a.md'])
  })
})
