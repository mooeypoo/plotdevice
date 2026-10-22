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
      ['Part One: The Orchard', 'The Ferry', 'First frost', 'Mixed endings', 'Misfiled'],
      ['Part Two: The Cannery', 'The Cannery', 'Café Ñandú', 'Duplicate order', 'Shapes'],
      ['Part Three: הנהר', 'הַנָּהָר']
    ])
    expect(manuscript.unordered.map((entry) => [entry.chapter.title, entry.reason])).toEqual([
      ['Lost part', 'part-not-found'],
      ['No order', 'missing-order']
    ])
  })

  it('offers every scanned file as a link candidate', async () => {
    const files = await createMarkdownManuscriptRepository(copy.root).load()
    expect(files.linkCandidates).toHaveLength(35)
    expect(files.linkCandidates).toContainEqual({ path: 'locations/Marrow.md', type: 'location' })
  })
})

describe('reading and writing prose', () => {
  const repository = (): ReturnType<typeof createMarkdownManuscriptRepository> =>
    createMarkdownManuscriptRepository(copy.root)

  it('gives the editor LF text, even from a CRLF file', async () => {
    const read = await repository().readText(path('manuscript/Part One/First frost.md'))
    expect(read).toMatchObject({
      ok: true,
      value: { text: "Ilka couldn't sleep. The smudge pots ticked in the cold all night.\n" }
    })
  })

  it.each([
    'manuscript/Part One/The Ferry.md',
    'manuscript/Part One/First frost.md',
    'manuscript/Part One/Mixed endings.md',
    'manuscript/Part Two/Café Ñandú.md',
    'manuscript/Part Three/הנהר.md',
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
    ['manuscript/Part One/The Ferry.md', '\n'],
    ['manuscript/Part One/First frost.md', '\r\n'],
    ['manuscript/Part Three/הנהר.md', '\n']
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
    const file = 'manuscript/Part Three/הנהר.md'
    const read = await repository().readText(path(file))
    if (!read.ok) throw new Error('read failed')
    await repository().writeText(path(file), `${read.value.text}עוד.\n`, read.value.version)
    expect([...(await bytesOf(file)).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('refuses to save over a change made outside the app, and leaves that change alone', async () => {
    const file = 'manuscript/Part One/The Ferry.md'
    const read = await repository().readText(path(file))
    if (!read.ok) throw new Error('read failed')
    const outside = (await textOf(file)).replace('fog was still lifting', 'fog had already lifted')
    await writeFile(join(copy.root, 'manuscript', 'Part One', 'The Ferry.md'), outside)

    const saved = await repository().writeText(path(file), 'Mine.\n', read.value.version)

    expect(saved).toMatchObject({ ok: false, error: { code: 'changed-on-disk' } })
    expect(await textOf(file)).toBe(outside)
  })

  it('overwrites the outside change when asked to', async () => {
    const file = 'manuscript/Part One/The Ferry.md'
    await writeFile(
      join(copy.root, 'manuscript', 'Part One', 'The Ferry.md'),
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

describe('editing properties on real files', () => {
  const repository = (): ReturnType<typeof createMarkdownManuscriptRepository> =>
    createMarkdownManuscriptRepository(copy.root)

  it('changes only the edited key of a CRLF file, keeping CRLF and comments', async () => {
    const file = 'manuscript/Part One/First frost.md'
    const before = await textOf(file)
    const read = await repository().readEntryFile(path(file))
    if (!read.ok) throw new Error('read failed')

    const written = await repository().writeProperties(
      path(file),
      [{ key: 'status', value: 'draft' }],
      read.value.version
    )

    expect(written.ok).toBe(true)
    expect(await textOf(file)).toBe(before.replace('status: outline', 'status: draft'))
  })

  it('keeps the BOM and body of a Hebrew chapter when adding a key', async () => {
    const file = 'manuscript/Part Three/הנהר.md'
    const before = await bytesOf(file)
    await repository().writeProperties(
      path(file),
      [{ key: 'story_time', value: 'בבוקר' }],
      undefined
    )
    const after = await bytesOf(file)
    expect([...after.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const beforeText = before.toString('utf8')
    const afterText = after.toString('utf8')
    expect(afterText).toBe(
      beforeText.replace(
        'synopsis: יעל יורדת אל הנהר.\n',
        'synopsis: יעל יורדת אל הנהר.\nstory_time: בבוקר\n'
      )
    )
  })

  it('refuses to edit a file whose frontmatter is broken, and leaves it alone', async () => {
    const file = 'manuscript/Part Two/Broken.md'
    const before = await bytesOf(file)
    expect(await repository().readEntryFile(path(file))).toMatchObject({ ok: false })
    expect(
      await repository().writeProperties(path(file), [{ key: 'order', value: 1 }], undefined)
    ).toMatchObject({ ok: false })
    expect((await bytesOf(file)).equals(before)).toBe(true)
  })

  it('reports the semantic path when a chapter has become a different type', async () => {
    const file = 'manuscript/Part One/The Ferry.md'
    const before = await textOf(file)
    const outside = before.replace('type: chapter', 'type: character')
    await writeFile(join(copy.root, file), outside)
    expect(await repository().readEntryFile(path(file))).toMatchObject({
      ok: false,
      error: { diagnostic: { reason: 'manuscript-type-unreadable', path: file } }
    })
    expect(await textOf(file)).toBe(outside)
  })

  it('refuses a stale version, leaving the file alone', async () => {
    const file = 'manuscript/Part One/The Ferry.md'
    const before = await bytesOf(file)
    expect(
      await repository().writeProperties(path(file), [{ key: 'order', value: 9 }], 'stale')
    ).toMatchObject({ ok: false, error: { code: 'changed-on-disk' } })
    expect((await bytesOf(file)).equals(before)).toBe(true)
  })

  it('creates a file and its folders, and never replaces one', async () => {
    const created = await repository().createFile(
      path('manuscript/Part Four/Part Four.md'),
      '---\ntype: part\n---\n'
    )
    expect(created.ok).toBe(true)
    expect(await textOf('manuscript/Part Four/Part Four.md')).toBe('---\ntype: part\n---\n')
    expect(
      await repository().createFile(path('manuscript/Part One/The Ferry.md'), 'x')
    ).toMatchObject({ ok: false, error: { code: 'already-exists' } })
  })

  it('adds a status to novel.md, changing only the statuses line', async () => {
    const before = await textOf('novel.md')
    const written = await repository().writeNovelProperties([
      { key: 'statuses', value: ['idea', 'outline', 'draft', 'revised', 'final', 'maybe'] }
    ])
    expect(written.ok).toBe(true)
    expect(await textOf('novel.md')).toBe(
      before.replace(
        'statuses: [idea, outline, draft, revised, final]',
        'statuses: [idea, outline, draft, revised, final, maybe]'
      )
    )
  })
})
