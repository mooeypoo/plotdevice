// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createFakePlotDeviceApi, sampleSummary } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useLiveSync } from './use-live-sync'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>

const Host = defineComponent({
  setup() {
    useLiveSync()
    return () => null
  }
})

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await useManuscriptStore().load()
})

describe('useLiveSync', () => {
  it('refreshes the problems and the open chapter when files change outside', async () => {
    const manuscript = useManuscriptStore()
    await manuscript.open('First frost.md')
    const host = mount(Host)

    fake.summary.current = {
      ...sampleSummary,
      problems: [{ path: 'notes/Chapter #3.md', problem: 'name-breaks-links' }]
    }
    fake.files.set('First frost.md', 'New from git.\n')
    fake.emitChanges([
      { path: 'First frost.md', kind: 'changed' },
      { path: 'notes/Chapter #3.md', kind: 'changed' }
    ])
    await flushPromises()

    expect(useWorkspaceStore().project?.problems).toHaveLength(1)
    expect(manuscript.text).toBe('New from git.\n')

    // Unmounted: no longer listening.
    host.unmount()
    fake.files.set('First frost.md', 'Later.\n')
    fake.emitChanges([{ path: 'First frost.md', kind: 'changed' }])
    await flushPromises()
    expect(manuscript.text).toBe('New from git.\n')
  })
})
