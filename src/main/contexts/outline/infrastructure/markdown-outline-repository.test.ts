import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import { resolveBookWords } from '../../../book-language/book-words'
import { outlineWordsOf } from '../../../book-language/context-words'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { createCaptureBeat } from '../application/commands/capture-beat'
import { createMoveBeat } from '../application/commands/move-beat'
import { createMoveColumn } from '../application/commands/move-column'
import type { OutlineSettings } from '../domain/outline-settings'
import { createMarkdownOutlineRepository } from './markdown-outline-repository'

let copy: SampleNovelCopy

beforeEach(async () => {
  copy = await copySampleNovel()
})
afterEach(async () => {
  await copy.remove()
})

describe('markdown outline repository', () => {
  it('lists the sample’s outlines with their titles, and every file as taken', async () => {
    const { outlines, taken } = await createMarkdownOutlineRepository(copy.root).load()
    expect(outlines.map((outline) => [outline.path, outline.title]).sort()).toEqual([
      ['Working plan.md', 'Working plan'],
      ['outlines/Loose plan.md', 'Loose plan'],
      ['outlines/Not a board.md', 'Not a board'],
      ['outlines/Revision plan.md', 'Revision plan'],
      ['outlines/תוכנית.md', 'תוכנית עבודה']
    ])
    expect(taken).toContain('Loose thoughts.md')
    expect(taken).toHaveLength(35)
  })

  it('saves only the body, keeping the BOM, frontmatter comments and CRLF', async () => {
    const repository = createMarkdownOutlineRepository(copy.root)
    const path = 'outlines/Revision plan.md' as ProjectPath
    const before = await readFile(join(copy.root, path), 'utf8')
    const opened = await repository.readText(path)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const text = opened.value.text.replace('## Inbox', '## Later')
    expect(await repository.writeText(path, text, opened.value.version)).toMatchObject({ ok: true })
    expect(await readFile(join(copy.root, path), 'utf8')).toBe(
      before.replace('## Inbox', '## Later')
    )
  })
})

const p = (value: string): ProjectPath => value as ProjectPath
const settings: OutlineSettings = {
  readOnly: false,
  ignoredFolder: p('templates'),
  words: () => outlineWordsOf(resolveBookWords(null))
}

describe('capturing a beat', () => {
  it.each([
    ['Working plan.md', '- The orchard gate should creak in every chapter it appears.\n', '\n'],
    ['outlines/Revision plan.md', '* Check every date against the harvest.\r\n', '\r\n'],
    ['outlines/Loose plan.md', '- Last image: the gate', '\n']
  ])('appends only one line to %s', async (path, before, ending) => {
    const original = await readFile(join(copy.root, path), 'utf8')
    const capture = createCaptureBeat({
      repository: createMarkdownOutlineRepository(copy.root),
      settings
    })
    expect(await capture(p(path), 'A new idea', undefined)).toMatchObject({ ok: true })
    const after = await readFile(join(copy.root, path), 'utf8')
    if (path === 'outlines/Loose plan.md') {
      // No Inbox there: the heading is added at the end, after a blank line.
      expect(after).toBe(`${original}${ending}${ending}## Inbox${ending}- A new idea${ending}`)
    } else {
      const marker = before.startsWith('*') ? '*' : '-'
      expect(after).toBe(original.replace(before, `${before}${marker} A new idea${ending}`))
    }
  })

  it('refuses a stale version, a read-only project, and a beat that is not one line', async () => {
    const repository = createMarkdownOutlineRepository(copy.root)
    const original = await readFile(join(copy.root, 'Working plan.md'), 'utf8')
    const capture = createCaptureBeat({ repository, settings })
    expect(await capture(p('Working plan.md'), 'Idea', 'stale')).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
    expect(
      await createCaptureBeat({ repository, settings: { ...settings, readOnly: true } })(
        p('Working plan.md'),
        'Idea',
        undefined
      )
    ).toMatchObject({ ok: false, error: { code: 'read-only' } })
    expect(await capture(p('Working plan.md'), 'two\nlines', undefined)).toMatchObject({
      ok: false,
      error: { code: 'invalid-title', diagnostic: { reason: 'outline-invalid-beat' } }
    })
    expect(await readFile(join(copy.root, 'Working plan.md'), 'utf8')).toBe(original)
  })
})

