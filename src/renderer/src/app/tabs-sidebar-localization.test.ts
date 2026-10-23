// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from './codex-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkspaceStore } from './workspace-store'
import DocumentTabs from './DocumentTabs.vue'
import TopBar from './TopBar.vue'
import EditorPane from '../features/editor/EditorPane.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
let tabs: ReturnType<typeof mount>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
  await useEditorStore().open('The Ferry.md')
  await useEditorStore().open('First frost.md')
  tabs = mount(DocumentTabs, { attachTo: document.body })
})

afterEach(async () => {
  await useEditorStore().flush()
  tabs.unmount()
  vi.restoreAllMocks()
})

/** The open document's ⋯ items, read by opening and closing its menu. */
async function actionLabels(): Promise<string[]> {
  const trigger = tabs.get('.tab-actions button[aria-haspopup=menu]')
  await trigger.trigger('click')
  await flushPromises()
  const labels = tabs
    .findAll('.tab-actions [role^=menuitem]')
    .map((item) => item.attributes('data-label') ?? '')
  await trigger.trigger('click')
  return labels
}

describe('document tabs localization', () => {
  it('switches tab labels live without replacing controls or changing selection', async () => {
    const editor = useEditorStore()
    const tabStore = useDocumentTabsStore()
    const documentTab = tabs.get('[role=tab][aria-selected=true]').element
    const openEntry = vi.spyOn(fake.api.manuscript, 'openEntry')

    expect(tabs.get('section').attributes('aria-label')).toBe('Open entries')
    expect(tabs.get('[role=tablist]').attributes('aria-label')).toBe('Open tabs')
    expect(tabs.text()).toContain('Your chapter')
    expect(tabs.text()).toContain('Preview')
    expect(await actionLabels()).toContain('Keep open')

    useUiLanguageStore().locale = 'he'
    await flushPromises()

    expect(tabs.get('section').attributes('aria-label')).toBe('רשומות פתוחות')
    expect(tabs.get('[role=tablist]').attributes('aria-label')).toBe('לשוניות פתוחות')
    expect(tabs.text()).toContain('הפרק שלך')
    expect(tabs.text()).toContain('תצוגה מקדימה')
    expect(await actionLabels()).toContain('השאר פתוח')
    expect(tabs.get('[role=tab][aria-selected=true]').element).toBe(documentTab)
    expect(editor.entry?.path).toBe('First frost.md')
    expect(openEntry).not.toHaveBeenCalled()

    await tabs.get('.tab-actions button[aria-haspopup=menu]').trigger('click')
    await flushPromises()
    await tabs.get('.tab-actions [data-label="השאר פתוח"]').trigger('click')
    expect(
      tabStore.documents.find((document) => document.path === 'First frost.md')?.temporary
    ).toBe(false)
  })

  it('translates action names and isolates document titles in close labels', async () => {
    const close = tabs.get('.close')
    expect(close.attributes('aria-label')).toContain('Close')
    expect(close.attributes('aria-label')).toContain('\u2068')

    useUiLanguageStore().locale = 'he'
    await flushPromises()

    const labels = (await actionLabels()).join(' ')
    expect(labels).toContain('הצמד')
    expect(labels).toContain('כתיבה כאן')
    expect(labels).toContain('סגירת שאר הלשוניות שאינן מוצמדות')
    expect(tabs.text()).toContain('חזרה לפרק')
    expect(tabs.get('.return').attributes('title')).toContain('Ctrl+Shift+Enter')
    expect(tabs.get('.close').attributes('aria-label')).toContain('סגירה')
    expect(tabs.get('.close').attributes('aria-label')).toContain('\u2068')
    await tabs.get('[role=tab][title="The Ferry.md"]').trigger('click')
    await flushPromises()
    expect(tabs.find('.return').exists()).toBe(false)
    expect(await actionLabels()).not.toContain('כתיבה כאן')
  })

  it('localizes generated chapter and template labels without translating entry titles', async () => {
    const topBar = mount(TopBar, { attachTo: document.body })
    expect(topBar.get('.crumbs').text()).toContain('Chapter 2')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(topBar.get('.crumbs').text()).toContain('פרק 2')
    expect(topBar.get('.crumbs').text()).toContain('First frost')
    topBar.unmount()

    await useCodexStore().editTemplate('character')
    await flushPromises()
    const editorPane = mount(EditorPane, {
      global: { stubs: { ChapterEditor: true, ProjectOverview: true } }
    })
    const openEntry = vi.spyOn(fake.api.manuscript, 'openEntry')

    useUiLanguageStore().locale = 'en'
    await flushPromises()
    const templateTab = tabs.get('[role=tab][aria-selected=true]')
    expect(templateTab.text()).toContain('Character template')
    expect(editorPane.get('.eyebrow').text()).toBe('Template')
    useUiLanguageStore().locale = 'he'
    await flushPromises()

    expect(templateTab.text()).toContain('תבנית לדמות')
    expect(editorPane.get('.eyebrow').text()).toBe('תבנית')
    expect(editorPane.get('h1').text()).toBe('תבנית לדמות')
    expect(openEntry).not.toHaveBeenCalled()
    editorPane.unmount()
  })
})
