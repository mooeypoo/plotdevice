import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { createFileAtomically } from './create-file-atomically'

let fixture: SampleNovelCopy
beforeEach(async () => {
  fixture = await copySampleNovel()
})
afterEach(async () => {
  await fixture.remove()
})

describe('createFileAtomically', () => {
  it('publishes complete bytes and removes its temporary file', async () => {
    const path = join(fixture.root, 'Recovered.md')
    const bytes = new TextEncoder().encode('---\ntype: note\n---\nRecovered.\n')
    expect(await createFileAtomically(path, bytes)).toEqual({ ok: true, value: undefined })
    expect(new Uint8Array(await readFile(path))).toEqual(bytes)
    expect(
      (await readdir(fixture.root)).filter((name) => name.includes('.plotdevice-recovery-'))
    ).toEqual([])
  })

  it('never replaces an existing destination', async () => {
    const path = join(fixture.root, 'Occupied.md')
    await writeFile(path, 'Outside version')
    expect(await createFileAtomically(path, new TextEncoder().encode('Draft'))).toMatchObject({
      ok: false,
      error: { code: 'already-exists' }
    })
    expect(await readFile(path, 'utf8')).toBe('Outside version')
  })

  it('allows only one of two competing publications to win', async () => {
    const path = join(fixture.root, 'Race.md')
    const results = await Promise.all(
      ['First', 'Second'].map((text) => createFileAtomically(path, new TextEncoder().encode(text)))
    )
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(
      results.filter((result) => !result.ok && result.error.code === 'already-exists')
    ).toHaveLength(1)
    expect(['First', 'Second']).toContain(await readFile(path, 'utf8'))
    expect(
      (await readdir(fixture.root)).filter((name) => name.includes('.plotdevice-recovery-'))
    ).toEqual([])
  })
})
