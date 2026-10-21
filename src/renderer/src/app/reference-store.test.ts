import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('independent references', () => {
  it('opens characters, locations, notes and chapters without replacing or saving the draft', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    const current = editor.entry
    editor.edit('Still writing.')
    editor.saveState = 'conflict'
    const reference = useReferenceStore()
    const layout = useLayoutStore()
    layout.inspectorOpen = false
    layout.outlinePath = 'Outline.md'
    for (const path of [
      'characters/Ilka.md',
      'locations/Marrow.md',
      'notes/Research.md',
      'First frost.md'
    ]) {
      reference.open(path)
      await flushPromises()
      expect(reference.entry?.path).toBe(path)
      expect(reference.text).toBe(fake.files.get(path))
      expect(reference.loading).toBe(false)
      expect(editor.entry).toEqual(current)
      expect(editor.text).toBe('Still writing.')
      expect(editor.saveState).toBe('conflict')
    }
    expect(fake.saves).toEqual([])
    expect(useManuscriptStore().properties?.path).toBe('The Ferry.md')
    expect(useCodexStore().properties).toBeNull()
    expect([layout.inspectorOpen, layout.rightTab]).toEqual([true, 'reference'])
    expect(layout.outlinePath).toBe('Outline.md')
  })

  it('clears old content immediately and rejects obsolete A → B → A reads', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    await flushPromises()
    const pending: ((result: Awaited<ReturnType<typeof fake.api.codex.openEntry>>) => void)[] = []
    vi.spyOn(fake.api.codex, 'openEntry').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    reference.open('notes/Research.md')
    expect(reference.text).toBeNull()
    await flushPromises()
    reference.open('characters/Ilka.md')
    await flushPromises()
    reference.open('notes/Research.md')
    await flushPromises()
    const success = (text: string): Awaited<ReturnType<typeof fake.api.codex.openEntry>> => ({
      ok: true,
      value: { path: 'notes/Research.md', text, version: 'v1', wordCount: 1 }
    })
    pending[2]?.(success('Newest'))
    await flushPromises()
    pending[0]?.(success('Obsolete'))
    pending[1]?.(success('Other character'))
    await flushPromises()
    expect(reference.text).toBe('Newest')
    expect(reference.entry?.title).toBe('Research')
  })

  it('follows listing refreshes and shows errors instead of stale content', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    await flushPromises()
    fake.files.set('characters/Ilka.md', 'Updated elsewhere.')
    await useCodexStore().reload()
    await flushPromises()
    expect(reference.text).toBe('Updated elsewhere.')
    fake.files.delete('characters/Ilka.md')
    await useCodexStore().reload()
    await flushPromises()
    expect(reference.text).toBeNull()
    expect(reference.error).toBe('gone')
    expect(reference.loading).toBe(false)
  })

  it('follows app renames and moves, retaining the reference scroll position', async () => {
    const reference = useReferenceStore()
    reference.open('The Ferry.md')
    await flushPromises()
    reference.rememberScroll(125)
    useEditorStore().followMove('The Ferry.md', 'First frost.md')
    await flushPromises()
    expect(reference.entry?.path).toBe('First frost.md')
    expect(reference.scrollTop()).toBe(125)
    reference.open('characters/Ilka.md')
    await flushPromises()
    reference.rememberScroll(42)
    reference.open('First frost.md')
    await flushPromises()
    expect(reference.scrollTop()).toBe(125)
  })

  it('clears project-scoped references and ignores reads completing after project close', async () => {
    const pending: ((result: Awaited<ReturnType<typeof fake.api.codex.openEntry>>) => void)[] = []
    vi.spyOn(fake.api.codex, 'openEntry').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    reference.rememberScroll(80)
    await flushPromises()
    await useWorkspaceStore().backToWelcome()
    pending[0]?.({
      ok: true,
      value: { path: 'characters/Ilka.md', text: 'Old project', version: 'v1', wordCount: 2 }
    })
    await flushPromises()
    expect(reference.entry).toBeNull()
    expect(reference.text).toBeNull()
    expect(reference.loading).toBe(false)
    expect(reference.scrollTop()).toBe(0)
  })
})
