import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { Contents } from '../manuscript/index'
import { compiledBook } from './compiled-book'

const p = (path: string) => path as ProjectPath
const contents: Contents = {
  entries: [
    { kind: 'chapter', file: p('manuscript/prologue.md'), linkText: 'Prologue' },
    { kind: 'part', name: 'Part One: Arrival', chapters: [{ kind: 'chapter', file: p('manuscript/crossing.md'), linkText: 'The Crossing' }] },
    { kind: 'part', name: 'Part Two', chapters: [{ kind: 'chapter', file: p('manuscript/frost.md'), linkText: 'Frost' }] },
  ],
}
const titles = new Map([[p('manuscript/frost.md'), 'Frost, again']])

describe('the compiled book', () => {
  it('lists parts and chapters in reading order, with headings numbered as the project says', () => {
    expect(compiledBook(contents, 'continuous', titles)).toEqual([
      { kind: 'chapter', file: 'manuscript/prologue.md', heading: '## 1. Prologue' },
      { kind: 'part', heading: '# Part One: Arrival' },
      { kind: 'chapter', file: 'manuscript/crossing.md', heading: '## 2. The Crossing' },
      { kind: 'part', heading: '# Part Two' },
      { kind: 'chapter', file: 'manuscript/frost.md', heading: '## 3. Frost, again' },
    ])
  })

  it('restarts numbering in each part, and leaves chapters outside parts unnumbered, with per-part numbering', () => {
    expect(compiledBook(contents, 'per-part', titles).flatMap((entry) => (entry.kind === 'chapter' ? [entry.heading] : []))).toEqual(['## Prologue', '## 1. The Crossing', '## 1. Frost, again'])
  })

  it('numbers nothing when numbering is off, and keeps Hebrew titles as they are', () => {
    const hebrew: Contents = { entries: [{ kind: 'chapter', file: p('manuscript/a.md'), linkText: 'פרק ראשון' }] }
    expect(compiledBook(hebrew, 'none', new Map())).toEqual([{ kind: 'chapter', file: 'manuscript/a.md', heading: '## פרק ראשון' }])
  })

  it('keeps a title that would otherwise become Markdown as plain text', () => {
    const odd: Contents = { entries: [{ kind: 'chapter', file: p('manuscript/a.md'), linkText: '# not a heading' }] }
    expect(compiledBook(odd, 'none', new Map())[0]).toMatchObject({ heading: '## \\# not a heading' })
  })
})
