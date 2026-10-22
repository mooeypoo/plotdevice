import { describe, expect, it } from 'vitest'
import { createGetChronologySettings } from '../contexts/chronology/application/queries/get-chronology-settings'
import { createReadStoryDates } from '../contexts/chronology/application/queries/read-story-dates'
import { createListCodex } from '../contexts/codex/application/queries/list-codex'
import { InMemoryCodex } from '../contexts/codex/domain/ports/in-memory-codex.fake'
import { createListChapterReferences } from '../contexts/manuscript/application/queries/list-chapter-references'
import { InMemoryManuscript } from '../contexts/manuscript/domain/ports/in-memory-manuscript.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { createGetTimeline } from './get-timeline'
import { resolveBookWords } from '../book-language/book-words'
import { codexWordsOf } from '../book-language/context-words'

/** English words, as the composition root resolves them for a book without a `language`. */
const ENGLISH_WORDS = resolveBookWords(null)

const p = (value: string): ProjectPath => value as ProjectPath

describe('GetTimeline', () => {
  it('lists the book’s chapters in reading order with dates, threads, and characters', async () => {
    const manuscript = new InMemoryManuscript()
    manuscript.otherCandidates = [
      { path: p('characters/Ilka Szabó.md'), type: 'character' },
      { path: p('characters/Aunt Bea.md'), type: 'character' },
      { path: p('locations/Marrow.md'), type: 'location' }
    ]
    manuscript.put('One.md', { type: 'part', order: 1, title: 'The Orchard' })
    manuscript.put('Frost.md', {
      type: 'chapter',
      part: '[[One]]',
      order: 2,
      story_date: '1952-10',
      threads: ['main', 'strike'],
      characters: ['[[Aunt Bea]]', '[[Ilka Szabó]]']
    })
    manuscript.put('Ferry.md', {
      type: 'chapter',
      part: '[[One]]',
      order: 1,
      story_date: '1952-10-03',
      story_time: 'morning',
      threads: ['main'],
      pov: '[[Ilka Szabó]]',
      characters: ['[[Ilka Szabó]]'],
      location: '[[Marrow]]'
    })
    manuscript.put('Stray.md', { type: 'chapter', story_date: '1951' })
    manuscript.novel = { threads: [{ key: 'main', name: 'Main plot', color: '#4f7cac' }] }

    const codex = new InMemoryCodex()
    codex.put('characters/Ilka Szabó.md', { type: 'character', title: 'Ilka Szabó' })
    codex.put('characters/Aunt Bea.md', { type: 'character' })

    const getChronologySettings = createGetChronologySettings({
      repository: { readNovelFrontmatter: () => manuscript.readNovelFrontmatter() }
    })
    const timeline = await createGetTimeline({
      listChapterReferences: createListChapterReferences({ repository: manuscript }),
      readStoryDates: createReadStoryDates({ getSettings: getChronologySettings }),
      getChronologySettings,
      listCodex: createListCodex({
        repository: codex,
        settings: {
          readOnly: false,
          folders: { character: undefined, location: undefined, note: undefined },
          templateFolder: undefined,
          fileNames: 'ask',
          words: () => codexWordsOf(ENGLISH_WORDS)
        }
      })
    })()

    expect(timeline.calendar).toBe('gregorian')
    expect(timeline.threads).toEqual([
      { key: 'main', name: 'Main plot', color: '#4f7cac' },
      { key: 'strike', name: 'strike' }
    ])
    expect(timeline.characters).toEqual([
      { key: 'characters/Aunt Bea.md', name: 'Aunt Bea' },
      { key: 'characters/Ilka Szabó.md', name: 'Ilka Szabó' }
    ])
    expect(timeline.chapters.map((chapter) => chapter.title)).toEqual(['Ferry', 'Frost'])
    expect(timeline.chapters[0]).toMatchObject({
      number: 1,
      partNumber: 1,
      partTitle: 'The Orchard',
      storyTime: 'morning',
      characters: [{ path: 'characters/Ilka Szabó.md', pov: true }],
      date: {
        kind: 'dated',
        reading: { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 10, day: 3 } },
        span: { precision: 'day' }
      }
    })
    expect(timeline.outside).toBe(1)
  })
})
