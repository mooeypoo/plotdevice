// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RenderedMarkdown from './RenderedMarkdown.vue'

const targets = [{ name: 'Ilka', path: 'characters/Ilka.md', type: 'character' }] as const

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('RenderedMarkdown peeks', () => {
  const mountView = () =>
    mount(RenderedMarkdown, {
      props: { text: 'Ask [[Ilka]] about the ledger.', linkTargets: targets }
    })

  it('asks to peek after the pointer rests on a project link, and not before', async () => {
    const view = mountView()
    const link = view.get('a.markdown-link')
    await link.trigger('mouseover')
    vi.advanceTimersByTime(400)
    expect(view.emitted('peek')).toBeUndefined()
    vi.advanceTimersByTime(100)
    expect(view.emitted('peek')?.[0]?.[0]).toEqual({ kind: 'wiki', target: 'Ilka' })
    expect(view.emitted('peek')?.[0]?.[2]).toBe(false)
  })

  it('cancels a pending peek when the pointer leaves, and reports the end', async () => {
    const view = mountView()
    const link = view.get('a.markdown-link')
    await link.trigger('mouseover')
    await link.trigger('mouseout', { relatedTarget: document.body })
    vi.advanceTimersByTime(600)
    expect(view.emitted('peek')).toBeUndefined()
    expect(view.emitted('peekEnd')).toHaveLength(1)
  })

  it('peeks at a focused link with Ctrl/Cmd+Shift+Enter', async () => {
    const view = mountView()
    await view
      .get('a.markdown-link')
      .trigger('keydown', { key: 'Enter', ctrlKey: true, shiftKey: true })
    expect(view.emitted('peek')?.[0]?.[2]).toBe(true)
    await view.get('a.markdown-link').trigger('keydown', { key: 'Enter' })
    expect(view.emitted('peek')).toHaveLength(1)
  })
})
