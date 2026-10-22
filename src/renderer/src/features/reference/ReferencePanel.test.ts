// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useReferenceStore } from '../../app/reference-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import ReferencePanel from './ReferencePanel.vue'
import type { ApiResult, EntryTextDto } from '../../../../contract/dtos'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  fake.files.set('characters/Ilka.md', '## History\n\n**Ilka** came from [[Marrow]].')
  await Promise.all([useCodexStore().load(), useManuscriptStore().load()])
  await useEditorStore().open('The Ferry.md')
})

describe('ReferencePanel', () => {
  it('translates the empty reading panel without loading or changing project files', async () => {
    const wrapper = mount(ReferencePanel)
    const read = vi.spyOn(fake.api.codex, 'openEntry')
    const write = vi.spyOn(fake.api.codex, 'saveEntryText')

    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(wrapper.get('.reference-panel').attributes('aria-label')).toBe('לעיון')
    expect(wrapper.get('.empty h2').text()).toBe('הסיפור נשאר קרוב')
    expect(wrapper.get('.empty').text()).toContain('בחומר נוסף')
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('translates reading chrome while preserving authored profile and Markdown content', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    const view = wrapper.get('.view').element
    const authored = wrapper.get('.view').text()
    const read = vi.spyOn(fake.api.codex, 'openEntry')
    const write = vi.spyOn(fake.api.codex, 'saveEntryText')

    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(wrapper.get('.reference-panel').attributes('aria-label')).toBe('לעיון')
    expect(wrapper.get('.eyebrow').text()).toBe('דמות')
    expect(wrapper.get('.edit').text()).toBe('פתיחה בעורך')
    expect(wrapper.get('.aliases').text()).toContain('כינויים')
    expect(wrapper.get('h2').text()).toBe('Ilka')
    expect(wrapper.get('.role').text()).toBe('lead')
    expect(wrapper.get('.file-path').text()).toBe('characters/Ilka.md')
    expect(wrapper.get('.view').element).toBe(view)
    expect(wrapper.get('.view').text()).toBe(authored)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('retranslates a link notice beside the same reference without rereading or writing', async () => {
    fake.files.set('characters/Ilka.md', '## History\n\n[[Nobody <img src=x> יעל]]')
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    const view = wrapper.get('.view').element
    const scroller = wrapper.get('.reference-panel').element
    scroller.scrollTop = 125
    await wrapper.get('.view a').trigger('click')
    const english = wrapper.get('[role=status]').text()
    const read = vi.spyOn(fake.api.codex, 'openEntry')
    const write = vi.spyOn(fake.api.codex, 'saveEntryText')
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(wrapper.get('[role=status]').text()).not.toBe(english)
    expect(wrapper.get('[role=status]').text()).toContain('\u2068Nobody <img src=x> יעל\u2069')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.view').element).toBe(view)
    expect(scroller.scrollTop).toBe(125)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows a rendered profile and navigates its links only within the reference', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    expect(wrapper.get('h2').text()).toBe('Ilka')
    expect(wrapper.get('.role').text()).toBe('lead')
    expect(wrapper.get('.aliases').text()).toContain('Ilk')
    expect(wrapper.get('.view h2').text()).toBe('History')
    expect(wrapper.get('strong').text()).toBe('Ilka')
    expect(wrapper.get('.file-path').text()).toBe('characters/Ilka.md')
    await wrapper.get('.view a').trigger('click')
    await flushPromises()
    expect(reference.entry?.path).toBe('locations/Marrow.md')
    expect(wrapper.get('.view').text()).toContain('village')
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    wrapper.unmount()
  })

  it('reads mixed-direction reference text while retaining automatic metadata direction', async () => {
    fake.files.set(
      'characters/Ilka.md',
      '## היסטוריה\n\nEnglish biography.\n\n`C:/novel/Chapter.md`'
    )
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()

    expect(wrapper.get('h2').attributes('dir')).toBe('auto')
    expect(wrapper.get('.role').attributes('dir')).toBe('auto')
    expect(wrapper.get('.file-path').attributes('dir')).toBe('auto')
    expect(wrapper.get('.view h2').attributes('dir')).toBe('auto')
    expect(wrapper.get('.view p').attributes('dir')).toBe('auto')
    expect(wrapper.get('.view p code').attributes('dir')).toBe('ltr')
    expect(wrapper.get('.view').text()).toContain('English biography.')
    expect(wrapper.get('.view code').text()).toBe('C:/novel/Chapter.md')

    wrapper.unmount()
  })

  it('opens raw Markdown only on request and previews current editor text without another writer', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('characters/Ilka.md')
    expect(useLayoutStore().rightTab).toBe('properties')
    useEditorStore().edit('## Revised history\n\nA new draft.')
    await flushPromises()
    expect(wrapper.get('.view h2').text()).toBe('Revised history')
    expect(wrapper.text()).toContain('Showing the current editor draft')
    const view = wrapper.get('.view').element
    const read = vi.spyOn(fake.api.codex, 'openEntry')
    const write = vi.spyOn(fake.api.codex, 'saveEntryText')
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(wrapper.get('.edit').text()).toBe('הצגת העורך')
    expect(wrapper.get('.notice').text()).toContain('הטיוטה הנוכחית')
    expect(wrapper.get('.view').element).toBe(view)
    expect(wrapper.get('.view h2').text()).toBe('Revised history')
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    await useEditorStore().flush()
    wrapper.unmount()
  })

  it('keeps references readable during conflicts and explains blocked editor navigation', async () => {
    const editor = useEditorStore()
    editor.edit('Unsaved manuscript.')
    editor.saveState = 'conflict'
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    expect(wrapper.get('.view').text()).toContain('History')
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    expect(editor.entry?.path).toBe('The Ferry.md')
    expect(wrapper.get('[role=alert]').text()).toContain('Resolve')
    const open = vi.spyOn(fake.api.codex, 'openEntry')
    const write = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    const button = wrapper.get('.edit').element
    const scroller = wrapper.get('.reference-panel').element
    scroller.scrollTop = 125
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).not.toContain('Resolve')
    expect(wrapper.get('[role=alert]').text()).toContain('שינויים שלא נשמרו')
    expect(wrapper.get('.edit').element).toBe(button)
    expect(scroller.scrollTop).toBe(125)
    expect(editor.text).toBe('Unsaved manuscript.')
    expect(open).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('retains the semantic editor failure independently of subsequent editor notices', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel, { attachTo: document.body })
    await flushPromises()
    const path = 'characters/יעל <img src=x>.md'
    const open = vi.spyOn(fake.api.codex, 'openEntry').mockResolvedValue({
      ok: false,
      error: { code: 'not-found', message: 'legacy', diagnostic: { reason: 'file-missing', path } }
    })
    const button = wrapper.get<HTMLButtonElement>('.edit').element
    button.focus()
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain('no longer exists')
    useEditorStore().actionError = 'A later unrelated action.'
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain(`\u2068${path}\u2069`)
    expect(wrapper.get('[role=alert]').text()).not.toMatch(/no longer exists|legacy|unrelated/u)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(document.activeElement).toBe(button)
    expect(open).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('keeps legacy failures explicit and clears the notice after a successful retry', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    vi.spyOn(fake.api.codex, 'openEntry').mockResolvedValueOnce({
      ok: false,
      error: { code: 'test', message: 'EACCES <img src=x>' }
    })
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toBe('EACCES <img src=x>')
    expect(wrapper.find('img').exists()).toBe(false)
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
    expect(useEditorStore().entry?.path).toBe('characters/Ilka.md')
    wrapper.unmount()
  })

  it('localizes the explicit fallback when the editor has no failure source', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    vi.spyOn(useEditorStore(), 'open').mockResolvedValueOnce(false)
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toBe(
      'This document could not be opened in the editor.'
    )
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toBe('לא ניתן לפתוח את המסמך בעורך.')
    wrapper.unmount()
  })

  it.each(['switch', 'return', 'unmount'] as const)(
    'does not change the inspector after a late successful action and %s',
    async (change) => {
      const reference = useReferenceStore()
      reference.open('characters/Ilka.md')
      const wrapper = mount(ReferencePanel)
      await flushPromises()
      let finish: ((opened: boolean) => void) | undefined
      vi.spyOn(useEditorStore(), 'open').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      await wrapper.get('.edit').trigger('click')
      if (change === 'unmount') wrapper.unmount()
      else {
        reference.open('locations/Marrow.md')
        await flushPromises()
        if (change === 'return') {
          reference.open('characters/Ilka.md')
          await flushPromises()
        }
      }
      useLayoutStore().rightTab = 'reference'
      if (finish === undefined) throw new Error('Missing pending action')
      finish(true)
      await flushPromises()
      expect(useLayoutStore().rightTab).toBe('reference')
      if (change !== 'unmount') wrapper.unmount()
    }
  )

  it.each(['switch', 'return', 'unmount'] as const)(
    'ignores late reference action failures after %s',
    async (change) => {
      const reference = useReferenceStore()
      reference.open('characters/Ilka.md')
      const wrapper = mount(ReferencePanel)
      await flushPromises()
      let finish: ((result: ApiResult<EntryTextDto>) => void) | undefined
      vi.spyOn(fake.api.codex, 'openEntry').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      await wrapper.get('.edit').trigger('click')
      await flushPromises()
      if (change === 'unmount') wrapper.unmount()
      else {
        reference.open('locations/Marrow.md')
        await flushPromises()
        if (change === 'return') {
          reference.open('characters/Ilka.md')
          await flushPromises()
        }
      }
      useLayoutStore().rightTab = 'reference'
      const captureError = vi.spyOn(useEditorStore(), 'getActionError')
      if (finish === undefined) throw new Error('Missing pending open')
      finish({ ok: false, error: { code: 'test', message: 'Obsolete refusal.' } })
      await flushPromises()
      if (change !== 'unmount') {
        expect(wrapper.find('[role=alert]').exists()).toBe(false)
        wrapper.unmount()
      }
      expect(captureError).not.toHaveBeenCalled()
      expect(useLayoutStore().rightTab).toBe('reference')
    }
  )

  it('restores per-reference scroll across character switches and panel remounts', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    const scroller = wrapper.get('.reference-panel').element
    scroller.scrollTop = 125
    await wrapper.get('.reference-panel').trigger('scroll')
    reference.open('locations/Marrow.md')
    await flushPromises()
    expect(scroller.scrollTop).toBe(0)
    scroller.scrollTop = 45
    await wrapper.get('.reference-panel').trigger('scroll')
    reference.open('characters/Ilka.md')
    await flushPromises()
    expect(scroller.scrollTop).toBe(125)
    wrapper.unmount()
    const restored = mount(ReferencePanel)
    await flushPromises()
    expect(restored.get('.reference-panel').element.scrollTop).toBe(125)
    restored.unmount()
  })

  it('re-reads a reference after it was edited while the panel was hidden', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    wrapper.unmount()
    await useEditorStore().open('characters/Ilka.md')
    useEditorStore().edit('## A changed history\n\nWritten while Reference was hidden.')
    await useEditorStore().open('The Ferry.md')
    const restored = mount(ReferencePanel)
    await flushPromises()
    expect(restored.get('.view h2').text()).toBe('A changed history')
    expect(restored.text()).not.toContain('Showing the current editor draft')
    restored.unmount()
  })
})

describe('Reference pin', () => {
  it('pins the shown entry as a card and leaves Reference free', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const panel = mount(ReferencePanel)
    await flushPromises()
    await panel.get('.pin').trigger('click')
    expect(useWorkbenchStore().cards).toEqual(['characters/Ilka.md'])
    expect(useReferenceStore().path).toBe('characters/Ilka.md')
  })
})

describe('Reference open beside', () => {
  it('shows the referenced document in a split beside the editor', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const panel = mount(ReferencePanel)
    await flushPromises()
    await panel.get('.beside').trigger('click')
    await flushPromises()
    const workbench = useWorkbenchStore()
    const id = workbench.layout.center.splits[0]?.id ?? ''
    expect(workbench.splits[id]?.path).toBe('characters/Ilka.md')
  })
})
