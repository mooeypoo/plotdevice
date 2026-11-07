import { createJournalStore, createProjectFolders, randomIdGenerator } from '@plotdevice/fs-node'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRepository } from '../src/index'

// The title and author typed in the Export window are the book's own (Milestone 22).
const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function setup(projectFile?: string) {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-details-'))
  dirs.push(base)
  const root = join(base, 'book')
  await cp(FIXTURE, root, { recursive: true })
  if (projectFile !== undefined) await writeFile(join(root, 'project.md'), projectFile)
  const repository = createProjectRepository({
    folders: createProjectFolders(),
    journals: createJournalStore(join(base, 'a')),
    ids: randomIdGenerator,
  })
  const opened = await repository.open(root)
  if (!opened.ok) throw new Error(opened.error)
  return { root, repository, snapshot: opened.value }
}

describe('saving the book’s title and author', () => {
  it('changes only those two lines, keeping comments, other keys and the notes', async () => {
    const { root, repository, snapshot } = await setup()
    const before = await readFile(join(root, 'project.md'), 'utf8')
    const saved = await repository.setDetails(snapshot, { title: 'פרדס המלח', author: 'אינס ורגה' })
    if (!saved.ok) throw new Error(saved.error)
    expect(saved.value.details).toMatchObject({ title: 'פרדס המלח', author: 'אינס ורגה' })
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(
      before.replace('title: The Salt Orchard', 'title: פרדס המלח').replace('author: Ines Varga', 'author: אינס ורגה'),
    )
  })

  it('adds an author the book didn’t have, and leaves the folder’s name alone', async () => {
    const { root, repository, snapshot } = await setup('---\ntitle: Untitled project\nlanguage: en\nschemaVersion: 1\n---\n')
    const saved = await repository.setDetails(snapshot, { title: 'The Salt Orchard', author: 'Ines Varga' })
    if (!saved.ok) throw new Error(saved.error)
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(
      '---\ntitle: The Salt Orchard\nlanguage: en\nschemaVersion: 1\nauthor: Ines Varga\n---\n',
    )
    expect(saved.value.root).toBe(root)
  })

  it('trims, keeps a title to one line, and leaves a key alone when nothing is typed', async () => {
    const { root, repository, snapshot } = await setup()
    const before = await readFile(join(root, 'project.md'), 'utf8')
    const unchanged = await repository.setDetails(snapshot, { title: '  ', author: '' })
    expect(unchanged.ok).toBe(true)
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(before)
    await repository.setDetails(snapshot, { title: '  The Salt\nOrchard  ' })
    expect(await readFile(join(root, 'project.md'), 'utf8')).toContain('title: The Salt Orchard\n')
  })

  it('quotes a title that YAML would otherwise misread', async () => {
    const { root, repository, snapshot } = await setup()
    await repository.setDetails(snapshot, { title: 'Salt: a novel #1' })
    const reopened = await repository.open(root)
    expect(reopened.ok && reopened.value.details.title).toBe('Salt: a novel #1')
  })
})
