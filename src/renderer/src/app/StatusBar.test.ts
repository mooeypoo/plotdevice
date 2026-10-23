// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import StatusBar from './StatusBar.vue'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkspaceStore } from './workspace-store'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await useManuscriptStore().load()
})

describe('StatusBar', () => {
  it('shows the chapter’s words, then whether anything needs attention, then the save state', async () => {
    await useEditorStore().open('The Ferry.md')
    const bar = mount(StatusBar)
    expect(bar.find('.attention').exists()).toBe(false)
    const workspace = useWorkspaceStore()
    if (workspace.project === null) throw new Error('Expected a project')
    workspace.project = {
      ...workspace.project,
      warnings: [{ code: 'format-newer', version: 99 }]
    }
    await flushPromises()
    const attention = bar.get('.attention')
    expect(attention.text()).toBe('⚠ 1')
    expect(attention.attributes('aria-label')).toBe('1 thing needs attention')
    expect(bar.findAll('.count, .attention, .save').map((part) => part.classes()[0])).toEqual([
      'count',
      'quiet',
      'save'
    ])
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(attention.attributes('aria-label')).toBe('1 דורש טיפול')
    await attention.trigger('click')
    expect(useWorkbenchNavigation().isViewShown('warnings')).toBe(true)
    bar.unmount()
    await useEditorStore().flush()
  })

  it('shows the manuscript’s words when no document is open', () => {
    const bar = mount(StatusBar)
    expect(bar.get('.count').text()).toMatch(/^Manuscript: /u)
    expect(bar.find('.save').exists()).toBe(false)
    bar.unmount()
  })
})
