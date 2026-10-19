// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import InspectorPanel from './InspectorPanel.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useManuscriptStore().load()
})

describe('InspectorPanel', () => {
  it('locks the fields of a file that was deleted outside the app', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    const panel = mount(InspectorPanel)
    await flushPromises()
    const title = (): HTMLInputElement => panel.get<HTMLInputElement>('#inspector-title').element
    expect(title().disabled).toBe(false)

    fake.files.delete('First frost.md')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'removed' }])
    await flushPromises()
    expect(title().disabled).toBe(true)
  })
})
