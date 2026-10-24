// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoryDateCheckDto, UnorderedReasonDto } from '../../../../contract/dtos'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useInspectorStore } from '../../app/inspector-store'
import InspectorPanel from './InspectorPanel.vue'
import LinkPicker from './LinkPicker.vue'
import { optionLabels } from '../../shared/select-field-testing'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useManuscriptStore().load()
})

describe('InspectorPanel', () => {
  it('keeps placement and story time folded while drafting, with a summary of each', async () => {
    await useEditorStore().open('The Ferry.md')
    const panel = mount(InspectorPanel, { attachTo: document.body })
    await flushPromises()
    const groups = panel.findAll('details.group')
    expect(groups).toHaveLength(2)
    expect(groups.map((group) => (group.element as HTMLDetailsElement).open)).toEqual([
      false,
      false
    ])
    expect(groups[0]?.get('summary').text()).toContain('Position')
    expect(panel.find('#inspector-status').exists()).toBe(true)
    expect(panel.find('#inspector-synopsis').exists()).toBe(true)
    panel.unmount()
  })

  it('opens placement by itself when the order needs attention', async () => {
    await useEditorStore().open('The Ferry.md')
    const panel = mount(InspectorPanel, { attachTo: document.body })
    await flushPromises()
    await panel.get('#inspector-order').setValue('1.5')
    await panel.get('#inspector-order').trigger('change')
    await flushPromises()
    expect((panel.findAll('details.group')[0]?.element as HTMLDetailsElement).open).toBe(true)
    panel.unmount()
  })

  it('offers characters and a place behind one quiet add while the chapter has none', async () => {
    await useEditorStore().open('First frost.md')
    const panel = mount(InspectorPanel, { attachTo: document.body })
    await flushPromises()
    const labels = (): string[] =>
      panel.findAll('.field label, .field .eyebrow').map((l) => l.text())
    expect(labels()).not.toContain('Characters')
    await panel.get('.add-cast').trigger('click')
    expect(panel.find('.add-cast').exists()).toBe(false)
    expect(labels().join(' ')).toContain('Characters')
    panel.unmount()
  })

  it('retranslates invalid order input without replacing fields, saving or retrying', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('טיוטה / unsaved')
    editor.saveState = 'conflict'
    const panel = mount(InspectorPanel, { attachTo: document.body })
    await flushPromises()
    const order = panel.get<HTMLInputElement>('#inspector-order')
    await order.setValue('1.5')
    order.element.focus()
    expect(panel.get('.notice.error').text()).toBe('Order must be a whole number.')
    const read = vi.spyOn(fake.api.manuscript, 'getEntryProperties')
    const write = vi.spyOn(fake.api.manuscript, 'updateEntryProperties')
    const renumber = vi.spyOn(fake.api.manuscript, 'renumberPart')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(panel.get('.notice.error').text()).not.toContain('Order must')
    expect(panel.get('.notice.error').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(panel.get('#inspector-order').element).toBe(order.element)
    expect(order.element.value).toBe('1.5')
    expect(document.activeElement).toBe(order.element)
    expect(editor.text).toBe('טיוטה / unsaved')
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(renumber).not.toHaveBeenCalled()
    expect(fake.saves).toEqual([])
    useUiLanguageStore().locale = 'en'
    await flushPromises()
    expect(panel.get('.notice.error').text()).toBe('Order must be a whole number.')
    await order.setValue('3')
    expect(panel.find('.notice.error').exists()).toBe(false)
    panel.unmount()
  })

  it('translates property controls and link chips without changing focused drafts or project data', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    await useInspectorStore().loadVocabulary()
    const manuscriptText = editor.text
    const panel = mount(InspectorPanel, { attachTo: document.body })
    await flushPromises()

    const title = panel.get<HTMLInputElement>('#inspector-title')
    title.element.value = 'Unsaved title'
    await title.trigger('input')
    title.element.focus()
    const titleElement = title.element
    const reads = vi.spyOn(fake.api.manuscript, 'getEntryProperties')
    const writes = vi.spyOn(fake.api.manuscript, 'updateEntryProperties')

    useUiLanguageStore().locale = 'he'
    await flushPromises()

    expect(panel.get('aside').attributes('aria-label')).toBe('פרטים')
    expect(panel.get('.position').attributes('aria-label')).toBe('מיקום')
    expect(panel.get('header .eyebrow').text()).toBe('פרק')
    expect(panel.get('label[for="inspector-order"]').text()).toBe('סדר')
    expect(panel.get('label[for="inspector-title"]').text()).toBe('כותרת')
    expect(panel.get('#inspector-status .value').attributes('dir')).toBe('auto')
    expect(await optionLabels(panel.get('#inspector-status'))).toContain('draft')
    expect(panel.get('label[for="inspector-date"]').text()).toBe('תאריך בסיפור')
    expect(panel.get('label[for="inspector-synopsis"]').text()).toBe('תקציר')
    expect(panel.get('.threads').attributes('aria-label')).toBe('קווי עלילה')
    expect(panel.findAll('.thread').map((thread) => thread.text())).toContain('Main plot')
    expect(panel.findAll('.thread')[0]?.attributes('dir')).toBe('auto')
    expect(title.element).toBe(titleElement)
    expect(title.element.value).toBe('Unsaved title')
    expect(title.attributes('placeholder')).toContain('The Ferry')
    expect(document.activeElement).toBe(titleElement)
    expect(editor.text).toBe(manuscriptText)
    expect(reads).not.toHaveBeenCalled()
    expect(writes).not.toHaveBeenCalled()
    expect(fake.saves).toEqual([])

    const picker = mount(LinkPicker, {
      props: {
        label: 'נקודת מבט',
        links: ['[[יעל|Yael]]'],
        suggestions: [],
        single: true,
        disabled: false
      }
    })
    expect(picker.get('input').attributes('placeholder')).toBe('החלפה…')
    expect(picker.get('button.remove').attributes('aria-label')).toContain('Yael')
    expect(picker.get('button.remove').attributes('aria-label')).toContain('הסרת')
    expect(picker.emitted('change')).toBeUndefined()
    await picker.get('button.remove').trigger('click')
    expect(picker.emitted('change')).toEqual([[[]]])
    panel.unmount()
  })

  it('reorders link suggestions by locale without rereading or changing project data', async () => {
    const manuscript = useManuscriptStore().manuscript
    if (manuscript === null) throw new Error('Expected a manuscript')
    useManuscriptStore().manuscript = {
      ...manuscript,
      linkTargets: [
        ...manuscript.linkTargets,
        { name: 'שירה', path: 'characters/שירה.md', type: 'character' },
        { name: 'Ari', path: 'characters/Ari.md', type: 'character' },
        { name: 'דוד', path: 'characters/דוד.md', type: 'character' }
      ]
    }
    await useEditorStore().open('The Ferry.md')
    const panel = mount(InspectorPanel)
    await flushPromises()
    const suggestions = panel.findAll('datalist')[0]
    if (suggestions === undefined) throw new Error('Expected POV suggestions')
    const names = (): string[] =>
      suggestions.findAll('option').map((option) => option.attributes('value') ?? '')
    const read = vi.spyOn(fake.api.manuscript, 'getEntryProperties')
    const write = vi.spyOn(fake.api.manuscript, 'updateEntryProperties')

    expect(names()).toEqual(['Ari', 'Aunt Bea', 'Ilka', 'דוד', 'שירה'])
    const originalText = useEditorStore().text
    useUiLanguageStore().locale = 'he'
    await flushPromises()

    expect(names()).toEqual(['דוד', 'שירה', 'Ari', 'Aunt Bea', 'Ilka'])
    expect(useEditorStore().text).toBe(originalText)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    panel.unmount()
  })

  it('retranslates a pending rename confirmation without replanning or changing the name', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    const planRename = vi.spyOn(fake.api.manuscript, 'planRename')
    editor.pendingRename = {
      path: 'The Ferry.md',
      plan: {
        newPath: 'יעל.md',
        newName: 'יעל.md',
        policy: 'ask',
        linkCount: 2,
        fileCount: 1
      }
    }
    const pending = editor.pendingRename
    const panel = mount(InspectorPanel)
    await flushPromises()

    expect(panel.get('[role="status"] p').text()).toContain('2 links in 1 file')
    expect(panel.text()).toContain('Rename file')
    expect(panel.text()).toContain('Keep the name')

    useUiLanguageStore().locale = 'he'
    await flushPromises()

    expect(panel.get('[role="status"] p').text()).toContain('שני קישורים')
    expect(panel.get('[role="status"] p').text()).toContain('קובץ אחד')
    expect(panel.get('[role="status"] p').text()).toContain('יעל.md')
    expect(panel.text()).toContain('שינוי שם הקובץ')
    expect(panel.text()).toContain('השארת השם')
    expect(editor.pendingRename).toBe(pending)
    expect(planRename).not.toHaveBeenCalled()
    expect(fake.saves).toEqual([])
    panel.unmount()
  })

  it('clears a cached invalid-order hint when switching the inspected document', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    const panel = mount(InspectorPanel)
    await flushPromises()
    await panel.get('#inspector-order').setValue('1.5')
    expect(panel.get('.notice.error').text()).toBe('Order must be a whole number.')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(panel.get('.notice.error').text()).toContain('מספר שלם')
    await editor.open('First frost.md')
    await flushPromises()
    expect(panel.find('.notice.error').exists()).toBe(false)
    expect(panel.get<HTMLInputElement>('#inspector-order').element.value).not.toBe('1.5')
    expect(fake.saves).toEqual([])
    panel.unmount()
  })

  it.each([
    'missing-order',
    'no-part',
    'part-not-a-link',
    'part-not-found',
    'part-ambiguous'
  ] satisfies UnorderedReasonDto[])(
    'retranslates the unordered inspector sentence for %s',
    async (reason) => {
      await useEditorStore().open('Lost.md')
      const store = useManuscriptStore()
      const book = store.manuscript
      const chapter = book?.unordered[0]?.chapter
      if (book === null || chapter === undefined) throw new Error('Missing unordered chapter')
      store.manuscript = { ...book, unordered: [{ chapter, reason }] }
      const panel = mount(InspectorPanel)
      await flushPromises()
      const english = panel.get('.position .notice').text()
      expect(english).toContain('Not in the book yet:')
      const input = panel.get('#inspector-order').element
      const read = vi.spyOn(fake.api.manuscript, 'getEntryProperties')
      const write = vi.spyOn(fake.api.manuscript, 'updateEntryProperties')
      useUiLanguageStore().locale = 'he'
      await flushPromises()
      expect(panel.get('.position .notice').text()).not.toBe(english)
      expect(panel.get('.position .notice').text()).not.toContain('Not in the book')
      expect(panel.get('.position .notice').text()).toMatch(/[\u0590-\u05ff]/u)
      expect(panel.get('#inspector-order').element).toBe(input)
      expect(read).not.toHaveBeenCalled()
      expect(write).not.toHaveBeenCalled()
      panel.unmount()
    }
  )

  it('localizes duplicate-order details with exact escaped titles and unchanged local input', async () => {
    await useEditorStore().open('The Ferry.md')
    const store = useManuscriptStore()
    const book = store.manuscript
    if (book === null) throw new Error('Missing manuscript')
    store.manuscript = {
      ...book,
      parts: book.parts.map((part) => ({
        ...part,
        chapters: part.chapters.map((chapter) => ({
          ...chapter,
          order: 2,
          duplicateOrder: true,
          title: chapter.path === 'First frost.md' ? 'יעל <img src=x>' : chapter.title
        }))
      }))
    }
    const panel = mount(InspectorPanel, { attachTo: document.body })
    await flushPromises()
    const title = panel.get<HTMLInputElement>('#inspector-title')
    title.element.value = 'Local unsaved title'
    await title.trigger('input')
    title.element.focus()
    const read = vi.spyOn(fake.api.manuscript, 'getEntryProperties')
    const write = vi.spyOn(fake.api.manuscript, 'updateEntryProperties')
    const renumber = vi.spyOn(fake.api.manuscript, 'renumberPart')
    expect(panel.get('.notice.warn p').text()).toContain('Shares order')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(panel.get('.notice.warn p').text()).not.toContain('Shares order')
    expect(panel.get('.notice.warn p').text()).toContain('\u2068יעל <img src=x>\u2069')
    expect(panel.find('img').exists()).toBe(false)
    expect(panel.get('#inspector-title').element).toBe(title.element)
    expect(title.element.value).toBe('Local unsaved title')
    expect(document.activeElement).toBe(title.element)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(renumber).not.toHaveBeenCalled()
    panel.unmount()
  })

  it('shows and retranslates a failed status addition without replacing unsaved input or retrying', async () => {
    await useEditorStore().open('First frost.md')
    const language = useUiLanguageStore()
    await language.initialize()
    const inspector = useInspectorStore()
    await inspector.loadVocabulary()
    const add = vi.spyOn(fake.api.manuscript, 'addStatus').mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'write-failed',
        message: 'Legacy',
        diagnostic: { reason: 'file-write-failed', path: 'novel.md', detail: 'EACCES <img src=x>' }
      }
    })
    const panel = mount(InspectorPanel, { attachTo: document.body })
    await flushPromises()
    const title = panel.get<HTMLInputElement>('#inspector-title')
    title.element.value = 'Unsaved טיוטה'
    await title.trigger('input')
    title.element.focus()
    await inspector.addStatus('New status')
    expect(panel.get('[role="alert"]').text()).toContain("Couldn't save")
    await language.change('he')
    expect(panel.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(panel.get('[role="alert"]').text()).toContain('EACCES <img src=x>')
    expect(panel.find('img').exists()).toBe(false)
    expect(panel.get('#inspector-title').element).toBe(title.element)
    expect(title.element.value).toBe('Unsaved טיוטה')
    expect(document.activeElement).toBe(title.element)
    expect(add).toHaveBeenCalledOnce()
    expect(inspector.vocabulary?.statuses).not.toContain('New status')
    expect(fake.saves).toEqual([])
    await inspector.addStatus('New status')
    expect(inspector.error).toBeNull()
    expect(panel.find('[role="alert"]').exists()).toBe(false)
    panel.unmount()
  })

  it.each([
    [
      { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 10, day: 3 } },
      '3 October 1952',
      '3 באוקטובר 1952'
    ],
    [
      { kind: 'invalid', issue: { reason: 'invalid-day', value: '1952-02-30' } },
      'that day doesn’t exist',
      'היום הזה אינו קיים'
    ]
  ] satisfies [StoryDateCheckDto, string, string][])(
    'reformats cached %j without API reads or writes on a language switch',
    async (reading, en, he) => {
      const check = vi
        .spyOn(fake.api.inspector, 'checkStoryDate')
        .mockResolvedValue({ ok: true, value: reading })
      const write = vi.spyOn(fake.api.manuscript, 'updateEntryProperties')
      const editor = useEditorStore()
      await editor.open('The Ferry.md')
      editor.edit('Unsaved טיוטה')
      const language = useUiLanguageStore()
      await language.initialize()
      const panel = mount(InspectorPanel)
      await flushPromises()
      const input = panel.get<HTMLInputElement>('#inspector-date')
      input.element.value = '1952-02-30'
      await input.trigger('input')
      await flushPromises()
      expect(panel.text()).toContain(en)
      const reads = check.mock.calls.length
      await language.change('he')
      await flushPromises()
      expect(panel.text()).toContain(he)
      expect(check).toHaveBeenCalledTimes(reads)
      expect(write).not.toHaveBeenCalled()
      expect(fake.saves).toEqual([])
      expect(editor.text).toBe('Unsaved טיוטה')
      expect(panel.get<HTMLInputElement>('#inspector-date').element.value).toBe('1952-02-30')
      panel.unmount()
    }
  )

  it('locks the fields of a file that was deleted outside the app', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    const panel = mount(InspectorPanel)
    await flushPromises()
    const title = (): HTMLInputElement => panel.get<HTMLInputElement>('#inspector-title').element
    expect(title().disabled).toBe(false)

    fake.files.delete('First frost.md')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'removed' }])
    await flushPromises()
    expect(title().disabled).toBe(true)
  })
})
