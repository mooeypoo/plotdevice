import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { AUTOSAVE_DELAY_MS, useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useManuscriptStore().load()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('manuscript store', () => {
  it('opens a chapter with its place in the book', async () => {
    const store = useManuscriptStore()
    await store.open('First night.md')
    expect(store.entry).toMatchObject({
      kind: 'chapter',
      title: 'First night',
      label: 'Part I · Chapter 2'
    })
    expect(store.text).toBe('Four words are here.\n')
    expect(store.currentPart?.title).toBe('Part One: The Harbor')
  })

  it('opens a part’s own text, and an unordered chapter', async () => {
    const store = useManuscriptStore()
    await store.open('Part One.md')
    expect(store.entry).toMatchObject({ kind: 'part', label: 'Part I' })
    await store.open('Lost.md')
    expect(store.entry).toMatchObject({ kind: 'chapter', label: 'Unordered' })
  })

  it('autosaves after a pause, and updates chapter, part, and book word counts', async () => {
    const store = useManuscriptStore()
    await store.open('Arrival.md')

    store.edit('Now there are five words.\n')
    expect(store.saveState).toBe('unsaved')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 10)

    expect(fake.files.get('Arrival.md')).toBe('Now there are five words.\n')
    expect(store.saveState).toBe('saved')
    expect(store.wordCount).toBe(5)
    expect(store.manuscript?.parts[0]?.chapters[0]?.wordCount).toBe(5)
    expect(store.manuscript?.parts[0]?.wordCount).toBe(11)
    expect(store.manuscript?.wordCount).toBe(12)
  })

  it('does not save text that matches the file', async () => {
    const store = useManuscriptStore()
    await store.open('Arrival.md')
    store.edit('Three words here!\n')
    store.edit('Three words here.\n')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 10)
    expect(fake.saves).toEqual([])
    expect(store.saveState).toBe('saved')
  })

  it('saves the current chapter before opening another', async () => {
    const store = useManuscriptStore()
    await store.open('Arrival.md')
    store.edit('Changed.\n')
    await store.open('First night.md')
    expect(fake.files.get('Arrival.md')).toBe('Changed.\n')
  })

  it('stops at a conflict, keeps the writer’s text, and refuses to switch away', async () => {
    const store = useManuscriptStore()
    await store.open('Arrival.md')
    fake.files.set('Arrival.md', 'Edited in Obsidian.\n')

    store.edit('Mine.\n')
    await store.flush()

    expect(store.saveState).toBe('conflict')
    expect(fake.files.get('Arrival.md')).toBe('Edited in Obsidian.\n')
    expect(store.text).toBe('Mine.\n')
    expect(await store.open('First night.md')).toBe(false)
    expect(store.entry?.path).toBe('Arrival.md')
  })

  it('resolves a conflict by keeping the writer’s text', async () => {
    const store = useManuscriptStore()
    await store.open('Arrival.md')
    fake.files.set('Arrival.md', 'Edited in Obsidian.\n')
    store.edit('Mine.\n')
    await store.flush()

    await store.keepMine()

    expect(fake.files.get('Arrival.md')).toBe('Mine.\n')
    expect(store.saveState).toBe('saved')
  })

  it('resolves a conflict by loading the file’s version', async () => {
    const store = useManuscriptStore()
    await store.open('Arrival.md')
    const revision = store.entry?.revision
    fake.files.set('Arrival.md', 'Edited in Obsidian.\n')
    store.edit('Mine.\n')
    await store.flush()

    await store.loadVersionOnDisk()

    expect(store.text).toBe('Edited in Obsidian.\n')
    expect(store.saveState).toBe('saved')
    expect(store.entry?.revision).not.toBe(revision)
  })
})
