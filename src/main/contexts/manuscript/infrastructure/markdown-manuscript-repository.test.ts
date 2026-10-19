import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import { createGetManuscript } from '../application/queries/get-manuscript'
import { createMarkdownManuscriptRepository } from './markdown-manuscript-repository'

let copy: SampleNovelCopy

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

const path = (value: string): ProjectPath => value as ProjectPath

async function bytesOf(projectPath: string): Promise<Buffer> {
  return readFile(join(copy.root, ...projectPath.split('/')))
}

async function textOf(projectPath: string): Promise<string> {
  return (await bytesOf(projectPath)).toString('utf8')
}

describe('loading the sample novel', () => {
  it('arranges it the way docs/file-format.md says', async () => {
    const { manuscript } = await createGetManuscript({
      repository: createMarkdownManuscriptRepository(copy.root)
    })()

    expect(
      manuscript.parts.map((section) => [
        section.part.title,
        ...section.chapters.map((entry) => entry.chapter.title)
      ])
    ).toEqual([
      ['Part One: The Harbor', 'Arrival', 'First night', 'Mixed endings', 'Misfiled'],
      ['Part Two: The Archive', 'The Archive', 'Café Ñandú', 'Duplicate order', 'Shapes'],
      ['Part Three: חזרה', 'חֲזָרָה']
    ])
    expect(manuscript.unordered.map((entry) => [entry.chapter.title, entry.reason])).toEqual([
      ['Lost part', 'part-not-found'],
      ['No order', 'missing-order']
    ])
  })

  it('offers every scanned file as a link candidate', async () => {
    const files = await createMarkdownManuscriptRepository(copy.root).load()
    expect(files.linkCandidates).toHaveLength(30)
    expect(files.linkCandidates).toContainEqual({ path: 'locations/Harbor.md', type: 'location' })
  })
})

describe('reading and writing prose', () => {
  const repository = (): ReturnType<typeof createMarkdownManuscriptRepository> =>
    createMarkdownManuscriptRepository(copy.root)

  it('gives the editor LF text, even from a CRLF file', async () => {
    const read = await repository().readText(path('manuscript/Part One/First night.md'))
    expect(read).toMatchObject({
      ok: true,
      value: { text: "Mira couldn't sleep. The walls hummed with the ship's old songs.\n" }
    })
  })

  it.each([
    'manuscript/Part One/Arrival.md',
    'manuscript/Part One/First night.md',
    'manuscript/Part One/Mixed endings.md',
    'manuscript/Part Two/Café Ñandú.md',
    'manuscript/Part Three/חזרה.md',
    'manuscript/Part One/Part One.md'
  ])('does not touch %s when the text is unchanged', async (file) => {
    const before = await bytesOf(file)
    const mtime = (await stat(join(copy.root, ...file.split('/')))).mtimeMs
    const read = await repository().readText(path(file))
    if (!read.ok) throw new Error('read failed')

    const saved = await repository().writeText(path(file), read.value.text, read.value.version)

    expect(saved).toEqual({ ok: true, value: { version: read.value.version } })
    expect((await bytesOf(file)).equals(before)).toBe(true)
    expect((await stat(join(copy.root, ...file.split('/')))).mtimeMs).toBe(mtime)
  })

  it.each([
    ['manuscript/Part One/Arrival.md', '\n'],
    ['manuscript/Part One/First night.md', '\r\n'],
    ['manuscript/Part Three/חזרה.md', '\n']
  ])(
    'changes only the body of %s, keeping frontmatter bytes and line endings',
    async (file, eol) => {
      const before = await textOf(file)
      const read = await repository().readText(path(file))
      if (!read.ok) throw new Error('read failed')

      const saved = await repository().writeText(
        path(file),
        `${read.value.text}A new paragraph.\n`,
        read.value.version
      )

      expect(saved.ok).toBe(true)
      const after = await textOf(file)
      const headEnd = before.lastIndexOf(`---${eol}`) + `---${eol}`.length
      expect(after.slice(0, headEnd)).toBe(before.slice(0, headEnd))
      expect(after.endsWith(`A new paragraph.${eol}`)).toBe(true)
    }
  )

  it('keeps the BOM when saving', async () => {
    const file = 'manuscript/Part Three/חזרה.md'
    const read = await repository().readText(path(file))
    if (!read.ok) throw new Error('read failed')
    await repository().writeText(path(file), `${read.value.text}עוד.\n`, read.value.version)
    expect([...(await bytesOf(file)).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('refuses to save over a change made outside the app, and leaves that change alone', async () => {
    const file = 'manuscript/Part One/Arrival.md'
    const read = await repository().readText(path(file))
    if (!read.ok) throw new Error('read failed')
    const outside = (await textOf(file)).replace('lamps came on', 'lamps went out')
    await writeFile(join(copy.root, 'manuscript', 'Part One', 'Arrival.md'), outside)

    const saved = await repository().writeText(path(file), 'Mine.\n', read.value.version)

    expect(saved).toMatchObject({ ok: false, error: { code: 'changed-on-disk' } })
    expect(await textOf(file)).toBe(outside)
  })

  it('overwrites the outside change when asked to', async () => {
    const file = 'manuscript/Part One/Arrival.md'
    await writeFile(
      join(copy.root, 'manuscript', 'Part One', 'Arrival.md'),
      '---\ntype: chapter\n---\nTheirs.\n'
    )
    expect(await repository().writeText(path(file), 'Mine.\n', undefined)).toMatchObject({
      ok: true
    })
    expect(await textOf(file)).toBe('---\ntype: chapter\n---\nMine.\n')
  })

  it('reports a file that is gone', async () => {
    expect(await repository().readText(path('manuscript/Gone.md'))).toMatchObject({
      ok: false,
      error: { code: 'not-found' }
    })
  })

  it('refuses paths that escape the project', async () => {
    expect(await repository().readText(path('../outside.md'))).toMatchObject({
      ok: false,
      error: { code: 'not-found' }
    })
  })

  it('refuses to write a file whose frontmatter is never closed', async () => {
    const before = await bytesOf('notes/Unclosed.md')
    expect(await repository().writeText(path('notes/Unclosed.md'), 'x', undefined)).toMatchObject({
      ok: false,
      error: { code: 'unreadable' }
    })
    expect((await bytesOf('notes/Unclosed.md')).equals(before)).toBe(true)
  })
})
