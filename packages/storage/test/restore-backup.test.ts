import { createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRepository, type RepositoryOptions } from '../src/index'

// Replacing a book with a backup (Milestone 20): through the recovery journal (ADR 0005), so an
// interruption is finished on the next open, and nothing the backup doesn't have is removed.
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const NOW = {
  'project.md': '---\ntitle: The Salt Orchard\nid: prj-1\n---\n',
  'CONTENTS.md': '# The Salt Orchard\n\n- [Frost](manuscript/frost.md)\n- [Later](manuscript/later.md)\n',
  'manuscript/frost.md': '---\ntitle: Frost\nid: ch-1\n---\nRewritten, and worse.\n',
  'manuscript/later.md': '---\ntitle: Later\nid: ch-2\n---\nWritten after the backup.\n',
}
const BACKUP = [
  { path: 'project.md', text: NOW['project.md'], hasBom: false },
  { path: 'CONTENTS.md', text: '# The Salt Orchard\n\n- [Frost](manuscript/frost.md)\n- [Gone](manuscript/gone.md)\n', hasBom: false },
  { path: 'manuscript/frost.md', text: '---\ntitle: Frost\nid: ch-1\n---\nThe first frost.\r\n', hasBom: true },
  { path: 'manuscript/gone.md', text: '---\ntitle: Gone\nid: ch-3\n---\nDeleted since.\n', hasBom: false },
].map((file) => ({ ...file, path: file.path as ProjectPath }))

async function book(options: Partial<RepositoryOptions> = {}) {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-restore-'))
  dirs.push(base)
  const root = join(base, 'The Salt Orchard')
  for (const [path, text] of Object.entries(NOW)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  let n = 0
  const make = (more: Partial<RepositoryOptions> = {}) =>
    createProjectRepository({
      folders: createProjectFolders(),
      journals: createJournalStore(join(base, 'app-data')),
      ids: { next: (prefix) => `${prefix}-${++n}` },
      ...options,
      ...more,
    })
  const opened = await make().open(root)
  if (!opened.ok) throw new Error(opened.error)
  const bytes = (path: string) => readFile(join(root, path))
  return { root, snapshot: opened.value, make, bytes }
}

const encoded = (file: (typeof BACKUP)[number]) => Buffer.from((file.hasBom ? '﻿' : '') + file.text, 'utf8')

describe('replacing a book with a backup', () => {
  it('writes the backup’s files back byte for byte, brings back deleted ones, and keeps newer ones', async () => {
    const { snapshot, make, bytes } = await book()
    const restored = await make().restoreFiles(snapshot, BACKUP)
    expect(restored.ok).toBe(true)
    for (const file of BACKUP) expect(await bytes(file.path)).toEqual(encoded(file))
    // Written after the backup: kept, now outside the book's contents.
    expect((await bytes('manuscript/later.md')).toString()).toBe(NOW['manuscript/later.md'])
    expect(restored.ok && restored.value.chapters.find((chapter) => chapter.file === 'manuscript/later.md')?.listed).toBe(false)
  })

  it('changes nothing when the book already matches', async () => {
    const { snapshot, make } = await book()
    const same = Object.entries(NOW).map(([path, text]) => ({ path: path as ProjectPath, text, hasBom: false }))
    expect((await make().restoreFiles(snapshot, same)).ok).toBe(true)
  })

  it('an interruption is finished from the journal when the book opens again', async () => {
    const { root, snapshot, make, bytes } = await book()
    const crashing = make({ crashAt: (point) => point === 'step-0' })
    await expect(crashing.restoreFiles(snapshot, BACKUP)).rejects.toThrow('simulated crash')
    const reopened = await make().open(root)
    expect(reopened.ok && reopened.value.recovered.map((outcome) => outcome.outcome)).toEqual(['completed'])
    for (const file of BACKUP) expect(await bytes(file.path)).toEqual(encoded(file))
  })
})
