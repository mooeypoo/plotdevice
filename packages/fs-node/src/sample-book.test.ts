import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareSampleBook } from './sample-book'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('the sample book', () => {
  it('is copied once, kept as the author left it, and put back as it was on starting over', async () => {
    const base = await mkdtemp(join(tmpdir(), 'plotdevice-sample-'))
    dirs.push(base)
    const source = join(base, 'bundled')
    await mkdir(join(source, 'manuscript'), { recursive: true })
    await writeFile(join(source, 'manuscript', 'frost.md'), 'The first frost.\n')
    const copy = join(base, 'app-data', 'sample', 'the-salt-orchard')
    expect(await prepareSampleBook(source, copy)).toBe(copy)
    await writeFile(join(copy, 'manuscript', 'frost.md'), 'Changed.\n')
    await writeFile(join(copy, 'notes.md'), 'Mine.\n')
    await prepareSampleBook(source, copy)
    expect(await readFile(join(copy, 'manuscript', 'frost.md'), 'utf8')).toBe('Changed.\n')
    await prepareSampleBook(source, copy, true)
    expect(await readFile(join(copy, 'manuscript', 'frost.md'), 'utf8')).toBe('The first frost.\n')
    await expect(readFile(join(copy, 'notes.md'))).rejects.toThrow()
    expect(await readFile(join(source, 'manuscript', 'frost.md'), 'utf8')).toBe('The first frost.\n')
  })
})
