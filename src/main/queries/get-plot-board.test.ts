import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { resolveBookWords } from '../book-language/book-words'
import { outlineWordsOf } from '../book-language/context-words'
import { readChapter } from '../contexts/manuscript/domain/chapter'
import type { ManuscriptView } from '../contexts/manuscript/application/queries/get-manuscript'
import { createReadOutlineStructure } from '../contexts/outline/application/queries/read-outline-structure'
import { InMemoryOutlines } from '../contexts/outline/domain/ports/in-memory-outline.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { createGetPlotBoard, type GetPlotBoard } from './get-plot-board'

const p = (value: string): ProjectPath => value as ProjectPath
const sample = fileURLToPath(new URL('../../../fixtures/sample-novel/', import.meta.url))

/** A fixture outline's body as written: everything after its frontmatter. */
function fixtureBody(path: string): string {
  const text = readFileSync(sample + path, 'utf8')
  return text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/u, '')
}

const ferry = readChapter(
  p('manuscript/Part One/The Ferry.md'),
  { type: 'chapter', title: 'The Ferry', status: 'draft', pov: '[[Ilka Szabó]]' },
  'Ilka came over on the morning boat.\n'
)
const cannery = readChapter(
  p('manuscript/Part Two/The Cannery.md'),
  { type: 'chapter', title: 'The Cannery', status: 'revised' },
  'Steam.\n'
)
const river = readChapter(
  p('manuscript/Part Three/הנהר.md'),
  { type: 'chapter', title: 'הנהר', status: 'draft', pov: '[[יעל]]' },
  'מים.\n'
)
const view: ManuscriptView = {
  manuscript: {
    parts: [],
    unnumberedParts: [],
    chapters: [ferry, cannery].map((chapter) => ({ chapter, duplicateOrder: false })),
    unordered: [{ chapter: river, reason: 'missing-order' }],
    warnings: [],
    wordCount: 0
  },
  linkCandidates: [ferry, cannery, river].map((chapter) => ({
    path: chapter.path,
    type: 'chapter'
  }))
}

let getPlotBoard: GetPlotBoard

beforeEach(() => {
  const repository = new InMemoryOutlines()
  for (const path of ['Working plan.md', 'outlines/Revision plan.md', 'outlines/תוכנית.md']) {
    repository.put(path, { type: 'outline' }, fixtureBody(path))
  }
  getPlotBoard = createGetPlotBoard({
    readOutlineStructure: createReadOutlineStructure({
      repository,
      settings: {
        readOnly: false,
        ignoredFolder: undefined,
        words: () => outlineWordsOf(resolveBookWords(null))
      }
    }),
    getManuscript: () => Promise.resolve(view),
    getChronologySettings: () =>
      Promise.resolve({
        calendar: 'gregorian',
        threads: [
          { key: 'main', name: 'Main plot', color: '#4f7cac' },
          { key: 'strike', name: 'The cannery strike' }
        ]
      })
  })
})

describe('the plot board', () => {
  it('shows the Working plan with chapter facts, threads, notes and the Inbox', async () => {
    const read = await getPlotBoard(p('Working plan.md'))
    if (!read.ok) throw new Error('expected the board')
    const board = read.value
    expect(board.preamble).toBe(
      'The plan in one breath: Ilka comes back for the orchard and stays for the strike.'
    )
    expect(board.columns.map((column) => [column.title, column.inbox])).toEqual([
      ['Part One', false],
      ['Part Two', false],
      ['Inbox', true]
    ])
    const [first, ledger] = board.columns[0]?.beats ?? []
    expect(first).toEqual({
      line: 3,
      title: '[[The Ferry]]: Ilka arrives; Bea is already at the gate. #main',
      notes: '- Open on the water, not the town.',
      tags: ['main'],
      threads: ['main'],
      chapter: {
        path: 'manuscript/Part One/The Ferry.md',
        title: 'The Ferry',
        status: 'draft',
        pov: ['Ilka Szabó'],
        wordCount: 7
      }
    })
    expect(ledger).toMatchObject({ threads: ['strike'] })
    expect(ledger?.chapter).toBeUndefined()
    expect(board.columns[1]?.beats[0]?.chapter).toMatchObject({ status: 'revised' })
    expect(board.threads.map((thread) => thread.key)).toEqual(['main', 'strike'])
  })

  it('resolves a markdown link, and reads a Hebrew outline with a Hebrew inbox', async () => {
    const revision = await getPlotBoard(p('outlines/Revision plan.md'))
    expect(revision.ok && revision.value.columns[1]?.beats[0]?.chapter?.title).toBe('The Cannery')
    const hebrew = await getPlotBoard(p('outlines/תוכנית.md'))
    if (!hebrew.ok) throw new Error('expected the board')
    expect(hebrew.value.columns.map((column) => column.inbox)).toEqual([false, true])
    expect(hebrew.value.columns[0]?.beats[0]?.chapter?.pov).toEqual(['יעל'])
    // #שביתה is a tag, but not one of novel.md's thread keys.
    expect(hebrew.value.columns[0]?.beats[1]).toMatchObject({ tags: ['שביתה'], threads: [] })
  })

  it('reports an outline it cannot read', async () => {
    expect(await getPlotBoard(p('Missing.md'))).toMatchObject({
      ok: false,
      error: { code: 'not-found' }
    })
  })
})
