import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { chapterCopyFileFor, chapterFileFor, findDuplicateIds, projectFolderName, suggestRelinks } from './chapter-files'

const existing = (...paths: string[]) => paths as ProjectPath[]

describe('chapterFileFor: a new chapter file name from its title', () => {
  it.each([
    ['The Crossing', 'manuscript/the-crossing.md'],
    ['  The   Orchard  Gate  ', 'manuscript/the-orchard-gate.md'],
    ['המעבר', 'manuscript/המעבר.md'],
    ['שער המטע', 'manuscript/שער-המטע.md'],
    ['Noël’s Return', 'manuscript/noël’s-return.md'],
    ['What? Why: (Part 1) #2 / 3%', 'manuscript/what-why-part-1-2-3.md'],
    ['...', 'manuscript/chapter.md'],
    ['Con', 'manuscript/con-chapter.md'],
  ])('%j → %s', (title, expected) => {
    expect(chapterFileFor(title, [])).toBe(expected)
  })

  it('adds -2, -3 when the name is taken, ignoring case and Unicode normalization', () => {
    expect(chapterFileFor('Frost', existing('manuscript/Frost.md'))).toBe('manuscript/frost-2.md')
    expect(chapterFileFor('Frost', existing('manuscript/frost.md', 'manuscript/frost-2.md'))).toBe('manuscript/frost-3.md')
    expect(chapterFileFor('Noël', existing('manuscript/noël.md'))).toBe('manuscript/noël-2.md')
  })

  it('keeps very long titles within a safe length', () => {
    const path = chapterFileFor('A'.repeat(300), [])
    expect(path.length).toBeLessThanOrEqual('manuscript/'.length + 100 + '.md'.length)
  })
})

describe('chapterCopyFileFor: where "keep both" puts the author\'s text', () => {
  const frost = 'manuscript/frost.md' as ProjectPath

  it('sits next to the chapter, named after it', () => {
    expect(chapterCopyFileFor(frost, 'my version', [frost])).toBe('manuscript/frost-my-version.md')
  })

  it('never takes an existing name, whatever its case', () => {
    const taken = [frost, 'manuscript/Frost-My-Version.md' as ProjectPath]
    expect(chapterCopyFileFor(frost, 'my version', taken)).toBe('manuscript/frost-my-version-2.md')
  })

  it('uses the label in the interface language', () => {
    expect(chapterCopyFileFor('manuscript/כפור.md' as ProjectPath, 'הגרסה שלי', [])).toBe('manuscript/כפור-הגרסה-שלי.md')
  })
})

describe('projectFolderName: keeps the title readable', () => {
  it.each([
    ['The Salt Orchard', 'The Salt Orchard'],
    ['מטע המלח', 'מטע המלח'],
    ['Salt: A Novel?', 'Salt A Novel'],
    ['  ', 'Untitled project'],
  ])('%j → %j', (title, expected) => {
    expect(projectFolderName(title)).toBe(expected)
  })
})

describe('suggestRelinks: which unlisted file a missing chapter might have become', () => {
  const p = (path: string) => path as ProjectPath

  it('matches by a known id first, then by an exact title, and never guesses between two', () => {
    const missing = [
      { file: p('manuscript/the-crossing.md'), linkText: 'The Crossing' },
      { file: p('manuscript/frost.md'), linkText: 'Frost' },
      { file: p('manuscript/gate.md'), linkText: 'The Gate' },
    ]
    const unlisted = [
      { file: p('manuscript/crossing.md'), title: 'Renamed title', id: 'ch-k3f9q2' },
      { file: p('manuscript/frost-renamed.md'), title: 'Frost', id: 'ch-other' },
      { file: p('manuscript/gate-a.md'), title: 'The Gate', id: undefined },
      { file: p('manuscript/gate-b.md'), title: 'The Gate', id: undefined },
    ]
    const knownIds = new Map([[p('manuscript/the-crossing.md'), 'ch-k3f9q2']])
    expect(suggestRelinks(missing, unlisted, knownIds)).toEqual([
      { missing: 'manuscript/the-crossing.md', found: 'manuscript/crossing.md', reason: 'same-id' },
      { missing: 'manuscript/frost.md', found: 'manuscript/frost-renamed.md', reason: 'same-title' },
    ])
  })
})

describe('findDuplicateIds', () => {
  it('reports chapters sharing an id (for example a copied file), and nothing else', () => {
    const chapters = [
      { file: 'manuscript/a.md' as ProjectPath, id: 'ch-1' },
      { file: 'manuscript/b.md' as ProjectPath, id: 'ch-1' },
      { file: 'manuscript/c.md' as ProjectPath, id: 'ch-2' },
      { file: 'manuscript/d.md' as ProjectPath, id: undefined },
    ]
    expect(findDuplicateIds(chapters)).toEqual([{ id: 'ch-1', files: ['manuscript/a.md', 'manuscript/b.md'] }])
  })
})
