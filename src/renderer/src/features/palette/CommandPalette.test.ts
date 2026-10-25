// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { usePaletteStore } from '../../app/palette-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useReferenceStore } from '../../app/reference-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import '../../workbench/views/view-registry'
import CommandPalette from './CommandPalette.vue'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
  useDocumentTabsStore().restore('/book')
})
afterEach(async () => {
  await useEditorStore().flush()
  vi.restoreAllMocks()
})

async function openPalette() {
  const palette = mount(CommandPalette, { attachTo: document.body })
  usePaletteStore().show()
  await flushPromises()
  return palette
}

const titles = (palette: Awaited<ReturnType<typeof openPalette>>): string[] =>
  palette.findAll('[role=option] .title').map((option) => option.text())

describe('CommandPalette', () => {
  it('opens with focus in its field and lists views and commands', async () => {
    const palette = await openPalette()
    const input = palette.get('input')
    expect(document.activeElement).toBe(input.element)
    expect(titles(palette)).toContain('Timeline')
    expect(titles(palette)).toContain('Use the Side by side layout')
    palette.unmount()
  })

  it('finds entries by title and opens a chapter in the editor', async () => {
    const palette = await openPalette()
    await palette.get('input').setValue('frost')
    expect(titles(palette)[0]).toBe('First frost')
    await palette.get('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('First frost.md')
    expect(usePaletteStore().open).toBe(false)
    palette.unmount()
  })

  it('looks codex entries up in Reference, and opens beside with Shift+Enter', async () => {
    const palette = await openPalette()
    await palette.get('input').setValue('ilka')
    await palette.get('input').trigger('keydown', { key: 'Enter' })
    expect(useReferenceStore().path).toBe('characters/Ilka.md')
    usePaletteStore().show()
    await flushPromises()
    await palette.get('input').setValue('ferry')
    expect(palette.text()).toContain('opens it beside the page')
    await palette.get('input').trigger('keydown', { key: 'Enter', shiftKey: true })
    await flushPromises()
    const workbench = useWorkbenchStore()
    expect(Object.values(workbench.splits).map((split) => split.path)).toEqual(['The Ferry.md'])
    palette.unmount()
  })

  it('moves through results with the arrow keys and names the active one', async () => {
    const palette = await openPalette()
    const input = palette.get('input')
    const first = input.attributes('aria-activedescendant')
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).not.toBe(first)
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(input.attributes('aria-activedescendant')).toBe(first)
    await input.trigger('keydown', { key: 'ArrowUp' })
    const options = palette.findAll('[role=option]')
    expect(options.at(-1)?.attributes('aria-selected')).toBe('true')
    palette.unmount()
  })

  it('runs menu commands and switches layouts through navigation', async () => {
    const palette = await openPalette()
    await palette.get('input').setValue('side by side')
    await palette.get('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useWorkbenchStore().activeLayoutId).toBe('revise')
    usePaletteStore().show()
    await flushPromises()
    const before = useWorkbenchNavigation().isAreaOpen('binder')
    await palette.get('input').setValue('toggle manuscript')
    await palette
      .findAll('[role=option]')
      .find((option) => option.attributes('id')?.includes('command'))
      ?.trigger('click')
    expect(useWorkbenchNavigation().isAreaOpen('binder')).toBe(!before)
    palette.unmount()
  })

  it('closes on Escape and returns focus', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const palette = await openPalette()
    await palette.get('input').trigger('keydown', { key: 'Escape' })
    expect(palette.find('[role=dialog]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger)
    palette.unmount()
    trigger.remove()
  })

  it('speaks Hebrew, with a plural count and no results message', async () => {
    useUiLanguageStore().locale = 'he'
    const palette = await openPalette()
    await palette.get('input').setValue('frost')
    expect(palette.get('[role=status]').text()).toBe('1 תוצאה')
    await palette.get('input').setValue('zzzz')
    expect(palette.text()).toContain('אין התאמות.')
    palette.unmount()
  })

  it('returns focus to the writing after looking a character up in Reference', async () => {
    // Regression: the palette closed without returning focus, so the writer had to click back.
    const prose = document.createElement('div')
    prose.tabIndex = 0
    document.body.append(prose)
    prose.focus()
    const palette = await openPalette()
    await palette.get('input').setValue('ilka')
    await palette.get('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useReferenceStore().path).toBe('characters/Ilka.md')
    expect(document.activeElement).toBe(prose)
    palette.unmount()
    prose.remove()
  })

  it('leaves focus where a command put it', async () => {
    const prose = document.createElement('div')
    prose.tabIndex = 0
    const elsewhere = document.createElement('button')
    document.body.append(prose, elsewhere)
    prose.focus()
    const palette = await openPalette()
    await usePaletteStore().runAndClose(() => {
      elsewhere.focus()
    })
    expect(document.activeElement).toBe(elsewhere)
    palette.unmount()
    prose.remove()
    elsewhere.remove()
  })

  it('finds Details by the name the side toggle uses', async () => {
    const palette = await openPalette()
    await palette.get('input').setValue('details')
    expect(titles(palette)).toContain('Show Details')
    palette.unmount()
  })
})
