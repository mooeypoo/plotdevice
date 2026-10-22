// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'
import { useManuscriptStore } from './manuscript-store'
import { useEditorStore, type SaveState } from './editor-store'
import { useUiLanguageStore } from './ui-language-store'
import { useLayoutStore } from './layout-store'
import { useWritingPreferencesStore } from './writing-preferences-store'
import TopBar from './TopBar.vue'
import StatusBar from './StatusBar.vue'
import WritingAppearance from './WritingAppearance.vue'
import ProjectLayout from './ProjectLayout.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await useManuscriptStore().load()
  await useEditorStore().open('The Ferry.md')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('project chrome translation', () => {
  it('mirrors directional toolbar and breadcrumb icons when the interface is RTL', async () => {
    const page = mount(TopBar)
    const topBar = page.get('.top-bar')
    const binderIcon = page.get('[aria-label=Binder] .directional-icon')
    const inspectorIcon = page.get('[aria-label=Inspector] .directional-icon')
    expect(topBar.attributes('dir')).toBe('ltr')
    expect(page.findAll('.separator').length).toBeGreaterThan(0)
    expect(binderIcon.classes()).not.toContain('mirrored')
    expect(inspectorIcon.classes()).not.toContain('mirrored')
    useUiLanguageStore().locale = 'he'
    await flushPromises()

    expect(topBar.attributes('dir')).toBe('rtl')
    expect(binderIcon.classes()).toContain('mirrored')
    expect(inspectorIcon.classes()).toContain('mirrored')
    expect(page.findAll('.separator').every((separator) => separator.classes().includes('mirrored'))).toBe(
      true
    )
    page.unmount()
  })

  it('translates top-bar accessible labels without replacing controls or changing panel actions', async () => {
    const page = mount(TopBar, { attachTo: document.body })
    const button = page.get<HTMLButtonElement>('[aria-label=Binder]').element
    button.focus()
    const project = useWorkspaceStore().project
    const entry = useEditorStore().entry
    const open = vi.spyOn(fake.api.manuscript, 'openEntry')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(page.get('nav').attributes('aria-label')).toBe('מיקום')
    expect(page.get('[role=tablist]').attributes('aria-label')).toBe('תצוגה')
    expect(button.getAttribute('aria-label')).toBe('קלסר כתב היד')
    expect(button.title).toContain('Ctrl+\\')
    expect(page.get('[aria-label="מאפיינים"]').attributes('title')).toBe(
      'מאפיינים (\u2068Ctrl+Shift+I\u2069)'
    )
    expect(page.get('[aria-label="מצב מיקוד"]').attributes('title')).toBe(
      'מצב מיקוד (\u2068Ctrl+Shift+F\u2069)'
    )
    expect(page.get('[aria-label="קלסר כתב היד"]').element).toBe(button)
    expect(document.activeElement).toBe(button)
    expect(useWorkspaceStore().project).toBe(project)
    expect(useEditorStore().entry).toBe(entry)
    expect(open).not.toHaveBeenCalled()
    const before = useLayoutStore().binderOpen
    await page.get('[aria-label="קלסר כתב היד"]').trigger('click')
    expect(useLayoutStore().binderOpen).toBe(!before)
    const inspector = useLayoutStore().inspectorOpen
    await page.get('[aria-label="מאפיינים"]').trigger('click')
    expect(useLayoutStore().inspectorOpen).toBe(!inspector)
    await page.get('[aria-label="מצב מיקוד"]').trigger('click')
    expect(useLayoutStore().focusMode).toBe(true)
    page.unmount()
  })

  it.each([
    ['saved', 'Saved', 'נשמר', 'var(--ok)'],
    ['unsaved', 'Editing…', 'בעריכה…', 'var(--warning)'],
    ['saving', 'Saving…', 'בשמירה…', 'var(--warning)'],
    ['conflict', 'Not saved: changed outside', 'לא נשמר: השתנה מחוץ ליישום', 'var(--danger)'],
    ['error', 'Not saved', 'לא נשמר', 'var(--danger)'],
    ['missing', 'Not saved: file missing', 'לא נשמר: הקובץ חסר', 'var(--danger)']
  ] satisfies [SaveState, string, string, string][])(
    'translates %s while retaining its save tone and draft',
    async (state, en, he, tone) => {
      const editor = useEditorStore()
      editor.saveState = state
      const page = mount(StatusBar)
      const dot = page.get('.save .dot').attributes('style')
      expect(page.get('.save').text()).toBe(en)
      expect(dot).toContain(tone)
      const text = editor.text
      const save = vi.spyOn(fake.api.manuscript, 'saveEntryText')
      useUiLanguageStore().locale = 'he'
      await flushPromises()
      expect(page.get('.save').text()).toBe(he)
      expect(page.get('.save .dot').attributes('style')).toBe(dot)
      expect(editor.saveState).toBe(state)
      expect(editor.text).toBe(text)
      expect(save).not.toHaveBeenCalled()
      page.unmount()
    }
  )

  it('gives read-only priority and translates complete count sentences', async () => {
    const workspace = useWorkspaceStore()
    if (workspace.project === null) throw new Error('Missing project')
    workspace.project = { ...workspace.project, readOnly: true }
    useEditorStore().saveState = 'conflict'
    const page = mount(StatusBar)
    expect(page.get('.save').text()).toBe('Read-only')
    expect(page.text()).toContain('3 words in chapter')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(page.get('.save').text()).toBe('לקריאה בלבד')
    expect(page.text()).toContain('3 מילים בפרק')
    expect(page.text()).not.toContain('Manuscript')
    expect(page.get('.save .dot').attributes('style')).toContain('var(--text-muted)')
    page.unmount()
  })

  it('formats zero and large counts and isolates the exact current-part title', async () => {
    const manuscript = useManuscriptStore()
    const current = manuscript.manuscript
    if (current === null) throw new Error('Missing manuscript')
    const title = 'יעל <img> Part'
    manuscript.manuscript = {
      ...current,
      wordCount: 1234567,
      parts: current.parts.map((part) => ({ ...part, title, wordCount: 1000 }))
    }
    useEditorStore().wordCount = 0
    const page = mount(StatusBar)
    expect(page.text()).toContain('0 words in chapter')
    expect(page.text()).toContain(`\u2068${title}\u2069: 1,000 words`)
    expect(page.text()).toContain('Manuscript: 1,234,567 words')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(page.text()).toContain('0 מילים בפרק')
    expect(page.text()).toContain(`\u2068${title}\u2069: 1,000 מילים`)
    expect(page.text()).toContain('כתב היד: 1,234,567 מילים')
    expect(page.find('img').exists()).toBe(false)
    page.unmount()
  })

  it('relabels the same appearance popover and focused range without storage or draft writes', async () => {
    const page = mount(WritingAppearance, { attachTo: document.body })
    const input = page.get<HTMLInputElement>('#prose-size').element
    const panel = page.get('[popover]').element
    input.focus()
    const storage = localStorage
    const set = vi.fn((key: string, value: string) => { storage.setItem(key, value); })
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.getItem(key), setItem: set })
    const preferences = useWritingPreferencesStore()
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(page.get('h2').text()).toBe('מראה הכתיבה')
    expect(page.get('label[for=prose-size]').text()).toBe('גודל הטקסט')
    expect(page.get('label[for=prose-width]').text()).toBe('רוחב השורה')
    expect(page.get('output[for=prose-size]').text()).toBe('19 פיקסלים')
    expect(page.get('output[for=prose-width]').text()).toBe('66 יחידות תו')
    expect(page.get('.appearance-trigger').attributes('aria-label')).toBe('מראה הכתיבה')
    expect(page.get('.close').attributes('aria-label')).toBe('סגירת מראה הכתיבה')
    expect(page.get('.close').attributes('popovertargetaction')).toBe('hide')
    expect(page.get('.reset').text()).toBe('איפוס')
    expect(page.get('[popover]').element).toBe(panel)
    expect(page.get('#prose-size').element).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(preferences.fontSize).toBe(19)
    expect(preferences.lineWidth).toBe(66)
    expect(set).not.toHaveBeenCalled()
    expect(fake.saves).toEqual([])
    expect(fake.closedProjects).toBe(0)
    await page.get('#prose-size').setValue('24')
    expect(preferences.fontSize).toBe(24)
    expect(set).toHaveBeenCalledTimes(1)
    await page.get('.reset').trigger('click')
    expect(preferences.fontSize).toBe(19)
    expect(preferences.lineWidth).toBe(66)
    page.unmount()
  })

  it('retranslates focus chrome without losing a conflicted draft and retains the exit action', async () => {
    const page = mount(ProjectLayout, {
      global: {
        stubs: {
          TopBar: true,
          EditorPane: true,
          SidePanel: true,
          RightPanel: true,
          StatusBar: true
        }
      }
    })
    await flushPromises()
    const editor = useEditorStore()
    editor.saveState = 'conflict'
    useLayoutStore().focusMode = true
    await flushPromises()
    const button = page.get('.focus-chrome button').element
    const save = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(page.get('.focus-chrome').text()).toContain('3 מילים')
    expect(page.get('.focus-chrome button').text()).toContain('יציאה ממיקוד')
    expect(page.get('.focus-chrome button').element).toBe(button)
    expect(editor.saveState).toBe('conflict')
    expect(save).not.toHaveBeenCalled()
    await page.get('.focus-chrome button').trigger('click')
    expect(useLayoutStore().focusMode).toBe(false)
    page.unmount()
  })
})
