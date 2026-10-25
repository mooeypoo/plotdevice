import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { chapterFileFor, matchRenamedChapters, projectFolderName } from './chapter-files'

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

describe('matchRenamedChapters: suggest which unlisted file a missing chapter became', () => {
  it('matches by id only, never by name', () => {
    const missing = [
      { file: 'manuscript/the-crossing.md' as ProjectPath, id: 'ch-k3f9q2' },
      { file: 'manuscript/frost.md' as ProjectPath, id: undefined },
    ]
    const unlisted = [
      { file: 'manuscript/crossing.md' as ProjectPath, id: 'ch-k3f9q2' },
      { file: 'manuscript/frost-old.md' as ProjectPath, id: 'ch-other' },
    ]
    expect(matchRenamedChapters(missing, unlisted)).toEqual([{ missing: 'manuscript/the-crossing.md', found: 'manuscript/crossing.md' }])
  })

  it('suggests nothing when two unlisted files claim the same id', () => {
    const missing = [{ file: 'manuscript/a.md' as ProjectPath, id: 'ch-1' }]
    const unlisted = [
      { file: 'manuscript/b.md' as ProjectPath, id: 'ch-1' },
      { file: 'manuscript/c.md' as ProjectPath, id: 'ch-1' },
    ]
    expect(matchRenamedChapters(missing, unlisted)).toEqual([])
  })
})
