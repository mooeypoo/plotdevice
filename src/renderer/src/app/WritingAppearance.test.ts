// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import WritingAppearance from './WritingAppearance.vue'
import { useWritingPreferencesStore } from './writing-preferences-store'

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
    useWritingPreferencesStore().storageNotice = 'Writing preferences could not be saved.'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('could not be saved')
    wrapper.unmount()
  })
})
