// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppMenu from './AppMenu.vue'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'
import WritingAppearance from './WritingAppearance.vue'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
})
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

async function open(menu: ReturnType<typeof mount>): Promise<void> {
  await menu.get('button[aria-haspopup=menu]').trigger('click')
  await flushPromises()
}

describe('the ⋯ menu', () => {
  it('holds the language, appearance, layouts and closing the project, in that order', async () => {
    const menu = mount(AppMenu, { attachTo: document.body })
    await open(menu)
    expect(
      menu
        .findAll('[role=menu] > [role=menuitem], [role=menu] > [role=none] > [role=menuitem]')
        .map((item) => item.attributes('data-label'))
    ).toEqual(['Interface language', 'Appearance…', 'Layout', 'Close project'])
    menu.unmount()
  })

  it('switches the interface language from a submenu, by keyboard, with the choice checked', async () => {
    const menu = mount(AppMenu, { attachTo: document.body })
    await open(menu)
    const language = menu.get('[data-opens="language"]')
    expect(document.activeElement).toBe(language.element)
    await language.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    const choices = menu.findAll('[data-submenu="language"] [role=menuitemradio]')
    expect(choices.map((choice) => choice.attributes('aria-checked'))).toEqual(['true', 'false'])
    expect(document.activeElement).toBe(choices[0]?.element)
    await menu.get('[data-submenu="language"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(choices[1]?.element)
    await choices[1]?.trigger('click')
    await flushPromises()
    expect(useUiLanguageStore().locale).toBe('he')
    menu.unmount()
  })

  it('closes a submenu with Escape, returning focus to its item', async () => {
    const menu = mount(AppMenu, { attachTo: document.body })
    await open(menu)
    await menu.get('[data-opens="language"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await menu.get('[data-submenu="language"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(menu.find('[data-submenu="language"]').exists()).toBe(false)
    expect(document.activeElement).toBe(menu.get('[data-opens="language"]').element)
    expect(menu.find('[role=menu]').exists()).toBe(true)
    menu.unmount()
  })

  it('opens Appearance', async () => {
    const appearance = mount(WritingAppearance, { attachTo: document.body })
    const menu = mount(AppMenu, { attachTo: document.body })
    // happy-dom has no popover API; the browser's opens the panel.
    const show = vi.fn<(force?: boolean) => boolean>(() => true)
    Object.defineProperty(HTMLElement.prototype, 'togglePopover', {
      value: show,
      configurable: true
    })
    await open(menu)
    await menu.get('[data-label="Appearance…"]').trigger('click')
    expect(show).toHaveBeenCalledExactlyOnceWith(true)
    expect(show.mock.contexts[0]).toBe(appearance.get('#writing-appearance').element)
    menu.unmount()
    appearance.unmount()
    Reflect.deleteProperty(HTMLElement.prototype, 'togglePopover')
  })

  it('closes the project', async () => {
    const menu = mount(AppMenu, { attachTo: document.body })
    await open(menu)
    await menu.get('[data-label="Close project"]').trigger('click')
    await flushPromises()
    expect(useWorkspaceStore().project).toBeNull()
    menu.unmount()
  })
})
