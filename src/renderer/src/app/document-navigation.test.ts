// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from './codex-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'
import { useWorkbenchStore } from './workbench-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
  useDocumentTabsStore().restore('/book')
})
afterEach(() => vi.restoreAllMocks())

describe('guarded document navigation', () => {
  it('keeps writing available while browsing, editing codex entries and returning from project views', async () => {
    const editor = useEditorStore()
    const tabs = useDocumentTabsStore()
    await editor.open('The Ferry.md')
    tabs.togglePin('The Ferry.md')
    await editor.open('First frost.md')
    editor.edit('Reference annotation.')
    await editor.open('characters/Ilka.md', { keep: true })
    expect(tabs.writingPath).toBe('The Ferry.md')
    expect(fake.files.get('First frost.md')).toBe('Reference annotation.')
    useWorkbenchStore().centerView = 'timeline'
    await editor.returnToWriting()
    expect(editor.entry?.path).toBe('The Ferry.md')
    expect(useWorkbenchStore().centerView).toBe('write')
  })

  it('does not reopen the current document or discard its draft and selection state', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    const revision = editor.entry?.revision
    editor.edit('Still working.')
    await editor.open('The Ferry.md')
    expect(editor.entry?.revision).toBe(revision)
    expect(editor.text).toBe('Still working.')
    expect(useDocumentTabsStore().documents).toHaveLength(1)
    await editor.flush()
  })

  it('never evicts a conflicted draft through opening, cycling, closing or bulk close', async () => {
    const editor = useEditorStore()
    const tabs = useDocumentTabsStore()
    await editor.open('The Ferry.md')
    tabs.togglePin('The Ferry.md')
    await editor.open('First frost.md', { keep: true })
    editor.edit('Mine.')
    fake.files.set('First frost.md', 'Outside.')
    await editor.flush()
    const before = tabs.documents.map((tab) => tab.path)
    expect(await editor.returnToWriting()).toBe(false)
    expect(await editor.cycleDocument(1)).toBe(false)
    expect(await editor.closeDocument('First frost.md')).toBe(false)
    expect(await editor.closeOtherDocuments()).toBe(false)
    expect(tabs.documents.map((tab) => tab.path)).toEqual(before)
    expect(editor.text).toBe('Mine.')
    expect(editor.actionError).toContain('Resolve')
  })

  it('does not change tabs on failed reads and serializes rapid navigation', async () => {
    const editor = useEditorStore()
    const tabs = useDocumentTabsStore()
    await editor.open('The Ferry.md')
    const read = fake.api.manuscript.openEntry.bind(fake.api.manuscript)
    let finish: (() => void) | undefined
    const readSpy = vi.spyOn(fake.api.manuscript, 'openEntry').mockImplementation(async (path) => {
      if (path === 'First frost.md')
        await new Promise<void>((resolve) => {
          finish = resolve
        })
      return read(path)
    })
    const first = editor.open('First frost.md')
    await flushPromises()
    const second = editor.open('Lost.md')
    expect(editor.navigationBusy).toBe(true)
    finish?.()
    await Promise.all([first, second])
    expect(editor.entry?.path).toBe('Lost.md')
    expect(tabs.activePath).toBe('Lost.md')
    expect(editor.navigationBusy).toBe(false)
    readSpy.mockRestore()
    fake.files.delete('First frost.md')
    expect(await editor.open('First frost.md')).toBe(false)
    expect(tabs.activePath).toBe('Lost.md')
  })

  it('protects pinned and writing tabs, closes others without touching disk, and resets per-project state', async () => {
    const editor = useEditorStore()
    const tabs = useDocumentTabsStore()
    await editor.open('The Ferry.md')
    await editor.open('First frost.md', { keep: true })
    tabs.togglePin('First frost.md')
    await editor.open('Lost.md', { keep: true })
    expect(await editor.closeDocument('The Ferry.md')).toBe(false)
    expect(await editor.closeDocument('First frost.md')).toBe(false)
    expect(await editor.closeDocument('Lost.md')).toBe(true)
    expect(editor.entry?.path).toBe('First frost.md')
    expect(fake.files.has('Lost.md')).toBe(true)
    await useWorkspaceStore().backToWelcome()
    expect(tabs.documents).toEqual([])
    expect(tabs.writingPath).toBeNull()
    await useWorkspaceStore().openProject('/book')
    await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
    tabs.restore('/book')
    expect(tabs.documents.map((tab) => tab.path)).toEqual(['The Ferry.md', 'First frost.md'])
  })

  it('waits for pending navigation before leaving a project and refuses intervening property writes', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    const root = useWorkspaceStore().project?.root
    const read = fake.api.manuscript.openEntry.bind(fake.api.manuscript)
    let release: () => void = () => {
      throw new Error('Read not started')
    }
    vi.spyOn(fake.api.manuscript, 'openEntry').mockImplementation(async (path) => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return read(path)
    })
    const opening = editor.open('First frost.md')
    await flushPromises()
    expect(await useManuscriptStore().updateProperties({ status: 'final' })).toBe(false)
    expect(editor.actionError).toContain('Wait')
    const closing = useWorkspaceStore().backToWelcome()
    await flushPromises()
    expect(useWorkspaceStore().project?.root).toBe(root)
    release()
    await Promise.all([opening, closing])
    expect(useWorkspaceStore().project).toBeNull()
    expect(editor.entry).toBeNull()
    expect(useDocumentTabsStore().documents).toEqual([])
    vi.restoreAllMocks()
  })

  it('keeps an active missing draft, removes unavailable inactive tabs and follows recovery with Writing', async () => {
    const editor = useEditorStore()
    const tabs = useDocumentTabsStore()
    await editor.open('The Ferry.md')
    tabs.togglePin('The Ferry.md')
    await editor.open('First frost.md', { keep: true })
    await editor.returnToWriting()
    editor.edit('Recovered writing.')
    fake.files.delete('The Ferry.md')
    await editor.syncFromDisk([{ path: 'The Ferry.md', kind: 'removed' }])
    const book = useManuscriptStore().manuscript
    if (book === null) throw new Error('Expected manuscript')
    useManuscriptStore().manuscript = { ...book, parts: [], unordered: [], chapters: [] }
    tabs.refresh(editor.entry?.path ?? null)
    expect(tabs.documents.map((tab) => tab.path)).toEqual(['The Ferry.md'])
    expect(editor.text).toBe('Recovered writing.')
    expect(await editor.saveMissingAsNew()).toBe(true)
    expect(tabs.writingPath).toBe('The Ferry (recovered).md')
    expect(tabs.writing?.pinned).toBe(true)
    expect(tabs.documents.find((tab) => tab.path === tabs.writingPath)?.temporary).toBe(false)
    expect(fake.files.has('The Ferry.md')).toBe(false)
  })
})
