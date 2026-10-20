// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import CodexInspector from './CodexInspector.vue'
import { useWorkspaceStore } from '../../app/workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('CodexInspector', () => {
  it('disables membership editing in read-only projects', async () => {
    await useWorkspaceStore().openProject('/book')
    const workspace = useWorkspaceStore()
    if (workspace.project === null) throw new Error('expected project')
    workspace.project = { ...workspace.project, readOnly: true }
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    expect(
      panel.get('input[placeholder="Choose or add a group…"]').attributes('disabled')
    ).toBeDefined()
    panel.unmount()
  })

  it('retains memberships and surfaces a failed group write', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    const write = vi.spyOn(fake.api.codex, 'updateProperties').mockResolvedValue({
      ok: false,
      error: { code: 'write-failed', message: 'Disk is full.' }
    })
    const input = panel.get('input[placeholder="Choose or add a group…"]')
    await input.setValue('Main')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useCodexStore().properties?.groups ?? []).toEqual([])
    expect(useEditorStore().actionError).toBe('Disk is full.')
    expect(panel.text()).toContain('Disk is full.')
    write.mockRestore()
    panel.unmount()
  })

  it('adds overlapping groups with suggestions and updates the listing', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    const input = panel.get('input[placeholder="Choose or add a group…"]')
    expect(input.attributes('list')).toBe(panel.get('datalist').attributes('id'))
    await input.setValue('Main cast')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await input.setValue('Part 2')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useCodexStore().properties?.groups).toEqual(['Main cast', 'Part 2'])
    expect(
      useCodexStore().listing?.entries.find((entry) => entry.path === 'characters/Ilka.md')?.groups
    ).toEqual(['Main cast', 'Part 2'])
    expect(panel.findAll('datalist option').map((option) => option.attributes('value'))).toEqual([
      'Main cast',
      'Part 2'
    ])
    await panel.get('button[aria-label="Remove Main cast"]').trigger('click')
    await flushPromises()
    expect(useCodexStore().properties?.groups).toEqual(['Part 2'])
    panel.unmount()
  })

  it('shows malformed groups read-only and does not expose groups on notes', async () => {
    const props = fake.codexProperties.get('characters/Ilka.md')
    if (props === undefined) throw new Error('expected character properties')
    fake.codexProperties.set('characters/Ilka.md', {
      ...props,
      groups: [],
      groupsEditable: false,
      otherKeys: [{ key: 'groups', value: '{"main":true}' }]
    })
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    expect(
      panel.get('input[placeholder="Choose or add a group…"]').attributes('disabled')
    ).toBeDefined()
    expect(panel.get('[role="alert"]').text()).toContain('read-only')
    await useEditorStore().open('notes/Research.md')
    await flushPromises()
    expect(panel.find('input[placeholder="Choose or add a group…"]').exists()).toBe(false)
    panel.unmount()
  })

  it('shows a character’s profile and where it appears, and opens a chapter from there', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    expect(panel.get<HTMLInputElement>('#codex-role').element.value).toBe('lead')
    expect(panel.text()).toContain('Ilk')
    const chapter = panel.findAll('button').find((button) => button.text() === 'The Ferry')
    await chapter?.trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
  })

  it('adds another name', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    const input = panel
      .findAll('input')
      .find((candidate) => candidate.attributes('placeholder')?.startsWith('Add another name'))
    await input?.setValue('Ili')
    await input?.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useCodexStore().properties?.aliases).toEqual(['Ilk', 'Ili'])
  })

  it('shows a note with a title only', async () => {
    await useEditorStore().open('notes/Research.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    expect(panel.text()).toContain('Title')
    expect(panel.find('#codex-role').exists()).toBe(false)
    expect(panel.text()).not.toContain('Appears in')
  })
})
