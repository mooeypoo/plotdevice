import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { retaggedPages } from './tags'

const page = (file: string, tags: string[]) => ({ file: file as ProjectPath, tags })
const pages = [
  page('characters/bea.md', ['Main', 'Varga famliy']),
  page('characters/josef.md', ['varga famliy', 'Varga family']),
  page('characters/noel.md', ['Marrow folk']),
]

describe('renaming or removing a tag everywhere', () => {
  it('changes only the pages with that tag, whatever its case, keeping its place among the others', () => {
    expect(retaggedPages(pages, 'Varga famliy', 'Varga clan')).toEqual([
      { file: 'characters/bea.md', tags: ['Main', 'Varga clan'] },
      { file: 'characters/josef.md', tags: ['Varga clan', 'Varga family'] },
    ])
  })

  it('merges into a tag a page already has, without listing it twice', () => {
    expect(retaggedPages(pages, 'Varga famliy', 'Varga family')).toEqual([
      { file: 'characters/bea.md', tags: ['Main', 'Varga family'] },
      { file: 'characters/josef.md', tags: ['Varga family'] },
    ])
  })

  it('removes it from every page that has it', () => {
    expect(retaggedPages(pages, 'marrow FOLK', null)).toEqual([{ file: 'characters/noel.md', tags: [] }])
    expect(retaggedPages(pages, 'Nobody has this', null)).toEqual([])
  })
})
