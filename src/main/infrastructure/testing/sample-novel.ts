import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FIXTURE = join(import.meta.dirname, '../../../../fixtures/sample-novel')

/** A disposable copy of fixtures/sample-novel, so infrastructure tests can touch real files. */
export interface SampleNovelCopy {
  readonly root: string
  remove(): Promise<void>
}

/** Copies the fixture into a fresh temp folder. */
export async function copySampleNovel(): Promise<SampleNovelCopy> {
  const parent = await mkdtemp(join(tmpdir(), 'plotdevice-test-'))
  const root = join(parent, 'sample-novel')
  await cp(FIXTURE, root, { recursive: true })
  return { root, remove: () => rm(parent, { recursive: true, force: true }) }
}

/** A fresh, empty temp folder. */
export async function makeTempFolder(): Promise<SampleNovelCopy> {
  const root = await mkdtemp(join(tmpdir(), 'plotdevice-test-'))
  return { root, remove: () => rm(root, { recursive: true, force: true }) }
}