describe('moving on the board', () => {
  const read = (path: string): Promise<string> => readFile(join(copy.root, path), 'utf8')

  it('moves a beat between columns, changing only where its line is', async () => {
    const repository = createMarkdownOutlineRepository(copy.root)
    const body = await repository.readBody(p('Working plan.md'))
    if (!body.ok) throw new Error('expected the outline')
    const before = await read('Working plan.md')
    const moved = await createMoveBeat({ repository, settings })(
      p('Working plan.md'),
      body.value.version,
      { line: 12, title: 'The orchard gate should creak in every chapter it appears.' },
      { line: 7, title: 'Part Two' },
      { before: { line: 9, title: 'Who told the foreman?' } }
    )
    expect(moved).toMatchObject({ ok: true })
    expect(await read('Working plan.md')).toBe(
      before
        .replace('- The orchard gate should creak in every chapter it appears.\n', '')
        .replace(
          '- Who told the foreman?\n',
          '- The orchard gate should creak in every chapter it appears.\n- Who told the foreman?\n'
        )
    )
  })

  it('moves a column in a CRLF file with a BOM, and back again byte for byte', async () => {
    const repository = createMarkdownOutlineRepository(copy.root)
    const path = p('outlines/Revision plan.md')
    const before = await read(path)
    const move = createMoveColumn({ repository, settings })
    const first = await repository.readBody(path)
    if (!first.ok) throw new Error('expected the outline')
    expect(
      await move(
        path,
        first.value.version,
        { line: 7, title: 'Move' },
        { before: { line: 2, title: 'Cut' } }
      )
    ).toMatchObject({ ok: true })
    const moved = await read(path)
    expect(moved.startsWith('\uFEFF---\r\n')).toBe(true)
    expect(moved.indexOf('## Move')).toBeLessThan(moved.indexOf('## Cut'))
    const second = await repository.readBody(path)
    if (!second.ok) throw new Error('expected the outline')
    expect(
      await move(
        path,
        second.value.version,
        { line: 2, title: 'Move' },
        { before: { line: 11, title: 'Inbox' } }
      )
    ).toMatchObject({ ok: true })
    expect(await read(path)).toBe(before)
  })

  it('refuses a stale board, a beat that moved, and a read-only project, writing nothing', async () => {
    const repository = createMarkdownOutlineRepository(copy.root)
    const path = p('outlines/Loose plan.md')
    const before = await read(path)
    const body = await repository.readBody(path)
    if (!body.ok) throw new Error('expected the outline')
    const beat = { line: 1, title: "Marrow's map" }
    const after = { line: 6, title: 'After' }
    const move = createMoveBeat({ repository, settings })
    expect(await move(path, 'stale', beat, after, 'end')).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
    expect(
      await move(path, body.value.version, { line: 2, title: "Marrow's map" }, after, 'end')
    ).toMatchObject({ ok: false, error: { code: 'outline-shape-changed' } })
    expect(
      await createMoveBeat({ repository, settings: { ...settings, readOnly: true } })(
        path,
        body.value.version,
        beat,
        after,
        'end'
      )
    ).toMatchObject({ ok: false, error: { code: 'read-only' } })
    expect(await read(path)).toBe(before)
    expect(await move(path, body.value.version, beat, after, 'end')).toMatchObject({ ok: true })
    expect(await read(path)).toContain(
      "- Last image: the gate\n- Marrow's map\n  Drawn on the back of a receipt.\r\n"
    )
  })
})
