import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useOutlinePanel } from './use-outline-panel'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('useOutlinePanel', () => {
  it('shows the outline, and knows which links mean the open chapter', async () => {
    await useEditorStore().open('First frost.md')
    const panel = useOutlinePanel()
    await flushPromises()
    expect(panel.path.value).toBe('Outline.md')
    expect(panel.text.value).toContain('[[First frost]]')
    expect(panel.pointsHere.value({ kind: 'wiki', target: 'First frost' })).toBe(true)
    expect(panel.pointsHere.value({ kind: 'wiki', target: 'The Ferry' })).toBe(false)
  })

  it('opens a link in the main editor', async () => {
    await useEditorStore().open('First frost.md')
    const panel = useOutlinePanel()
    await flushPromises()
    await panel.openLink({ kind: 'wiki', target: 'The Ferry' })
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
  })

  it('defers to the main editor while the outline is open there, then re-reads it', async () => {
    const panel = useOutlinePanel()
    await flushPromises()
    await panel.edit()
    expect(useEditorStore().entry).toMatchObject({ path: 'Outline.md', kind: 'outline' })
    expect(panel.openInEditor.value).toBe(true)

    useEditorStore().edit('## Part One\n- Rewritten plan.\n')
    await useEditorStore().open('The Ferry.md')
    await flushPromises()
    expect(panel.openInEditor.value).toBe(false)
    expect(panel.text.value).toBe('## Part One\n- Rewritten plan.\n')
  })

  it('remembers which outline was chosen', async () => {
    await useCodexStore().createOutline('Revision plan')
    const panel = useOutlinePanel()
    panel.choose('Revision plan.md')
    await flushPromises()
    expect(useLayoutStore().outlinePath).toBe('Revision plan.md')
    expect(panel.path.value).toBe('Revision plan.md')
  })
})
