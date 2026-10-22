// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { plotDeviceApi } from './plot-device-api'
import ProjectLayout from './ProjectLayout.vue'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore } from './workbench-store'
import { useWorkspaceStore } from './workspace-store'

/** A profile from before the workbench (pre-W1): the old shell's keys and nothing newer. */
function preWorkbenchProfile(): void {
  localStorage.setItem(
    'plotdevice.layout',
    JSON.stringify({
      binderOpen: false,
      inspectorOpen: true,
      sideTab: 'codex',
      rightTab: 'outline',
      outlinePath: 'Outline.md'
    })
  )
  localStorage.setItem(
    'plotdevice.writingPreferences',
    JSON.stringify({
      version: 1,
      fontSize: 19,
      lineWidth: 66,
      outlineWidth: 480,
      collapsedParts: {}
    })
  )
  localStorage.setItem(
    'plotdevice.lastEntry',
    JSON.stringify({ '/novels/salt-orchard': 'First frost.md', '/elsewhere': 'Other.md' })
  )
}

beforeEach(() => {
  localStorage.clear()
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})

describe('upgrading from before the workbench (W6)', () => {
  it('keeps the arrangement, the outline and the last chapter, then retires the old keys', async () => {
    preWorkbenchProfile()
    setActivePinia(createPinia())
    await useWorkspaceStore().openProject('/novels/salt-orchard')
    const layout = mount(ProjectLayout, {
      global: {
        stubs: {
          TopBar: true,
          DocumentTabs: true,
          CenterStage: true,
          DockArea: true,
          ShelfArea: true,
          StatusBar: true
        }
      }
    })
    await flushPromises()

    const workbench = useWorkbenchStore()
    const navigation = useWorkbenchNavigation()
    expect(navigation.isAreaOpen('binder')).toBe(false)
    expect(navigation.isViewChosen('codex')).toBe(true)
    expect(navigation.isViewShown('outline')).toBe(true)
    expect(workbench.layout.end.size).toBe(480)
    expect(workbench.outlinePath).toBe('Outline.md')
    expect(useDocumentTabsStore().writingPath).toBe('First frost.md')
    expect(useEditorStore().entry?.path).toBe('First frost.md')

    expect(localStorage.getItem('plotdevice.layout')).toBeNull()
    // Only this project's record is used up; another project's waits for that project.
    expect(JSON.parse(localStorage.getItem('plotdevice.lastEntry') ?? 'null')).toEqual({
      '/elsewhere': 'Other.md'
    })
    layout.unmount()
    await useEditorStore().close()

    // The next start finds everything in the workbench's own storage.
    setActivePinia(createPinia())
    await useWorkspaceStore().openProject('/novels/salt-orchard')
    expect(useWorkbenchNavigation().isViewShown('outline')).toBe(true)
    expect(useWorkbenchStore().outlinePath).toBe('Outline.md')
  })

  it('removes the last-entry record once no project is left in it', () => {
    localStorage.setItem('plotdevice.lastEntry', JSON.stringify({ '/book': 'The Ferry.md' }))
    setActivePinia(createPinia())
    useDocumentTabsStore().restore('/book')
    expect(localStorage.getItem('plotdevice.lastEntry')).toBeNull()
  })
})
