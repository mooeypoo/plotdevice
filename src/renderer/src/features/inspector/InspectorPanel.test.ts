// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoryDateCheckDto } from '../../../../contract/dtos'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import InspectorPanel from './InspectorPanel.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useManuscriptStore().load()
})

describe('InspectorPanel', () => {
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
