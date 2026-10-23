// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import SelectField from './SelectField.vue'
import { chooseOption, optionsOf, selectedLabel } from './select-field-testing'
import type { SelectOption } from './select-option'

const OPTIONS: SelectOption[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'outline', label: 'Outline' },
  { value: 'locked', label: 'Locked', disabled: true },
  { value: 'draft', label: 'Draft' },
  { value: 'done', label: 'Done' }
]

function mountSelect(initial = 'outline', dir: 'ltr' | 'rtl' = 'ltr') {
  const Host = defineComponent({
    components: { SelectField },
    setup: () => ({ value: ref(initial), options: OPTIONS }),
    template: `<div :dir="'${dir}'" lang="en"><label for="status">Status</label>
      <SelectField id="status" v-model="value" :options="options" /><span class="out">{{ value }}</span></div>`
  })
  return mount(Host, { attachTo: document.body })
}

function list(): HTMLElement | null {
  return document.querySelector('[role="listbox"]')
}

async function key(wrapper: ReturnType<typeof mountSelect>, name: string, init = {}) {
  await wrapper.get('[role="combobox"]').trigger('keydown', { key: name, ...init })
  await flushPromises()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SelectField', () => {
  it('shows the value and changes it by click', async () => {
    const wrapper = mountSelect()
    expect(selectedLabel(wrapper)).toBe('Outline')
    await chooseOption(wrapper, 'draft')
    expect(wrapper.get('.out').text()).toBe('draft')
    expect(list()).toBeNull()
    wrapper.unmount()
  })

  it('opens from its label, like a native select', async () => {
    const wrapper = mountSelect()
    await wrapper.get('label').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('moves with the arrow keys past disabled options and chooses with Enter', async () => {
    const wrapper = mountSelect()
    const trigger = wrapper.get('[role="combobox"]')
    await key(wrapper, 'ArrowDown')
    expect(trigger.attributes('aria-activedescendant')).toBe(
      list()?.querySelector('[data-value="outline"]')?.id
    )
    await key(wrapper, 'ArrowDown')
    expect(trigger.attributes('aria-activedescendant')).toBe(
      list()?.querySelector('[data-value="draft"]')?.id
    )
    await key(wrapper, 'End')
    await key(wrapper, 'Enter')
    expect(wrapper.get('.out').text()).toBe('done')
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('closes on Escape without changing the value, keeping focus', async () => {
    const wrapper = mountSelect()
    const trigger = wrapper.get('[role="combobox"]')
    ;(trigger.element as HTMLElement).focus()
    await key(wrapper, 'Enter')
    await key(wrapper, 'Home')
    await key(wrapper, 'Escape')
    expect(list()).toBeNull()
    expect(wrapper.get('.out').text()).toBe('outline')
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('jumps by typed letters, choosing directly while closed', async () => {
    const wrapper = mountSelect()
    await key(wrapper, 'd')
    expect(wrapper.get('.out').text()).toBe('draft')
    await key(wrapper, 'd')
    expect(wrapper.get('.out').text()).toBe('done')
    wrapper.unmount()
  })

  it('lists disabled options but never chooses them', async () => {
    const wrapper = mountSelect()
    const labels = (await optionsOf(wrapper)).map((option) => option.textContent.trim())
    expect(labels).toEqual(['Idea', '✓Outline', 'Locked', 'Draft', 'Done'])
    await wrapper.get('[role="combobox"]').trigger('click')
    await flushPromises()
    const locked = list()?.querySelector<HTMLElement>('[data-value="locked"]')
    expect(locked?.getAttribute('aria-disabled')).toBe('true')
    locked?.click()
    await flushPromises()
    expect(wrapper.get('.out').text()).toBe('outline')
    wrapper.unmount()
  })

  it('opens toward the inline start in right-to-left', async () => {
    const wrapper = mountSelect('outline', 'rtl')
    await wrapper.get('[role="combobox"]').trigger('click')
    await flushPromises()
    expect(list()?.getAttribute('dir')).toBe('rtl')
    expect(list()?.style.right).not.toBe('')
    expect(list()?.style.left).toBe('')
    wrapper.unmount()
  })

  it('closes when the pointer goes down elsewhere', async () => {
    const wrapper = mountSelect()
    await wrapper.get('[role="combobox"]').trigger('click')
    await flushPromises()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(list()).toBeNull()
    wrapper.unmount()
  })
})
