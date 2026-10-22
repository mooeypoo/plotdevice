// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { useLayoutStore } from '../../app/layout-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { setArrangement } from '../model/operations'
import type { ViewId } from '../model/view-catalog'
import DockArea from './DockArea.vue'
import LayoutSwitcher from './LayoutSwitcher.vue'
import ShelfArea from './ShelfArea.vue'
import WorkbenchBody from './WorkbenchBody.vue'

// Each registered view renders a marker, so these tests exercise the shell, not the features.
vi.mock('../views/view-registry', async () => {
  const { defineComponent: define, h: render } = await import('vue')
  const titles: Partial<Record<ViewId, string>> = {
    document: 'view-write',
    binder: 'side-manuscript',
    codex: 'side-codex',
    properties: 'right-panel-properties',
    outline: 'right-panel-outline',
    reference: 'right-panel-reference',
    overview: 'view-overview',
    timeline: 'view-timeline',
    interactions: 'view-interactions',
    warnings: 'warnings-heading'
  }
  const registry = Object.fromEntries(
    Object.entries(titles).map(([id, title]) => [
      id,
      {
        id,
        title,
        icon: id,
        component: define({ render: () => render('div', { class: `view-marker ${id}` }) })
      }
    ])
  )
  return {
    VIEW_REGISTRY: registry,
    PROJECT_HOME: define({ render: () => render('div') }),
    registeredView: (id: string) => {
      const descriptor = (registry as Record<string, unknown>)[id]
      if (descriptor === undefined) throw new Error(`View not registered: ${id}`)
      return descriptor
    }
  }
})

let width = 1400
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  width = 1400
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('DockArea', () => {
  it('shows the active tab’s view and switches tabs through the layout', async () => {
    const dock = mount(DockArea, { props: { side: 'end', size: 320, maximum: 720 } })
    expect(dock.find('.view-marker.properties').exists()).toBe(true)
    const outline = dock.findAll('[role=tab]').find((tab) => tab.text() === 'Outline')
    await outline?.trigger('click')
    expect(useWorkbenchStore().layout.end.activeSection).toBe('outline')
    expect(dock.find('.view-marker.outline').exists()).toBe(true)
    expect(dock.attributes('aria-label')).toBe('Outline panel')
  })

  it.each([
    ['en', 'ArrowLeft', 340],
    ['en', 'ArrowRight', 300],
    ['he', 'ArrowLeft', 300],
    ['he', 'ArrowRight', 340]
  ] as const)('resizes the end dock in %s with %s to %ipx', async (locale, key, expected) => {
    useUiLanguageStore().locale = locale
    const dock = mount(DockArea, { props: { side: 'end', size: 320, maximum: 720 } })
    await dock.get('[role=separator]').trigger('keydown', { key })
    expect(useWorkbenchStore().layout.end.size).toBe(expected)
  })

  it('previews a pointer drag, keeps it on release, and drops it on Escape', async () => {
    const dock = mount(DockArea, { props: { side: 'start', size: 280, maximum: 720 } })
    const separator = dock.get('[role=separator]')
    const capture = vi.fn()
    Object.assign(separator.element, { setPointerCapture: capture })
    await separator.trigger('pointerdown', { button: 0, clientX: 100, clientY: 0, pointerId: 1 })
    await separator.trigger('pointermove', { clientX: 160, clientY: 0 })
    expect(dock.attributes('style')).toContain('inline-size: 340px')
    await separator.trigger('keydown', { key: 'Escape' })
    expect(dock.attributes('style')).toContain('inline-size: 280px')
    await separator.trigger('pointerup')
    expect(useWorkbenchStore().layout.start.size).toBe(280)

    await separator.trigger('pointerdown', { button: 0, clientX: 100, clientY: 0, pointerId: 1 })
    await separator.trigger('pointermove', { clientX: 140, clientY: 0 })
    await separator.trigger('pointerup')
    expect(useWorkbenchStore().layout.start.size).toBe(320)
  })

  it('stacks sections with collapsible, translated headers', async () => {
    const workbench = useWorkbenchStore()
    workbench.apply((layout) => setArrangement(layout, 'end', 'stack'))
    useUiLanguageStore().locale = 'he'
    const dock = mount(DockArea, { props: { side: 'end', size: 320, maximum: 720 } })
    expect(dock.findAll('.view-marker')).toHaveLength(3)
    const header = dock.get('.section-header')
    expect(header.attributes('aria-label')).toMatch(/[֐-׿]/u)
    await header.trigger('click')
    expect(workbench.layout.end.sections[0]?.collapsed).toBe(true)
    expect(dock.findAll('.view-marker')).toHaveLength(2)
  })

  it('mirrors only a collapsed section’s arrow in Hebrew, never the panel or its text', async () => {
    const workbench = useWorkbenchStore()
    workbench.apply((layout) => setArrangement(layout, 'end', 'stack'))
    useUiLanguageStore().locale = 'he'
    const dock = mount(DockArea, { props: { side: 'end', size: 320, maximum: 720 } })
    expect(dock.findAll('.mirrored')).toHaveLength(0)
    await dock.get('.section-header').trigger('click')
    expect(dock.findAll('.mirrored').map((arrow) => arrow.classes())).toEqual([
      ['disclosure', 'mirrored']
    ])
    useUiLanguageStore().locale = 'en'
    await flushPromises()
    expect(dock.findAll('.mirrored')).toHaveLength(0)
  })

  it('expands for the session without changing the stored size', async () => {
    const dock = mount(DockArea, { props: { side: 'end', size: 320, maximum: 720 } })
    await dock.get('.expand').trigger('click')
    expect(dock.attributes('style')).toContain('inline-size: 560px')
    expect(useWorkbenchStore().layout.end.size).toBe(320)
  })
})

