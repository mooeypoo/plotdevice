import type { ProjectSnapshot } from '@plotdevice/application'
import { createJournalStore, createProjectFolders, randomIdGenerator } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { cp, mkdtemp, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { compileManuscript, createProjectRepository } from '../src/index'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function setup() {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-compile-'))
  dirs.push(base)
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  const folders = createProjectFolders()
  const repository = createProjectRepository({ folders, journals: createJournalStore(join(base, 'app-data')), ids: randomIdGenerator })
  const open = async (): Promise<ProjectSnapshot> => {
    const opened = await repository.open(root)
    if (!opened.ok) throw new Error(opened.error)
    return opened.value
  }
  return { root, folders, repository, open }
}

const headings = (text: string) => text.split('\n').filter((line) => line.startsWith('#'))

describe('compiling the book', () => {
  it('puts the book together in reading order, with Pandoc metadata and without chapter frontmatter', async () => {
    const { folders, open } = await setup()
    const { text, missing } = await compileManuscript(folders, await open())
    expect(missing).toEqual([])
    expect(text.startsWith('---\ntitle: The Salt Orchard\nauthor: Ines Varga\nlang: en\n---\n\n')).toBe(true)
    expect(headings(text)).toEqual([
      '## 1. Prologue',
      '# Part One: Arrival',
      '## 2. The Crossing',
      '## 3. The Orchard Gate',
      '# Part Two: Salt',
      '## 4. Frost',
      '## 5. Epilogue',
    ])
    expect(text).not.toContain('id: ch-')
    expect(text).toContain('## 4. Frost\n\nיעל said the frost came early that year.')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('scenario E: moving a chapter changes the compiled order, and renames no file', async () => {
    const { root, folders, repository, open } = await setup()
    const before = (await readdir(join(root, 'manuscript'))).sort()
    const moved = await repository.changeContents(await open(), {
      kind: 'move-chapter',
      file: 'manuscript/frost.md' as ProjectPath,
      placement: { part: null, index: 0 },
    })
    if (!moved.ok) throw new Error(moved.error)
    expect(headings((await compileManuscript(folders, moved.value)).text).slice(0, 2)).toEqual(['## 1. Frost', '## 2. Prologue'])
    expect((await readdir(join(root, 'manuscript'))).sort()).toEqual(before)
  })

  it('keeps direction markers and unknown Markdown as written, and uses \\n line endings', async () => {
    const { root, folders, open } = await setup()
    await writeFile(
      join(root, 'manuscript/frost.md'),
      '---\r\ntitle: Frost\r\n---\r\n::: {dir=ltr}\r\nThe letter.\r\n:::\r\n\r\n<!-- a note -->\r\n',
    )
    const { text } = await compileManuscript(folders, await open())
    expect(text).toContain('## 4. Frost\n\n::: {dir=ltr}\nThe letter.\n:::\n\n<!-- a note -->\n')
    expect(text).not.toContain('\r')
  })

  it('marks a Hebrew book right to left for Pandoc', async () => {
    const { root, folders, open } = await setup()
    const project = await readFile(join(root, 'project.md'), 'utf8')
    await writeFile(join(root, 'project.md'), project.replace('language: en', 'language: he'))
    expect((await compileManuscript(folders, await open())).text).toMatch(
      /^---\ntitle: The Salt Orchard\nauthor: Ines Varga\nlang: he\ndir: rtl\n---\n/,
    )
  })

  it('reports a missing chapter instead of silently leaving it out', async () => {
    const { root, folders, open } = await setup()
    const snapshot = await open()
    await unlink(join(root, 'manuscript/frost.md'))
    const { text, missing } = await compileManuscript(folders, snapshot)
    expect(missing).toEqual(['manuscript/frost.md'])
    expect(text).not.toContain('Frost')
  })

  it('changes nothing in the project', async () => {
    const { root, folders, open } = await setup()
    const snapshotOf = async () =>
      Promise.all(
        (await readdir(root, { recursive: true })).sort().map(async (name) => [name, await readFile(join(root, name)).catch(() => null)]),
      )
    const before = await snapshotOf()
    await compileManuscript(folders, await open())
    expect(await snapshotOf()).toEqual(before)
  })
})
