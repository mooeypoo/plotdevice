import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseProjectPath } from '../../shared-kernel/project-path'
import * as atomicWriter from '../fs/write-text-file-atomically'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { createEntryFiles } from './entry-files'

let fixture: SampleNovelCopy
const parsed = parseProjectPath('notes/יעל.md')
if (!parsed.ok) throw new Error('Invalid fixture path')
const path = parsed.value

beforeEach(async () => {
  fixture = await copySampleNovel()
})
afterEach(async () => {
  vi.restoreAllMocks()
  await fixture.remove()
})

describe('semantic file failures', () => {
  it('retains a failed creation path and exact technical detail without publishing a file', async () => {
    vi.spyOn(atomicWriter, 'writeFileAtomically').mockRejectedValue(new Error('EACCES (יעל)'))
    expect(await createEntryFiles(fixture.root).createFile(path, 'New file')).toMatchObject({
      ok: false,
      error: {
        code: 'write-failed',
        diagnostic: { reason: 'file-create-failed', path, detail: 'EACCES (יעל)' }
      }
    })
    await expect(readFile(join(fixture.root, path))).rejects.toThrow()
  })

  it('retains the path and exact write error while leaving existing bytes untouched', async () => {
    const source = '---\ntype: note\ncustom: true # keep\n---\nOriginal\n'
    const osPath = join(fixture.root, path)
    await writeFile(osPath, source)
    const files = createEntryFiles(fixture.root)
    const read = await files.readText(path)
    if (!read.ok) throw new Error('Expected read')
    vi.spyOn(atomicWriter, 'writeFileAtomically').mockRejectedValue(new Error('ENOSPC (disk full)'))
    expect(await files.writeText(path, 'My draft', read.value.version)).toMatchObject({
      ok: false,
      error: {
        code: 'write-failed',
        diagnostic: {
          reason: 'file-write-failed',
          path,
          detail: 'ENOSPC (disk full)'
        }
      }
    })
    expect(await readFile(osPath, 'utf8')).toBe(source)
  })

  it.each([
    ['---\ntype: note\n', 'unclosed'],
    ['---\nbad: [\n---\nOriginal\n', 'unparseable']
  ] as const)('preserves unsafe-write reason %s without writing', async (source, problem) => {
    const osPath = join(fixture.root, path)
    await writeFile(osPath, source)
    expect(await createEntryFiles(fixture.root).writeText(path, 'Draft', undefined)).toMatchObject({
      ok: false,
      error: {
        code: 'unreadable',
        diagnostic: {
          reason: 'file-unsafe',
          path,
          operation: 'write',
          problem
        }
      }
    })
    expect(await readFile(osPath, 'utf8')).toBe(source)
  })

  it('retains missing-file, invalid-encoding and stale-version distinctions', async () => {
    const files = createEntryFiles(fixture.root)
    expect(await files.readText(path)).toMatchObject({
      ok: false,
      error: { code: 'not-found', diagnostic: { reason: 'file-missing', path } }
    })
    const osPath = join(fixture.root, path)
    await writeFile(osPath, Uint8Array.of(0xff))
    expect(await files.readText(path)).toMatchObject({
      ok: false,
      error: {
        code: 'unreadable',
        diagnostic: {
          reason: 'file-unsafe',
          path,
          operation: 'read',
          problem: 'invalid-encoding'
        }
      }
    })
    await writeFile(osPath, 'Original')
    expect(await files.writeText(path, 'Draft', 'stale')).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk', diagnostic: { reason: 'file-changed', path } }
    })
    expect(await readFile(osPath, 'utf8')).toBe('Original')
  })
})
