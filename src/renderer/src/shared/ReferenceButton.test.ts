// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiLanguageStore } from '../app/ui-language-store'
import ReferenceButton from './ReferenceButton.vue'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('ReferenceButton localization', () => {
  it('translates accessibility copy without changing the title or action', async () => {
    const wrapper = mount(ReferenceButton, { props: { title: 'יעל <img src=x> / Ilka' } })
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toContain('Open')
    expect(button.attributes('aria-label')).toContain('\u2068יעל <img src=x> / Ilka\u2069')
    await button.trigger('click')
    expect(wrapper.emitted('open')).toEqual([[]])

    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('button').attributes('aria-label')).toContain('פתיחת')
    expect(wrapper.get('button').attributes('aria-label')).toContain(
      '\u2068יעל <img src=x> / Ilka\u2069'
    )
    expect(wrapper.get('button').attributes('title')).toBe('פתיחה לעיון')
    expect(wrapper.get('button').element).toBe(button.element)
    wrapper.unmount()
  })
})
