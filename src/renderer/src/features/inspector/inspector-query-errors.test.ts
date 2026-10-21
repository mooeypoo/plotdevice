// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiResult, StoryDateCheckDto } from '../../../../contract/dtos'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useInspectorStore } from '../../app/inspector-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import InspectorPanel from './InspectorPanel.vue'
import CodexInspector from './CodexInspector.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useUiLanguageStore().initialize()
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})
afterEach(() => vi.restoreAllMocks())

describe('inspector query failures', () => {
  it('shows exact legacy date-check detail as escaped text and clears it with empty input', async () => {
    await useEditorStore().open('First frost.md')
    const page = mount(InspectorPanel)
    await flushPromises()
    const check = vi.spyOn(fake.api.inspector, 'checkStoryDate').mockResolvedValue({
      ok: false,
      error: { code: 'custom', message: 'EACCES <img src=x> (יעל)' }
    })
    const input = page.get<HTMLInputElement>('#inspector-date')
    input.element.value = '1952'
    await input.trigger('input')
    await flushPromises()
    expect(page.get('[role="alert"]').text()).toBe('EACCES <img src=x> (יעל)')
    await useUiLanguageStore().change('he')
    expect(page.get('[role="alert"]').text()).toBe('EACCES <img src=x> (יעל)')
    expect(page.find('img').exists()).toBe(false)
    expect(check).toHaveBeenCalledOnce()
    input.element.value = ''
    await input.trigger('input')
    await flushPromises()
    expect(page.find('[role="alert"]').exists()).toBe(false)
    expect(check).toHaveBeenCalledOnce()
    page.unmount()
  })

  it.each(['chapter', 'character'] as const)(
    'shows and retranslates %s date-check failures without writing or resetting the input',
    async (kind) => {
      await useEditorStore().open(kind === 'chapter' ? 'First frost.md' : 'characters/Ilka.md')
      const page =
        kind === 'chapter'
          ? mount(InspectorPanel, { attachTo: document.body })
          : mount(CodexInspector, { attachTo: document.body })
      await flushPromises()
      const check = vi.spyOn(fake.api.inspector, 'checkStoryDate').mockResolvedValue({
        ok: false,
        error: { code: 'no-project', message: 'Legacy', diagnostic: { reason: 'no-project' } }
      })
      const selector = kind === 'chapter' ? '#inspector-date' : '#codex-born'
      const input = page.get<HTMLInputElement>(selector)
      input.element.value = '1952'
      input.element.focus()
      await input.trigger('input')
      await flushPromises()
      expect(page.get('[role="alert"]').text()).toContain('No project is open')
      await useUiLanguageStore().change('he')
      expect(page.get('[role="alert"]').text()).not.toContain('No project')
      expect(page.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
      expect(check).toHaveBeenCalledOnce()
      expect(page.get(selector).element).toBe(input.element)
      expect(input.element.value).toBe('1952')
      expect(document.activeElement).toBe(input.element)
      expect(fake.saves).toEqual([])
      expect(fake.codexWrites).toEqual([])
      check.mockRestore()
      input.element.value = '1953'
      await input.trigger('input')
      await flushPromises()
      expect(page.find('[role="alert"]').exists()).toBe(false)
      page.unmount()
    }
  )

  it.each(['chapter', 'character'] as const)(
    'shows vocabulary failures in the %s inspector even without properties',
    async (kind) => {
      const inspector = useInspectorStore()
      await inspector.loadVocabulary()
      const vocabulary = inspector.vocabulary
      const load = vi.spyOn(fake.api.inspector, 'getVocabulary').mockResolvedValue({
        ok: false,
        error: { code: 'no-project', message: 'Legacy', diagnostic: { reason: 'no-project' } }
      })
      await inspector.loadVocabulary()
      const page = kind === 'chapter' ? mount(InspectorPanel) : mount(CodexInspector)
      expect(page.get('[role="alert"]').text()).toContain('No project')
      await inspector.addStatus('new')
      expect(page.get('[role="alert"]').text()).toContain('No project')
      await useUiLanguageStore().change('he')
      expect(page.get('[role="alert"]').text()).not.toContain('No project')
      expect(inspector.vocabulary?.calendar).toBe(vocabulary?.calendar)
      expect(load).toHaveBeenCalledOnce()
      load.mockRestore()
      await inspector.loadVocabulary()
      await flushPromises()
      expect(page.find('[role="alert"]').exists()).toBe(false)
      page.unmount()
    }
  )

  it('rejects a date reply after clearing input and after changing documents', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    const page = mount(InspectorPanel)
    await flushPromises()
    const pending: ((result: ApiResult<StoryDateCheckDto>) => void)[] = []
    vi.spyOn(fake.api.inspector, 'checkStoryDate').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    const input = page.get<HTMLInputElement>('#inspector-date')
    input.element.value = '1952'
    await input.trigger('input')
    input.element.value = ''
    await input.trigger('input')
    pending[0]?.({ ok: false, error: { code: 'custom', message: 'Old failure' } })
    await flushPromises()
    expect(page.find('[role="alert"]').exists()).toBe(false)
    input.element.value = '1953'
    await input.trigger('input')
    await editor.open('The Ferry.md')
    pending[1]?.({ ok: false, error: { code: 'custom', message: 'Old document failure' } })
    await flushPromises()
    expect(page.text()).not.toContain('Old document failure')
    page.unmount()
  })
})
