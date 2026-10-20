// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import OutlinePanel from './OutlinePanel.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  fake.files.set('Outline.md', '# Working outline\n\n- **Arrival**: [[The Ferry]]')
  await Promise.all([useCodexStore().load(), useManuscriptStore().load()])
})

describe('OutlinePanel', () => {
  it('renders the reference, edits raw Markdown, then remounts the updated reading view', async () => {
    const wrapper = mount(OutlinePanel)
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Working outline')
    expect(wrapper.get('strong').text()).toBe('Arrival')
    expect(wrapper.get('.file-path').text()).toBe('Outline.md')
    await wrapper.get('header button').trigger('click')
    await flushPromises()
    expect(useEditorStore().text).toContain('# Working outline')
    expect(wrapper.find('.view').exists()).toBe(false)
    useEditorStore().edit('## Revised plan\n\n*New direction*')
    await useEditorStore().open('The Ferry.md')
    await flushPromises()
    expect(wrapper.get('h2').text()).toBe('Revised plan')
    expect(wrapper.get('em').text()).toBe('New direction')
    wrapper.unmount()
  })

  it('pairs dropdown labels with their paths and bodies in both directions', async () => {
    await fake.api.codex.createOutline('Clue ledger')
    fake.files.set('Clue ledger.md', '## Clues\n\nThe missing key.')
    await useCodexStore().reload()
    const wrapper = mount(OutlinePanel)
    await flushPromises()
    const choose = wrapper.get('select')
    for (const path of ['Clue ledger.md', 'Outline.md', 'Clue ledger.md']) {
      await choose.setValue(path)
      await flushPromises()
      expect(wrapper.get('.file-path').text()).toBe(path)
      expect(wrapper.get('.view').text()).toContain(
        path === 'Clue ledger.md' ? 'The missing key.' : 'Arrival'
      )
    }
    wrapper.unmount()
  })
})
