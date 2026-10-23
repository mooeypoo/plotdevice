// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import SplitPane from './SplitPane.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
let id = ''

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
  const workbench = useWorkbenchStore()
  workbench.openBeside('First frost.md')
  id = workbench.layout.center.splits[0]?.id ?? ''
})

describe('SplitPane', () => {
  it('shows its document read-only, without saving', async () => {
    const save = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    const pane = mount(SplitPane, { props: { splitId: id } })
    await flushPromises()
    expect(pane.get('h2').text()).toBe('First frost')
    expect(pane.text()).toContain('Read-only')
    expect(pane.text()).toContain('Four words are here.')
    expect(pane.find('[contenteditable]').exists()).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('shows the editor’s live draft of the same document', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    const pane = mount(SplitPane, { props: { splitId: id } })
    await flushPromises()
    editor.edit('A new line.')
    await flushPromises()
    expect(pane.text()).toContain('A new line.')
    expect(pane.get('[role=status]').text()).toContain('draft open on the page')
    await editor.flush()
  })

  it('locks, and closes', async () => {
    const workbench = useWorkbenchStore()
    const pane = mount(SplitPane, { props: { splitId: id } })
    await flushPromises()
    await pane.get('button[aria-pressed=false]').trigger('click')
    expect(workbench.splits[id]?.locked).toBe(true)
    await pane.get('.close').trigger('click')
    expect(workbench.layout.center.splits).toEqual([])
  })

  it('explains an empty split, and names itself in Hebrew', async () => {
    const workbench = useWorkbenchStore()
    workbench.closeSplitView(id)
    workbench.setActiveLayout('revise')
    const empty = mount(SplitPane, { props: { splitId: 'split-1' } })
    expect(empty.text()).toContain('Open beside')
    useUiLanguageStore().locale = 'he'
    workbench.openBeside('First frost.md')
    await flushPromises()
    expect(empty.get('section').attributes('aria-label')).toBe('בצד העמוד: ⁨First frost⁩')
  })
})
