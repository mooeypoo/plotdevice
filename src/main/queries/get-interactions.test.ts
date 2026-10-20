import { describe, expect, it } from 'vitest'
import { createListCodex } from '../contexts/codex/application/queries/list-codex'
import { InMemoryCodex } from '../contexts/codex/domain/ports/in-memory-codex.fake'
import { createListChapterReferences } from '../contexts/manuscript/application/queries/list-chapter-references'
import { InMemoryManuscript } from '../contexts/manuscript/domain/ports/in-memory-manuscript.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { createGetInteractions } from './get-interactions'

const p = (value: string): ProjectPath => value as ProjectPath

describe('GetInteractions', () => {
  it('lists each character’s chapters in reading order, with POV, Hebrew names included', async () => {
    const manuscript = new InMemoryManuscript()
    manuscript.otherCandidates = [
      { path: p('characters/Ilka Szabó.md'), type: 'character' },
      { path: p('characters/יעל.md'), type: 'character' },
      { path: p('characters/Noël.md'), type: 'character' },
      { path: p('locations/Marrow.md'), type: 'location' }
    ]
    manuscript.put('Ferry.md', {
      type: 'chapter',
      order: 1,
      pov: '[[Ilka Szabó]]',
      characters: ['[[Ilka Szabó]]', '[[יעל]]'],
      location: '[[Marrow]]'
    })
    manuscript.put('Frost.md', { type: 'chapter', order: 2, characters: ['[[יעל]]'] })
    manuscript.put('Stray.md', { type: 'chapter', characters: ['[[Noël]]', '[[יעל]]'] })

    const codex = new InMemoryCodex()
    codex.put('characters/Ilka Szabó.md', { type: 'character', title: 'Ilka Szabó' })
    codex.put('characters/יעל.md', { type: 'character', title: 'יעל' })
    codex.put('characters/Noël.md', { type: 'character' })

    const interactions = await createGetInteractions({
      listChapterReferences: createListChapterReferences({ repository: manuscript }),
      listCodex: createListCodex({
        repository: codex,
        settings: {
          readOnly: false,
          folders: { character: undefined, location: undefined, note: undefined },
          templateFolder: undefined,
          fileNames: 'ask'
        }
      })
    })()

    expect(interactions.chapters.map((chapter) => chapter.title)).toEqual(['Ferry', 'Frost'])
    expect(interactions.characters).toEqual([
      {
        path: 'characters/Ilka Szabó.md',
        name: 'Ilka Szabó',
        chapters: [0],
        povChapters: [0]
      },
      { path: 'characters/יעל.md', name: 'יעל', chapters: [0, 1], povChapters: [] }
    ])
    // Noël is only in an unordered chapter, which isn't counted.
    expect(interactions.outside).toBe(1)
  })
})
