import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { moveFile } from '../fs/move-file'
import { writeFileAtomically } from '../fs/write-text-file-atomically'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { watchProject, type ProjectChange, type ProjectWatcher } from './project-watcher'

let copy: SampleNovelCopy
let watcher: ProjectWatcher
let batches: (readonly ProjectChange[])[]

const at = (path: string): string => join(copy.root, ...path.split('/'))

/** Waits until a batch arrives, or long enough to be sure none will. */
async function nextBatches(quietMs = 600): Promise<(readonly ProjectChange[])[]> {
  const start = batches.length
  const deadline = Date.now() + 4000
  let lastCount = start
  let quietSince = Date.now()
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    if (batches.length !== lastCount) {
      lastCount = batches.length
      quietSince = Date.now()
    }
    if (Date.now() - quietSince >= quietMs) break
  }
  return batches.slice(start)
}

beforeEach(async () => {
  copy = await copySampleNovel()
  batches = []
  watcher = watchProject(copy.root, (changes) => batches.push(changes), { batchMs: 100 })
  await watcher.ready
})

afterEach(async () => {
  await watcher.close()
  await copy.remove()
})

describe('watchProject', () => {
  it('reports an edit made by another program', async () => {
    const path = 'manuscript/Part One/The Ferry.md'
    await writeFile(at(path), `${await readFile(at(path), 'utf8')}\nAn edit in Obsidian.\n`)
    expect(await nextBatches()).toEqual([[{ path, kind: 'changed' }]])
  })

  it('reports files added and removed, in one batch', async () => {
    await writeFile(at('notes/New idea.md'), 'An idea.\n')
    await rm(at('notes/Scene idea.md'))
    const reported = (await nextBatches()).flat()
    expect(reported).toEqual(
      expect.arrayContaining([
        { path: 'notes/New idea.md', kind: 'changed' },
        { path: 'notes/Scene idea.md', kind: 'removed' }
      ])
    )
    expect(reported).toHaveLength(2)
  })

  it('leaves out the app’s own writes and moves', async () => {
    const path = at('manuscript/Part One/The Ferry.md')
    await writeFileAtomically(path, `${await readFile(path, 'utf8')}\nTyped in the app.\n`)
    await moveFile(at('notes/Research.md'), at('notes/Moved/Research.md'))
    expect(await nextBatches()).toEqual([])
  })

  it('still reports an outside edit right after the app’s own write', async () => {
    const path = 'manuscript/Part One/The Ferry.md'
    await writeFileAtomically(at(path), 'Mine.\n')
    await new Promise((resolve) => setTimeout(resolve, 300))
    await writeFile(at(path), 'Theirs.\n')
    expect((await nextBatches()).flat()).toEqual([{ path, kind: 'changed' }])
  })

  it('ignores dot-folders and other kinds of files', async () => {
    await mkdir(at('.obsidian'), { recursive: true })
    await writeFile(at('.obsidian/workspace.md'), 'layout')
    await writeFile(at('notes/picture.png'), 'not markdown')
    expect(await nextBatches()).toEqual([])
  })
})
