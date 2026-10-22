// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from './codex-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkspaceStore } from './workspace-store'
import { useWorkbenchStore } from './workbench-store'
import { addView, removeSection, setAreaCollapsed } from '../workbench/model/operations'

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

describe('showCenterView', () => {
  it('saves the draft before hiding the document', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    editor.edit('Typed just now.')
    expect(await useWorkbenchNavigation().showCenterView('timeline')).toBe(true)
    expect(fake.files.get('First frost.md')).toBe('Typed just now.')
    expect(useLayoutStore().mainView).toBe('timeline')
  })

  it('is refused while a recovery decision is pending, keeping the draft and the view', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    editor.edit('Mine.')
    fake.files.set('First frost.md', 'Outside.')
    await editor.flush()
    expect(editor.saveState).toBe('conflict')
    expect(await useWorkbenchNavigation().showCenterView('overview')).toBe(false)
    expect(useLayoutStore().mainView).toBe('write')
    expect(editor.text).toBe('Mine.')
    expect(editor.actionError).toContain('Resolve')
  })

  it('does nothing when the view is already showing', async () => {
    expect(await useWorkbenchNavigation().showCenterView('write')).toBe(true)
    expect(useEditorStore().navigationBusy).toBe(false)
  })

  it('returns to the document when navigation opens one', async () => {
    const layout = useLayoutStore()
    expect(await useWorkbenchNavigation().showCenterView('interactions')).toBe(true)
    await useEditorStore().open('The Ferry.md')
    expect(layout.mainView).toBe('write')
  })
})

describe('panels', () => {
  it('choosePanel switches the side’s tab without opening a closed side', () => {
    const layout = useLayoutStore()
    layout.inspectorOpen = false
    useWorkbenchNavigation().choosePanel('properties')
    expect(layout).toMatchObject({ inspectorOpen: false, rightTab: 'properties' })
  })

  it('revealPanel opens the side and leaves focus mode', () => {
    const layout = useLayoutStore()
    layout.inspectorOpen = false
    layout.focusMode = true
    useWorkbenchNavigation().revealPanel('reference')
    expect(layout).toMatchObject({ inspectorOpen: true, rightTab: 'reference', focusMode: false })
  })
})

describe('the workbench center stage', () => {
  it('keeps the main view in the layout, so it survives a restart', async () => {
    expect(await useWorkbenchNavigation().showCenterView('timeline')).toBe(true)
    expect(useWorkbenchStore().layout.center.view).toBe('timeline')
    expect(JSON.parse(localStorage.getItem('plotdevice.workbench') ?? '{}')).toMatchObject({
      arrangements: { write: { center: { view: 'timeline' } } }
    })
  })

  it('brings forward a view the layout shows in a panel instead of duplicating it', async () => {
    const workbench = useWorkbenchStore()
    workbench.apply((layout) => addView(layout, 'timeline', 'bottom', 'timeline'))
    workbench.apply((layout) => setAreaCollapsed(layout, 'bottom', true))
    expect(await useWorkbenchNavigation().showCenterView('timeline')).toBe(true)
    expect(workbench.layout.center.view).toBe('document')
    expect(workbench.layout.bottom.collapsed).toBe(false)
  })

  it('moves such a view to the main area in the classic shell, which has no shelf', async () => {
    const workbench = useWorkbenchStore()
    workbench.setShell('classic')
    workbench.apply((layout) => addView(layout, 'timeline', 'bottom', 'timeline'))
    expect(await useWorkbenchNavigation().showCenterView('timeline')).toBe(true)
    expect(workbench.layout.center.view).toBe('timeline')
    expect(workbench.layout.bottom.sections).toEqual([])
  })
})

describe('switchLayout', () => {
  it('saves the draft first and is refused while recovery is pending', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    editor.edit('Typed.')
    expect(await useWorkbenchNavigation().switchLayout('revise')).toBe(true)
    expect(fake.files.get('First frost.md')).toBe('Typed.')
    editor.edit('Mine.')
    fake.files.set('First frost.md', 'Outside.')
    await editor.flush()
    expect(await useWorkbenchNavigation().switchLayout('write')).toBe(false)
    expect(useWorkbenchStore().activeLayoutId).toBe('revise')
  })
})

describe('revealPanel', () => {
  it('brings back a closed Reference where it usually lives', () => {
    const workbench = useWorkbenchStore()
    workbench.apply((layout) => removeSection(layout, 'reference'))
    useWorkbenchNavigation().revealPanel('reference')
    expect(workbench.layout.end).toMatchObject({ activeSection: 'reference', collapsed: false })
  })
})
