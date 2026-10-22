// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, type Ref } from 'vue'
import { useTypingFade } from './use-typing-fade'
import { useWritingPreferencesStore } from './writing-preferences-store'

let fading: Ref<boolean> | undefined
const Host = defineComponent({
  setup() {
    fading = useTypingFade()
    return () => h('div', [h('div', { class: 'cm-content', tabindex: 0 }), h('button', 'other')])
  }
})

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

const type = (element: Element, key = 'a'): void => {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useTypingFade', () => {
  it('does nothing until the writer turns it on', () => {
    const host = mount(Host, { attachTo: document.body })
    type(host.get('.cm-content').element)
    expect(fading?.value).toBe(false)
    host.unmount()
  })

  it('fades while typing prose, and wakes on pointer movement or leaving the prose', () => {
    useWritingPreferencesStore().setFadeWhileTyping(true)
    const host = mount(Host, { attachTo: document.body })
    const prose = host.get('.cm-content').element
    type(prose, 'ArrowLeft')
    expect(fading?.value).toBe(false)
    type(prose)
    expect(fading?.value).toBe(true)
    document.dispatchEvent(new PointerEvent('pointermove'))
    expect(fading?.value).toBe(false)
    type(prose, 'Enter')
    expect(fading?.value).toBe(true)
    host.get('button').element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(fading?.value).toBe(false)
    type(host.get('button').element)
    expect(fading?.value).toBe(false)
    host.unmount()
  })

  it('remembers the choice with the other writing preferences', () => {
    useWritingPreferencesStore().setFadeWhileTyping(true)
    expect(JSON.parse(localStorage.getItem('plotdevice.writingPreferences') ?? '{}')).toMatchObject(
      {
        fadeWhileTyping: true
      }
    )
    setActivePinia(createPinia())
    expect(useWritingPreferencesStore().fadeWhileTyping).toBe(true)
  })
})
