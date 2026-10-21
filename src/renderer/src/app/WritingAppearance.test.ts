// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WritingAppearance from './WritingAppearance.vue'
import { useWritingPreferencesStore } from './writing-preferences-store'
import { useUiLanguageStore } from './ui-language-store'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('WritingAppearance', () => {
  it('uses a native popover for keyboard dismissal and outside-click handling', () => {
    const wrapper = mount(WritingAppearance)
    expect(wrapper.get('[aria-label="Writing appearance"]').attributes('popovertarget')).toBe(
      'writing-appearance'
    )
    expect(wrapper.get('#writing-appearance').attributes()).toHaveProperty('popover')
    expect(
      wrapper.get('[aria-label="Close writing appearance"]').attributes('popovertargetaction')
    ).toBe('hide')
    wrapper.unmount()
  })

  it('provides labelled keyboard-adjustable controls with exact limits and live values', async () => {
    const wrapper = mount(WritingAppearance)
    const size = wrapper.get<HTMLInputElement>('#prose-size')
    const width = wrapper.get<HTMLInputElement>('#prose-width')
    expect(size.element.value).toBe('19')
    expect(width.element.value).toBe('66')
    expect(size.attributes()).toMatchObject({ type: 'range', min: '14', max: '28', step: '1' })
    expect(width.attributes()).toMatchObject({ type: 'range', min: '45', max: '90', step: '1' })
    expect(wrapper.get('label[for="prose-size"]').text()).toBe('Prose size')
    expect(wrapper.get('label[for="prose-width"]').text()).toBe('Line width')
    await size.setValue('24')
    await width.setValue('80')
    expect(useWritingPreferencesStore().fontSize).toBe(24)
    expect(useWritingPreferencesStore().lineWidth).toBe(80)
    expect(wrapper.get('output[for="prose-size"]').text()).toBe('24 px')
    expect(wrapper.get('output[for="prose-width"]').text()).toBe('80 ch')
    await wrapper.get('.reset').trigger('click')
    expect(wrapper.get('output[for="prose-size"]').text()).toBe('19 px')
    expect(wrapper.get('output[for="prose-width"]').text()).toBe('66 ch')
    wrapper.unmount()
  })

  it('shows storage failures rather than suggesting settings were saved', async () => {
    const wrapper = mount(WritingAppearance)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Full')
      }
    })
    useWritingPreferencesStore().setFontSize(24)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('could not be saved')
    wrapper.unmount()
  })

  it('retranslates a visible storage failure without resetting controls, focus or settings', async () => {
    const wrapper = mount(WritingAppearance, { attachTo: document.body })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const get = vi.fn()
    const set = vi.fn(() => {
      throw new Error('Full')
    })
    vi.stubGlobal('localStorage', { getItem: get, setItem: set })
    const preferences = useWritingPreferencesStore()
    preferences.setFontSize(24)
    const size = wrapper.get<HTMLInputElement>('#prose-size').element
    size.focus()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role=status]').text()).toContain('could not be saved')
    set.mockClear()
    warn.mockClear()
    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role=status]').text()).not.toContain('could not be saved')
    expect(wrapper.get('[role=status]').text()).toContain('לא ניתן לשמור')
    expect(wrapper.get('#prose-size').element).toBe(size)
    expect(size.value).toBe('24')
    expect(document.activeElement).toBe(size)
    expect(preferences.fontSize).toBe(24)
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
