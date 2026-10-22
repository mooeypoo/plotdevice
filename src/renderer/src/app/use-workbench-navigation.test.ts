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
