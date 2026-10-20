import { describe, expect, it } from 'vitest'
import { createListChapterReferences } from '../contexts/manuscript/application/queries/list-chapter-references'
import { InMemoryManuscript } from '../contexts/manuscript/domain/ports/in-memory-manuscript.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { createGetAppearsIn } from './get-appears-in'

const p = (value: string): ProjectPath => value as ProjectPath

describe('GetAppearsIn', () => {
  it('lists the chapters pointing to an entry, in book order, with the keys used', async () => {
    const repository = new InMemoryManuscript()
    repository.otherCandidates = [
      { path: p('characters/Ilka Szabó.md'), type: 'character' },
      { path: p('characters/Marrow.md'), type: 'character' },
      { path: p('locations/Marrow.md'), type: 'location' }
    ]
    repository.put('Part One.md', { type: 'part', order: 1 })
    repository.put('Second.md', {
      type: 'chapter',
      part: '[[Part One]]',
      order: 2,
      characters: ['[[Ilka Szabó]]'],
      location: '[[Marrow]]'
    })
    repository.put('First.md', {
      type: 'chapter',
      part: '[[Part One]]',
      order: 1,
      pov: '[[Ilka Szabó]]',
      characters: ['[[Ilka Szabó]]', '[[Marrow]]']
    })
    repository.put('Stray.md', { type: 'chapter', characters: '[[Ilka Szabó]]' })
    repository.put('Third.md', {
      type: 'chapter',
      part: '[[Part One]]',
      order: 3,
      // Decomposed ó in the address; the file name is composed.
      pov: '[Ilka](characters/Ilka%20Szabo%CC%81.md)'
    })

    const appearsIn = createGetAppearsIn({
      listChapterReferences: createListChapterReferences({ repository })
    })
    expect(await appearsIn(p('characters/Ilka Szabó.md'))).toEqual([
      { path: 'First.md', title: 'First', keys: ['pov', 'characters'] },
      { path: 'Second.md', title: 'Second', keys: ['characters'] },
      { path: 'Third.md', title: 'Third', keys: ['pov'] },
      { path: 'Stray.md', title: 'Stray', keys: ['characters'] }
    ])
    // The shared name settles by key: `characters` means the character, `location` the place.
    expect(await appearsIn(p('characters/Marrow.md'))).toEqual([
      { path: 'First.md', title: 'First', keys: ['characters'] }
    ])
    expect(await appearsIn(p('locations/Marrow.md'))).toEqual([
      { path: 'Second.md', title: 'Second', keys: ['location'] }
    ])
  })
})