describe('WorkbenchBody', () => {
  it('places the docks around the page and hides them in focus mode', async () => {
    const body = mount(WorkbenchBody, { slots: { default: () => h('p', 'page') } })
    await flushPromises()
    expect(body.findAll('aside').map((dock) => dock.attributes('id'))).toEqual([
      'workbench-start',
      'workbench-end'
    ])
    useLayoutStore().focusMode = true
    await flushPromises()
    expect(body.findAll('aside')).toHaveLength(0)
    expect(body.text()).toContain('page')
  })

  it('hides the end dock, then the start dock, as the window narrows', async () => {
    width = 700
    const body = mount(WorkbenchBody)
    await flushPromises()
    expect(body.findAll('aside').map((dock) => dock.attributes('id'))).toEqual(['workbench-start'])
    width = 400
    const narrower = mount(WorkbenchBody)
    await flushPromises()
    expect(narrower.findAll('aside')).toHaveLength(0)
  })

  it('shows the shelf only when the layout puts views there', async () => {
    const body = mount(WorkbenchBody)
    expect(body.find('#workbench-bottom').exists()).toBe(false)
    useWorkbenchStore().setActiveLayout('revise')
    await flushPromises()
    expect(body.find('#workbench-bottom .view-marker.warnings').exists()).toBe(true)
  })
})

describe('ShelfArea', () => {
  it('collapses and restores, with a translated control', async () => {
    useWorkbenchStore().setActiveLayout('revise')
    const shelf = mount(ShelfArea)
    const toggle = shelf.get('.toggle')
    expect(toggle.attributes('aria-label')).toBe('Collapse Needs attention')
    await toggle.trigger('click')
    expect(useWorkbenchStore().layout.bottom.collapsed).toBe(true)
    expect(shelf.find('.view-marker').exists()).toBe(false)
  })
})

describe('LayoutSwitcher', () => {
  it('offers the Writing layouts that can be shown, and switches between them', async () => {
    const switcher = mount(LayoutSwitcher)
    expect(switcher.findAll('option').map((option) => option.text())).toEqual(['Write', 'Revise'])
    await switcher.get('select').setValue('revise')
    expect(useWorkbenchStore().activeLayoutId).toBe('revise')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(switcher.findAll('option').map((option) => option.text())).toEqual(['כתיבה', 'עריכה'])
  })
})
