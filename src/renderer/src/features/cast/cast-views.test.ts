// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useOutlineStore } from '../../app/outline-store'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { usePeekStore } from '../../app/peek-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { ENTRY_PATH_DRAG_TYPE } from '../../shared/drag-types'
import CastStrip from './CastStrip.vue'
import SceneCard from './SceneCard.vue'

const CHAPTER = 'First frost.md'
let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  const read = await fake.api.manuscript.getEntryProperties(CHAPTER)
  if (!read.ok) throw new Error('no chapter')
  await fake.api.manuscript.updateEntryProperties(CHAPTER, read.value.version, {
    pov: ['Ilka'],
    status: 'draft',
    synopsis: 'The orchard freezes.'
  })
  fake.files.set(CHAPTER, 'Frost over [[Marrow]] and `[[Research]]`.\n')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load(), useOutlineStore().load()])
  useDocumentTabsStore().restore('/book')
  await useEditorStore().open(CHAPTER)
})
afterEach(async () => {
  await useEditorStore().flush()
  vi.restoreAllMocks()
})

describe('CastStrip', () => {
  it('names the point of view first, then places only the text mentions', async () => {
    const strip = mount(CastStrip)
    await flushPromises()
    expect(strip.findAll('.name').map((chip) => chip.attributes('aria-label'))).toEqual([
      '⁨Ilka⁩, point of view',
      '⁨Marrow⁩, named only in the text'
    ])
  })

  it('follows the draft as the writer changes the links', async () => {
    const strip = mount(CastStrip)
    await flushPromises()
    useEditorStore().edit('Frost over the orchard.\n')
    await flushPromises()
    expect(strip.text()).not.toContain('Marrow')
    useEditorStore().edit('Frost over [[Marrow]] again.\n')
    await flushPromises()
    expect(strip.text()).toContain('Marrow')
  })

  it('peeks at a chip with focus, and pins it as a card', async () => {
    const strip = mount(CastStrip, { attachTo: document.body })
    await flushPromises()
    await strip.get('.name').trigger('click')
    expect(usePeekStore()).toMatchObject({ path: 'characters/Ilka.md', takesFocus: true })
    await strip.get('.pin').trigger('click')
    const workbench = useWorkbenchStore()
    expect(workbench.cards).toEqual(['characters/Ilka.md'])
    expect(workbench.layout.end.sections.map((section) => section.view)).toContain('card-stack')
    strip.unmount()
  })

  it('carries the entry when a chip is dragged', async () => {
    const strip = mount(CastStrip)
    await flushPromises()
    const data = new Map<string, string>()
    const dataTransfer = {
      setData: (type: string, value: string) => data.set(type, value),
      effectAllowed: 'none'
    }
    await strip.get('.name').trigger('dragstart', { dataTransfer })
    expect(data.get(ENTRY_PATH_DRAG_TYPE)).toBe('characters/Ilka.md')
  })

  it('translates its labels in Hebrew', async () => {
    useUiLanguageStore().locale = 'he'
    const strip = mount(CastStrip)
    await flushPromises()
    expect(strip.get('h2').text()).toBe('בפרק הזה')
    expect(strip.get('.name').attributes('aria-label')).toBe('⁨Ilka⁩, נקודת מבט')
  })
})

describe('SceneCard', () => {
  it('shows the chapter’s properties and the outline lines about it', async () => {
    const card = mount(SceneCard)
    await flushPromises()
    expect(card.get('h3').text()).toBe('First frost')
    expect(card.get('dl').text()).toContain('draft')
    expect(card.get('dl').text()).toContain('Ilka')
    expect(card.get('.synopsis').text()).toBe('The orchard freezes.')
    expect(card.findAll('.outline-lines li').map((line) => line.text())).toEqual([
      'First frost: the frost.'
    ])
  })

  it('follows the outline’s live draft and opens Properties on request', async () => {
    const editor = useEditorStore()
    const card = mount(SceneCard)
    await flushPromises()
    await editor.open('Outline.md')
    editor.edit('## Plan\n- [[First frost]] turns cold.\n')
    await flushPromises()
    expect(card.findAll('.outline-lines li').map((line) => line.text())).toEqual([
      'First frost turns cold.'
    ])
    await card.get('.edit').trigger('click')
    await flushPromises()
    expect(editor.entry?.path).toBe(CHAPTER)
    expect(useLayoutStore().rightTab).toBe('properties')
  })

  it('explains when there is no chapter to describe', () => {
    setActivePinia(createPinia())
    const card = mount(SceneCard)
    expect(card.get('.empty').text()).toBe('Open a chapter to see it here.')
  })
})
