import { err, ok, type Result } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { Revision } from '../ports/file-store'
import { createChapterAutosave, type SaveStatus, type WriteChapter } from './chapter-autosave'

const rev = (n: number | string) => `r${n}` as Revision

/** A writer that records what was asked of it; `gate` holds each write open until released. */
function recordingWriter(options: { failWith?: 'stale' | 'write-failed'; slow?: boolean } = {}) {
  let inFlight = 0
  const log = { maxInFlight: 0, written: [] as string[], expected: [] as Revision[], released: [] as (() => void)[] }
  let disk = 0
  const write: WriteChapter = async (text, expected): Promise<Result<Revision, 'stale' | 'write-failed'>> => {
    inFlight++
    log.maxInFlight = Math.max(log.maxInFlight, inFlight)
    log.expected.push(expected)
    if (options.slow) await new Promise<void>((resolve) => log.released.push(resolve))
    else await Promise.resolve()
    inFlight--
    if (options.failWith) return err(options.failWith)
    log.written.push(text)
    return ok(rev(`${++disk}:${text}`))
  }
  return { write, log }
}

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe('chapter autosave', () => {
  it('100 rapid saves: one write at a time, never older after newer, chained revisions, last one wins', async () => {
    const { write, log } = recordingWriter()
    const autosave = createChapterAutosave(write, rev('loaded'))
    for (let i = 0; i < 100; i++) autosave.save(`version ${String(i).padStart(3, '0')}`)
    await autosave.idle()
    expect(log.maxInFlight).toBe(1)
    expect(log.written.at(-1)).toBe('version 099')
    expect(log.written).toEqual([...log.written].sort())
    expect(log.written.length).toBeLessThan(100) // coalesced
    expect(log.expected[0]).toBe('rloaded')
    for (let i = 1; i < log.expected.length; i++) expect(log.expected[i]).toBe(`r${i}:${log.written[i - 1]}`)
    expect(autosave.status()).toEqual({ kind: 'saved', revision: rev(`${log.written.length}:version 099`) })
  })

  it('reports "saved" only once the write is confirmed', async () => {
    const { write, log } = recordingWriter({ slow: true })
    const autosave = createChapterAutosave(write, rev('loaded'))
    const statuses: SaveStatus['kind'][] = []
    autosave.onStatus((status) => statuses.push(status.kind))
    autosave.save('text')
    await flushMicrotasks()
    expect(autosave.status().kind).toBe('saving')
    log.released.shift()?.()
    await autosave.idle()
    expect(statuses).toEqual(['unsaved', 'saving', 'saved'])
  })

  it('stops on a conflict, keeps the newest text, and writes nothing more until it is resolved', async () => {
    const { write, log } = recordingWriter({ failWith: 'stale' })
    const autosave = createChapterAutosave(write, rev('loaded'))
    autosave.save('first')
    await autosave.idle()
    expect(autosave.status()).toEqual({ kind: 'conflict', unsaved: 'first' })
    autosave.save('typed after the conflict')
    await autosave.idle()
    expect(autosave.status()).toEqual({ kind: 'conflict', unsaved: 'typed after the conflict' })
    expect(log.expected).toHaveLength(1)
  })

  it('resumes after the conflict is resolved, expecting the revision on disk', async () => {
    const stale = recordingWriter({ failWith: 'stale' })
    let writer = stale.write
    const autosave = createChapterAutosave((text, expected) => writer(text, expected), rev('loaded'))
    autosave.save('mine')
    await autosave.idle()
    const fresh = recordingWriter()
    writer = fresh.write
    autosave.reset(rev('theirs'))
    expect(autosave.status()).toEqual({ kind: 'saved', revision: rev('theirs') })
    autosave.save('after')
    await autosave.idle()
    expect(fresh.log.expected).toEqual([rev('theirs')])
  })

  it('reports a failed save, keeps the text, and tries again on the next change', async () => {
    let fail = true
    const autosave = createChapterAutosave(async (text) => (fail ? err('write-failed' as const) : ok(rev(text))), rev('loaded'))
    autosave.save('one')
    await autosave.idle()
    expect(autosave.status()).toEqual({ kind: 'failed', unsaved: 'one' })
    fail = false
    autosave.save('two')
    await autosave.idle()
    expect(autosave.status()).toEqual({ kind: 'saved', revision: rev('two') })
  })

  it('idle() waits for text queued while waiting', async () => {
    const { write, log } = recordingWriter({ slow: true })
    const autosave = createChapterAutosave(write, rev('loaded'))
    const statuses: SaveStatus['kind'][] = []
    autosave.onStatus((status) => statuses.push(status.kind))
    autosave.save('a')
    const idle = autosave.idle()
    await flushMicrotasks()
    autosave.save('b')
    log.released.shift()?.()
    await flushMicrotasks()
    log.released.shift()?.()
    await idle
    expect(log.written).toEqual(['a', 'b'])
    expect(statuses).toEqual(['unsaved', 'saving', 'saved']) // never "saved" while 'b' was waiting
    expect(autosave.unsavedText()).toBeNull()
  })

  it('knows when there is nothing unsaved', async () => {
    const { write } = recordingWriter()
    const autosave = createChapterAutosave(write, rev('loaded'))
    expect(autosave.unsavedText()).toBeNull()
    autosave.save('x')
    expect(autosave.unsavedText()).toBe('x')
    await autosave.idle()
    expect(autosave.unsavedText()).toBeNull()
  })

  it('runs an exclusive task between writes, then saves from the revision it left', async () => {
    const { write, log } = recordingWriter({ slow: true })
    const autosave = createChapterAutosave(write, rev('loaded'))
    const order: string[] = []
    autosave.save('a')
    const task = autosave.exclusive(async (revision) => {
      order.push(`task saw ${revision}`)
      return { revision: rev('renamed'), value: 'done' }
    })
    await flushMicrotasks()
    expect(order).toEqual([]) // waits for the write in progress
    log.released.shift()?.()
    expect(await task).toBe('done')
    expect(order).toEqual(['task saw r1:a'])
    autosave.save('b')
    await flushMicrotasks()
    log.released.shift()?.()
    await autosave.idle()
    expect(log.expected).toEqual([rev('loaded'), rev('renamed')])
    expect(autosave.status()).toEqual({ kind: 'saved', revision: rev('2:b') })
  })

  it('holds text as a conflict when told the editor was behind', async () => {
    const { write, log } = recordingWriter()
    const autosave = createChapterAutosave(write, rev('loaded'))
    autosave.conflict('typed before a reload')
    autosave.save('more')
    await autosave.idle()
    expect(autosave.status()).toEqual({ kind: 'conflict', unsaved: 'more' })
    expect(log.expected).toEqual([])
  })
})
