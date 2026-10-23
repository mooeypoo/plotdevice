// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from './codex-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkspaceStore } from './workspace-store'
import { useWorkbenchStore } from './workbench-store'
import { documentMoved } from './move-followers'
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
    expect(useWorkbenchStore().centerView).toBe('timeline')
  })

  it('is refused while a recovery decision is pending, keeping the draft and the view', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    editor.edit('Mine.')
    fake.files.set('First frost.md', 'Outside.')
    await editor.flush()
    expect(editor.saveState).toBe('conflict')
    expect(await useWorkbenchNavigation().showCenterView('overview')).toBe(false)
    expect(useWorkbenchStore().centerView).toBe('write')
    expect(editor.text).toBe('Mine.')
    expect(editor.actionError).toContain('Resolve')
  })

  it('does nothing when the view is already showing', async () => {
    expect(await useWorkbenchNavigation().showCenterView('write')).toBe(true)
    expect(useEditorStore().navigationBusy).toBe(false)
  })

  it('returns to the document when navigation opens one', async () => {
    expect(await useWorkbenchNavigation().showCenterView('interactions')).toBe(true)
    await useEditorStore().open('The Ferry.md')
    expect(useWorkbenchStore().centerView).toBe('write')
  })
})

describe('panels', () => {
  it('choosePanel switches the side’s tab without opening a closed side', () => {
    useWorkbenchNavigation().setAreaOpen('properties', false)
    useWorkbenchNavigation().choosePanel('properties')
    const navigation = useWorkbenchNavigation()
    expect([navigation.isAreaOpen('properties'), navigation.isViewChosen('properties')]).toEqual([
      false,
      true
    ])
  })

  it('revealView opens the side and leaves focus mode', () => {
    const navigation = useWorkbenchNavigation()
    navigation.setAreaOpen('properties', false)
    useWorkbenchStore().focusMode = true
    navigation.revealView('reference')
    expect(navigation.isViewShown('reference')).toBe(true)
    expect(useWorkbenchStore().focusMode).toBe(false)
  })
})

describe('the workbench center stage', () => {
  it('keeps the main view in the layout, so it survives a restart', async () => {
    expect(await useWorkbenchNavigation().showCenterView('timeline')).toBe(true)
    expect(useWorkbenchStore().layout.center.view).toBe('timeline')
    expect(JSON.parse(localStorage.getItem('plotdevice.workbench') ?? '{}')).toMatchObject({
      arrangements: { plot: { center: { view: 'timeline' } } }
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

describe('revealView', () => {
  it('brings back a closed Reference where it usually lives', () => {
    const workbench = useWorkbenchStore()
    workbench.apply((layout) => removeSection(layout, 'reference'))
    useWorkbenchNavigation().revealView('reference')
    expect(workbench.layout.end).toMatchObject({ activeSection: 'reference', collapsed: false })
  })
})

describe('splits beside the editor', () => {
  it('reuses a split, fills an unlocked one, opens a second, and refuses when both are locked', async () => {
    const workbench = useWorkbenchStore()
    const navigation = useWorkbenchNavigation()
    expect(await navigation.openBeside('The Ferry.md')).toBe(true)
    const [first] = workbench.layout.center.splits
    if (first === undefined) throw new Error('no split')
    expect(workbench.splits[first.id]).toEqual({ path: 'The Ferry.md', locked: false })
    expect(await navigation.openBeside('First frost.md')).toBe(true)
    expect(workbench.layout.center.splits).toHaveLength(1)
    expect(workbench.splits[first.id]?.path).toBe('First frost.md')

    workbench.setSplitLocked(first.id, true)
    expect(await navigation.openBeside('The Ferry.md')).toBe(true)
    expect(workbench.layout.center.splits).toHaveLength(2)
    const second = workbench.layout.center.splits[1]
    if (second === undefined) throw new Error('no second split')
    expect(workbench.splits[second.id]?.path).toBe('The Ferry.md')
    expect(await navigation.openBeside('First frost.md')).toBe(true)
    expect(workbench.splits[first.id]?.path).toBe('First frost.md')

    workbench.setSplitLocked(second.id, true)
    expect(await navigation.openBeside('Part One.md')).toBe(false)
    expect(workbench.splitNotice).toBe('split-all-locked')

    workbench.closeSplitView(second.id)
    expect(workbench.layout.center.splits.map((split) => split.id)).toEqual([first.id])
    expect(workbench.splits[second.id]).toBeUndefined()
    expect(workbench.splitNotice).toBeNull()
  })

  it('returns the main area to the document first', async () => {
    const navigation = useWorkbenchNavigation()
    await navigation.showCenterView('timeline')
    expect(await navigation.openBeside('The Ferry.md')).toBe(true)
    expect(useWorkbenchStore().centerView).toBe('write')
  })

  it('Write here swaps the documents and makes the split’s chapter the Writing target', async () => {
    const editor = useEditorStore()
    const workbench = useWorkbenchStore()
    const navigation = useWorkbenchNavigation()
    await editor.open('The Ferry.md')
    await navigation.openBeside('First frost.md')
    const id = workbench.layout.center.splits[0]?.id ?? ''
    expect(await navigation.writeHere(id)).toBe(true)
    expect(editor.entry?.path).toBe('First frost.md')
    expect(useDocumentTabsStore().writingPath).toBe('First frost.md')
    expect(workbench.splits[id]?.path).toBe('The Ferry.md')
  })

  it('Write here is refused while recovery is pending, keeping both documents', async () => {
    const editor = useEditorStore()
    const workbench = useWorkbenchStore()
    const navigation = useWorkbenchNavigation()
    await editor.open('The Ferry.md')
    await navigation.openBeside('First frost.md')
    const id = workbench.layout.center.splits[0]?.id ?? ''
    editor.edit('Mine.')
    fake.files.set('The Ferry.md', 'Outside.')
    await editor.flush()
    expect(await navigation.writeHere(id)).toBe(false)
    expect(editor.entry?.path).toBe('The Ferry.md')
    expect(editor.text).toBe('Mine.')
    expect(workbench.splits[id]?.path).toBe('First frost.md')
  })

  it('Write here closes the split when nothing was open in the editor', async () => {
    const workbench = useWorkbenchStore()
    const navigation = useWorkbenchNavigation()
    await navigation.openBeside('First frost.md')
    const id = workbench.layout.center.splits[0]?.id ?? ''
    expect(await navigation.writeHere(id)).toBe(true)
    expect(workbench.layout.center.splits).toEqual([])
  })

  it('splits follow the app’s moves', async () => {
    const workbench = useWorkbenchStore()
    await useWorkbenchNavigation().openBeside('The Ferry.md')
    documentMoved('The Ferry.md', 'Part One/The Ferry.md')
    const id = workbench.layout.center.splits[0]?.id ?? ''
    expect(workbench.splits[id]?.path).toBe('Part One/The Ferry.md')
  })
})
