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
import OutlinePanel from './OutlinePanel.vue'
import { useUiLanguageStore } from '../../app/ui-language-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  fake.files.set('Outline.md', '# Working outline\n\n- **Arrival**: [[The Ferry]]')
  await Promise.all([useCodexStore().load(), useManuscriptStore().load()])
})

describe('OutlinePanel', () => {
  it('translates panel controls without reloading or changing the outline text', async () => {
    const listing = useCodexStore().listing
    if (listing === null) throw new Error('Expected a codex listing')
    useCodexStore().listing = {
      ...listing,
      outlines: [...listing.outlines, { path: 'Second outline.md', title: 'Second outline' }]
    }
    useLayoutStore().outlinePath = 'Outline.md'
    const wrapper = mount(OutlinePanel)
    await flushPromises()
    const view = wrapper.get('.view').element
    const authored = wrapper.get('.view').text()
    const open = vi.spyOn(fake.api.codex, 'openEntry')
    const write = vi.spyOn(fake.api.codex, 'saveEntryText')

    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(wrapper.get('.outline').attributes('aria-label')).toBe('מתווה')
    expect(wrapper.get('select').attributes('aria-label')).toBe('מתווה להצגה')
    expect(wrapper.get('button.small').text()).toBe('עריכה')
    expect(wrapper.get('.file-path').text()).toBe('Outline.md')
    expect(wrapper.get('.view').element).toBe(view)
    expect(wrapper.get('.view').text()).toBe(authored)
    expect(open).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('translates the empty-outline guidance and retains literal wikilink syntax', async () => {
    const listing = useCodexStore().listing
    if (listing === null) throw new Error('Expected a codex listing')
    useCodexStore().listing = { ...listing, outlines: [] }
    const open = vi.spyOn(fake.api.codex, 'openEntry')
    const wrapper = mount(OutlinePanel)
    await flushPromises()

    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(wrapper.get('[aria-label="מתווה"]').text()).toContain('התוכנית שלך')
    expect(wrapper.get('[aria-label="מתווה"]').text()).toContain('[[their names]]')
    expect(wrapper.get('button.primary').text()).toBe('התחלת כתיבת מתווה')
    expect(open).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('retranslates a cached link notice without replacing the reading view or retrying', async () => {
    fake.files.set('Outline.md', '## Plan\n\n[[Nobody <img src=x> יעל]]')
    const wrapper = mount(OutlinePanel, { attachTo: document.body })
    await flushPromises()
    const link = wrapper.get<HTMLAnchorElement>('.view a').element
    const view = wrapper.get('.view').element
    link.focus()
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
    expect(document.activeElement).toBe(link)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('renders the reference, then shows the live draft while the outline is edited', async () => {
    const wrapper = mount(OutlinePanel)
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Working outline')
    expect(wrapper.get('strong').text()).toBe('Arrival')
    expect(wrapper.get('.file-path').text()).toBe('Outline.md')
    await wrapper.get('header button').trigger('click')
    await flushPromises()
    expect(useEditorStore().text).toContain('# Working outline')
    expect(wrapper.find('[role=status]').text()).toContain('current draft')
    useEditorStore().edit('## Revised plan\n\n*New direction*')
    await flushPromises()
    // The panel follows the draft as it is typed (ADR 0018), and keeps it after the editor leaves.
    expect(wrapper.get('h2').text()).toBe('Revised plan')
    await useEditorStore().open('The Ferry.md')
    await flushPromises()
    expect(wrapper.get('h2').text()).toBe('Revised plan')
    expect(wrapper.get('em').text()).toBe('New direction')
    wrapper.unmount()
  })

  it('reads mixed-direction outline prose without changing its authored Markdown', async () => {
    const authored = '# מתווה\n\nEnglish paragraph.\n\n`C:/novel/Chapter.md`'
    fake.files.set('Outline.md', authored)
    const wrapper = mount(OutlinePanel)
    await flushPromises()

    expect(wrapper.get('.view h1').attributes('dir')).toBe('auto')
    expect(wrapper.get('.view p').attributes('dir')).toBe('auto')
    expect(wrapper.get('.view p code').attributes('dir')).toBe('ltr')
    expect(wrapper.get('.view').text()).toContain('English paragraph.')
    expect(wrapper.get('.view code').text()).toBe('C:/novel/Chapter.md')

    wrapper.unmount()
  })

  it('pairs dropdown labels with their paths and bodies in both directions', async () => {
    await fake.api.codex.createOutline('Clue ledger')
    fake.files.set('Clue ledger.md', '## Clues\n\nThe missing key.')
    await useCodexStore().reload()
    const wrapper = mount(OutlinePanel)
    await flushPromises()
    const choose = wrapper.get('select')
    for (const path of ['Clue ledger.md', 'Outline.md', 'Clue ledger.md']) {
      await choose.setValue(path)
      await flushPromises()
      expect(wrapper.get('.file-path').text()).toBe(path)
      expect(wrapper.get('.view').text()).toContain(
        path === 'Clue ledger.md' ? 'The missing key.' : 'Arrival'
      )
    }
    wrapper.unmount()
  })
})
