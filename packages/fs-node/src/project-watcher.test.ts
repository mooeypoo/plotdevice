import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { watchProject, type FileChange, type ProjectWatcher } from './project-watcher'

let dir = ''
let watcher: ProjectWatcher | undefined
afterEach(async () => {
  await watcher?.close()
  await rm(dir, { recursive: true, force: true })
})

/** Watches a fresh folder and collects what it reports. */
async function watching(): Promise<{ changes: FileChange[]; next: (match: (change: FileChange) => boolean) => Promise<FileChange> }> {
  dir = await mkdtemp(join(tmpdir(), 'plotdevice-watch-'))
  await mkdir(join(dir, 'manuscript'))
  await writeFile(join(dir, 'manuscript/frost.md'), 'Frost.\n')
  const changes: FileChange[] = []
  const waiters: { match: (change: FileChange) => boolean; resolve: (change: FileChange) => void }[] = []
  watcher = watchProject(dir, (change) => {
    changes.push(change)
    for (const waiter of waiters.filter((w) => w.match(change))) waiter.resolve(change)
  })
  await watcher.ready
  const next = (match: (change: FileChange) => boolean) =>
    new Promise<FileChange>((resolve, reject) => {
      const found = changes.find(match)
      if (found) return resolve(found)
      waiters.push({ match, resolve })
      setTimeout(() => reject(new Error(`no matching change; saw ${JSON.stringify(changes)}`)), 5000)
    })
  return { changes, next }
}

describe('watching a project folder', () => {
  it('reports a chapter changed by another program, with a project path', async () => {
    const { next } = await watching()
    await writeFile(join(dir, 'manuscript/frost.md'), 'Changed elsewhere.\n')
    expect(await next((c) => c.path === 'manuscript/frost.md')).toMatchObject({ path: 'manuscript/frost.md' })
  })

  it('reports new Markdown files, including Hebrew names', async () => {
    const { next } = await watching()
    await writeFile(join(dir, 'manuscript/כפור.md'), 'כפור.\n')
    expect(await next((c) => c.path === 'manuscript/כפור.md')).toEqual({ kind: 'added', path: 'manuscript/כפור.md' })
  })

  it('ignores other files, hidden folders and temporary files', async () => {
    const { changes, next } = await watching()
    await mkdir(join(dir, '.git'))
    await writeFile(join(dir, '.git/notes.md'), 'x')
    await writeFile(join(dir, 'manuscript/.frost.md.1234.tmp'), 'x')
    await writeFile(join(dir, 'cover.png'), 'x')
    await writeFile(join(dir, 'manuscript/marker.md'), 'x')
    await next((c) => c.path === 'manuscript/marker.md')
    expect(changes.map((c) => c.path)).toEqual(['manuscript/marker.md'])
  })
})
