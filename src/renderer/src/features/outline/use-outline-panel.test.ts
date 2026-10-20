import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  it('keeps each outline title, path, and body paired when switching in both directions', async () => {
    await useCodexStore().createOutline('Clue ledger')
    fake.files.set('Clue ledger.md', '## Clues\nThe key is missing.')
    const panel = useOutlinePanel()
    await flushPromises()
    for (const path of ['Clue ledger.md', 'Outline.md', 'Clue ledger.md']) {
      panel.choose(path)
      await flushPromises()
      expect(panel.path.value).toBe(path)
      expect(panel.text.value).toBe(fake.files.get(path))
      expect(panel.outlines.value.find((outline) => outline.path === path)?.title).toBe(
        path.replace('.md', '')
      )
    }
  })

  it('clears the old body while loading and rejects stale A → B → A responses', async () => {
    await useCodexStore().createOutline('Clue ledger')
    const pending: ((result: Awaited<ReturnType<typeof fake.api.codex.openEntry>>) => void)[] = []
    vi.spyOn(fake.api.codex, 'openEntry').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    const panel = useOutlinePanel()
    panel.choose('Outline.md')
    await flushPromises()
    panel.choose('Clue ledger.md')
    await flushPromises()
    panel.choose('Outline.md')
    await flushPromises()
    expect(panel.loading.value).toBe(true)
    expect(panel.text.value).toBeNull()
    const success = (text: string): Awaited<ReturnType<typeof fake.api.codex.openEntry>> => ({
      ok: true,
      value: { path: 'Outline.md', text, version: 'v1', wordCount: 1 }
    })
    pending[2]?.(success('Newest A'))
    await flushPromises()
    pending[0]?.(success('Old A'))
    pending[1]?.(success('B'))
    await flushPromises()
    expect(panel.text.value).toBe('Newest A')
    expect(panel.loading.value).toBe(false)
  })

  it('shows read failures without retaining another outline’s body', async () => {
    const panel = useOutlinePanel()
    await flushPromises()
    fake.files.delete('Outline.md')
    await useCodexStore().reload()
    await flushPromises()
    expect(panel.text.value).toBeNull()
    expect(panel.error.value).toBe('gone')
    expect(panel.loading.value).toBe(false)
  })

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
