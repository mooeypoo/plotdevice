// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useShortcuts } from './use-shortcuts'

describe('useShortcuts', () => {
  it('lets Escape dismiss native popovers while running the layout action', () => {
    const exitFocus = vi.fn()
    const save = vi.fn()
    const host = mount(
      defineComponent({
        setup() {
          useShortcuts([
            { key: 'Escape', preventDefault: false, run: exitFocus },
            { key: 's', mod: true, run: save }
          ])
          return () => null
        }
      })
    )
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    window.dispatchEvent(escape)
    expect(exitFocus).toHaveBeenCalledOnce()
    expect(escape.defaultPrevented).toBe(false)

    const ctrlS = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    window.dispatchEvent(ctrlS)
    expect(save).toHaveBeenCalledOnce()
    expect(ctrlS.defaultPrevented).toBe(true)

    host.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(exitFocus).toHaveBeenCalledOnce()
  })
})
