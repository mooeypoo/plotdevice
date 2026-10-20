// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import EditorPane from './EditorPane.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useManuscriptStore().load()
})

// CodeMirror needs real layout; the pane's banners are what's under test.
const mountPane = (): ReturnType<typeof mount> =>
  mount(EditorPane, { global: { stubs: { ChapterEditor: true, ProjectOverview: true } } })

describe('EditorPane', () => {
  it('says when the text was updated from disk', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    const pane = mountPane()
    fake.files.set('First frost.md', 'From Obsidian.\n')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'changed' }])
    await flushPromises()
    expect(pane.text()).toContain('Updated from disk')
  })

  it('offers to keep the text of a file deleted outside', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    store.edit('Keep me.\n')
    const pane = mountPane()
    fake.files.delete('First frost.md')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'removed' }])
    await flushPromises()
    expect(pane.text()).toContain('This file is gone.')

    const save = pane.findAll('button').find((button) => button.text() === 'Save recovered copy')
    await save?.trigger('click')
    await flushPromises()
    expect(fake.files.get('First frost (recovered).md')).toBe('Keep me.\n')
    expect(fake.files.has('First frost.md')).toBe(false)
    expect(pane.text()).not.toContain('This file is gone.')
  })

  it('shows the conflict banner for unsaved typing and an outside edit', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    store.edit('Mine.\n')
    const pane = mountPane()
    fake.files.set('First frost.md', 'Theirs.\n')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'changed' }])
    await flushPromises()
    expect(pane.text()).toContain('Changed outside Plot Device.')
    expect(pane.findAll('button').map((button) => button.text())).toEqual(
      expect.arrayContaining(['Use disk version', 'Save recovered copy', 'Replace disk text…'])
    )
  })

  it('disables all decisions and freezes the editor while a copy is being written', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    store.edit('Keep this draft\n')
    fake.files.delete('First frost.md')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'removed' }])
    const original = fake.api.recovery.saveCopy.bind(fake.api.recovery)
    let release: () => void = () => {
      throw new Error('Recovery did not start')
    }
    const copy = vi.spyOn(fake.api.recovery, 'saveCopy').mockImplementation(async (...args) => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return original(...args)
    })
    const pane = mountPane()
    await pane
      .findAll('button')
      .find((button) => button.text() === 'Save recovered copy')
      ?.trigger('click')
    expect(
      pane.findAll('.banner button').every((button) => button.attributes('disabled') !== undefined)
    ).toBe(true)
    expect(pane.getComponent({ name: 'ChapterEditor' }).props('readOnly')).toBe(true)
    release()
    await flushPromises()
    expect(pane.getComponent({ name: 'ChapterEditor' }).props('readOnly')).toBe(false)
    copy.mockRestore()
    pane.unmount()
  })
})
