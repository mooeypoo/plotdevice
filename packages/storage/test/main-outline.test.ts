import { createFileStore, createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRepository } from '../src/index'
import { readProject } from '../src/read-project'

// The book's main outline (ADR 0012): named in project.md, so it travels with the book.
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function mainOutlineIn(projectFile: string) {
  const root = await mkdtemp(join(tmpdir(), 'plotdevice-main-outline-'))
  dirs.push(root)
  for (const [path, text] of Object.entries({ 'CONTENTS.md': '# Book\n', 'project.md': projectFile })) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  const opened = await readProject(root, createFileStore(root), [])
  if (!opened.ok) throw new Error(opened.error)
  return { mainOutline: opened.value.details.mainOutline, warnings: opened.value.warnings }
}

describe('reading the main outline from project.md', () => {
  it('reads the outline it names, in Hebrew too', async () => {
    expect(await mainOutlineIn('---\ntitle: A\nmainOutline: outlines/main-story.md\n---\n')).toEqual({
      mainOutline: 'outlines/main-story.md',
      warnings: [],
    })
    expect((await mainOutlineIn('---\ntitle: A\nmainOutline: outlines/העלילה.md\n---\n')).mainOutline).toBe('outlines/העלילה.md')
  })

  it('treats a missing key, or anything that isn’t an outline file, as not set, without a warning', async () => {
    for (const value of [
      '',
      'mainOutline: characters/ilka.md\n',
      'mainOutline: ../outside/x.md\n',
      'mainOutline: outlines/notes.txt\n',
      'mainOutline: [a, b]\n',
    ])
      expect(await mainOutlineIn(`---\ntitle: A\n${value}---\n`)).toEqual({ mainOutline: null, warnings: [] })
  })
})

describe('writing the main outline to project.md', () => {
  it('adds, then changes, only the mainOutline line; everything else stays byte for byte', async () => {
    const original = '---\ntitle: A\n# my own note\nlanguage: he\nunknownKey: kept\n---\nThe author’s notes.\n'
    const root = await mkdtemp(join(tmpdir(), 'plotdevice-main-outline-'))
    dirs.push(root)
    for (const [path, text] of Object.entries({ 'CONTENTS.md': '# Book\n', 'project.md': original })) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), text)
    }
    const repository = createProjectRepository({
      folders: createProjectFolders(),
      journals: createJournalStore(join(root, '..', `${basename(root)}-app-data`)),
      ids: { next: (prefix) => `${prefix}-1` },
    })
    const opened = await repository.open(root)
    if (!opened.ok) throw new Error(opened.error)
    const first = await repository.setMainOutline(opened.value, 'outlines/main-story.md' as ProjectPath)
    expect(first.ok && first.value.details.mainOutline).toBe('outlines/main-story.md')
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(
      original.replace('---\nThe', 'mainOutline: outlines/main-story.md\n---\nThe'),
    )
    if (!first.ok) return
    const second = await repository.setMainOutline(first.value, 'outlines/הדרך של ביה.md' as ProjectPath)
    expect(second.ok && second.value.details.mainOutline).toBe('outlines/הדרך של ביה.md')
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(
      original.replace('---\nThe', 'mainOutline: outlines/הדרך של ביה.md\n---\nThe'),
    )
  })
})
