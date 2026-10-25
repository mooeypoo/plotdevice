// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CheckboxField from './CheckboxField.vue'
import MenuButton from './MenuButton.vue'
import RangeField from './RangeField.vue'
import SwitchField from './SwitchField.vue'

describe('CheckboxField and SwitchField', () => {
  it('stay native inputs labelled by their slot, and report the new state', async () => {
    const box = mount(CheckboxField, {
      props: { modelValue: false },
      slots: { default: 'Main cast' }
    })
    expect(box.get('label').text()).toBe('Main cast')
    await box.get('input[type="checkbox"]').setValue(true)
    expect(box.emitted('update:modelValue')).toEqual([[true]])

    const toggle = mount(SwitchField, { props: { modelValue: true }, slots: { default: 'Fade' } })
    const input = toggle.get('input')
    expect(input.attributes('role')).toBe('switch')
    expect((input.element as HTMLInputElement).checked).toBe(true)
    await input.setValue(false)
    expect(toggle.emitted('update:modelValue')).toEqual([[false]])
  })
})

describe('RangeField', () => {
  it('keeps the native range and fills the track up to the value', async () => {
    const range = mount(RangeField, { props: { modelValue: 21, min: 14, max: 28 } })
    const input = range.get('input')
    expect(input.attributes()).toMatchObject({ type: 'range', min: '14', max: '28', step: '1' })
    expect(input.attributes('style')).toContain('--fill: 50%')
    await input.setValue('24')
    expect(range.emitted('update:modelValue')).toEqual([[24]])
  })
})

describe('MenuButton', () => {
  it('draws separators and shortcuts, and focuses an item by its first letter', async () => {
    const menu = mount(MenuButton, {
      attachTo: document.body,
      props: {
        label: 'Options',
        items: [
          { key: 'a', label: 'Standard', run: () => undefined },
          { key: 'b', label: 'Side by side', run: () => undefined },
          {
            key: 'c',
            label: 'Save layout as…',
            run: () => undefined,
            separator: true,
            shortcut: 'Ctrl+S'
          }
        ]
      }
    })
    await menu.get('button').trigger('click')
    expect(menu.findAll('hr[role="separator"]')).toHaveLength(1)
    expect(menu.get('kbd').text()).toBe('Ctrl+S')
    await menu.get('[role="menu"]').trigger('keydown', { key: 's' })
    expect(document.activeElement?.textContent).toContain('Side by side')
    await menu.get('[role="menu"]').trigger('keydown', { key: 's' })
    expect(document.activeElement?.textContent).toContain('Save layout as…')
    menu.unmount()
  })
})
