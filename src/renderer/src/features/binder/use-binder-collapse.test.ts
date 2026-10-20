// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useBinderCollapse } from './use-binder-collapse'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useBinderCollapse', () => {
  it('starts expanded and persists explicitly collapsed parts across sessions', () => {
    const binder = useBinderCollapse(() => '/book')
    expect(binder.isExpanded('Part One.md')).toBe(true)
    binder.setExpanded('Part One.md', false)
    setActivePinia(createPinia())
    expect(useBinderCollapse(() => '/book').isExpanded('Part One.md')).toBe(false)
  })

  it('isolates the same part path in different projects, even when the root changes in place', () => {
    const root = ref('/first')
    const binder = useBinderCollapse(() => root.value)
    binder.setExpanded('Part One.md', false)
    root.value = '/second'
    expect(binder.isExpanded('Part One.md')).toBe(true)
    root.value = '/first'
    expect(binder.isExpanded('Part One.md')).toBe(false)
  })

  it('remembers expansion and leaves other projects and parts intact', () => {
    const first = useBinderCollapse(() => '/first')
    const second = useBinderCollapse(() => '/second')
    first.setExpanded('Part One.md', false)
    first.setExpanded('Part Two.md', false)
    second.setExpanded('Part One.md', false)
    first.setExpanded('Part One.md', true)
    setActivePinia(createPinia())
    const restored = useBinderCollapse(() => '/first')
    expect(restored.isExpanded('Part One.md')).toBe(true)
    expect(restored.isExpanded('Part Two.md')).toBe(false)
    expect(useBinderCollapse(() => '/second').isExpanded('Part One.md')).toBe(false)
  })

  it('uses paths rather than order and treats a renamed part as new', () => {
    const binder = useBinderCollapse(() => '/book')
    binder.setExpanded('Part One.md', false)
    expect(binder.isExpanded('Part Two.md')).toBe(true)
    expect(binder.isExpanded('Renamed.md')).toBe(true)
    binder.setExpanded('Part One.md', false)
    binder.setExpanded('Part One.md', true)
    expect(binder.isExpanded('Part One.md')).toBe(true)
  })
})
