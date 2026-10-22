// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLayoutStore } from './layout-store'
import RightPanel from './RightPanel.vue'
import { resizeArea } from '../workbench/model/operations'
import { useWorkbenchStore } from './workbench-store'
import { useUiLanguageStore } from './ui-language-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { plotDeviceApi } from './plot-device-api'

let measure: (() => void) | undefined
/** The outline's preferred width: the size of the workbench dock holding it. */
const preferredWidth = (): number => useWorkbenchStore().layout.end.size
let bodyWidth = 1200
const wrappers: ReturnType<typeof mount>[] = []

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  document.documentElement.dir = 'ltr'
  useLayoutStore().rightTab = 'outline'
  bodyWidth = 1200
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => bodyWidth)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        measure = callback
      }
      observe(): void {}
      disconnect(): void {}
    }
  )
})

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.dir = 'ltr'
})

function mountPanel() {
  const wrapper = mount(
    {
      components: { RightPanel },
      template: '<div><main></main><RightPanel /></div>'
    },
    {
      global: { stubs: { OutlinePanel: true, InspectorPanel: true, CodexInspector: true } }
    }
  )
  wrappers.push(wrapper)
  return wrapper
}

describe('outline panel width', () => {
  it('expands and restores the outline without widening Properties', async () => {
    const wrapper = mountPanel()
    const right = wrapper.get('.right')
    expect(right.attributes('style')).toContain('width: 320px')
    await wrapper.get('.expand').trigger('click')
    expect(right.attributes('style')).toContain('width: 560px')
    expect(wrapper.get('.expand').attributes('aria-expanded')).toBe('true')
    await wrapper.get('.expand').trigger('click')
    expect(right.attributes('style')).toContain('width: 320px')
    useLayoutStore().rightTab = 'properties'
    await flushPromises()
    expect(right.attributes('style') ?? '').not.toContain('width:')
    expect(wrapper.find('[role="separator"]').exists()).toBe(false)
  })

  it('resizes with keyboard controls and remembers the preferred width', async () => {
    const wrapper = mountPanel()
    const handle = wrapper.get('[role="separator"]')
    await handle.trigger('keydown', { key: 'ArrowLeft' })
    expect(handle.attributes('aria-valuenow')).toBe('340')
    await handle.trigger('keydown', { key: 'ArrowRight' })
    expect(handle.attributes('aria-valuenow')).toBe('320')
    await handle.trigger('keydown', { key: 'End' })
    expect(handle.attributes('aria-valuenow')).toBe('720')
    await handle.trigger('keydown', { key: 'Home' })
    expect(handle.attributes('aria-valuenow')).toBe('240')
    expect(JSON.parse(localStorage.getItem('plotdevice.workbench') ?? '{}')).toMatchObject({
      arrangements: { write: { end: { size: 240 } } }
    })
  })

  it('shares the reading width with Reference while leaving Properties unchanged', async () => {
    const wrapper = mountPanel()
    useLayoutStore().rightTab = 'reference'
    await flushPromises()
    const handle = wrapper.get('[role="separator"]')
    expect(handle.attributes('aria-label')).toBe('Reference panel width')
    await handle.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.get('.right').attributes('style')).toContain('width: 340px')
    useLayoutStore().rightTab = 'outline'
    await flushPromises()
    expect(wrapper.get('.right').attributes('style')).toContain('width: 340px')
  })

  it('constrains expansion on smaller windows without overwriting the preferred width', async () => {
    useWorkbenchStore().apply((layout) => resizeArea(layout, 'end', 600))
    const wrapper = mountPanel()
    bodyWidth = 700
    measure?.()
    await flushPromises()
    expect(wrapper.get('[role="separator"]').attributes('aria-valuenow')).toBe('420')
    await wrapper.get('.expand').trigger('click')
    expect(wrapper.get('.right').attributes('style')).toContain('width: 420px')
    expect(preferredWidth()).toBe(600)
    bodyWidth = 1200
    measure?.()
    await flushPromises()
    expect(wrapper.get('.right').attributes('style')).toContain('width: 600px')
  })

  it('resizes by pointer, clamps at the maximum, and saves only the finished drag', async () => {
    const wrapper = mountPanel()
    const handle = wrapper.get('[role="separator"]')
    Object.defineProperty(handle.element, 'setPointerCapture', { value: vi.fn() })
    await handle.trigger('pointerdown', { button: 0, clientX: 800, pointerId: 1 })
    await handle.trigger('pointermove', { clientX: 650, pointerId: 1 })
    expect(handle.attributes('aria-valuenow')).toBe('470')
    expect(preferredWidth()).toBe(320)
    await handle.trigger('pointermove', { clientX: 0, pointerId: 1 })
    expect(handle.attributes('aria-valuenow')).toBe('720')
    await handle.trigger('pointerup', { pointerId: 1 })
    expect(preferredWidth()).toBe(720)
  })

  it('resizes from the inline-start edge and with directional keys in Hebrew', async () => {
    const wrapper = mountPanel()
    const language = useUiLanguageStore()
    await language.change('he')
    await flushPromises()
    expect(document.documentElement.dir).toBe('rtl')
    const handle = wrapper.get('[role="separator"]')
    Object.defineProperty(handle.element, 'setPointerCapture', { value: vi.fn() })

    await handle.trigger('keydown', { key: 'ArrowLeft' })
    expect(handle.attributes('aria-valuenow')).toBe('300')
    await handle.trigger('keydown', { key: 'ArrowRight' })
    expect(handle.attributes('aria-valuenow')).toBe('320')
    await handle.trigger('pointerdown', { button: 0, clientX: 800, pointerId: 1 })
    await handle.trigger('pointermove', { clientX: 950, pointerId: 1 })
    expect(handle.attributes('aria-valuenow')).toBe('470')
    expect(preferredWidth()).toBe(320)
    await handle.trigger('pointercancel', { pointerId: 1 })
    expect(handle.attributes('aria-valuenow')).toBe('320')
    expect(preferredWidth()).toBe(320)

    await handle.trigger('pointerdown', { button: 0, clientX: 800, pointerId: 2 })
    await handle.trigger('pointermove', { clientX: 950, pointerId: 2 })
    await handle.trigger('pointerup', { pointerId: 2 })
    expect(handle.attributes('aria-valuenow')).toBe('470')
    expect(preferredWidth()).toBe(470)
    wrapper.unmount()
  })

  it('does not save a cancelled drag', async () => {
    const wrapper = mountPanel()
    const handle = wrapper.get('[role="separator"]')
    Object.defineProperty(handle.element, 'setPointerCapture', { value: vi.fn() })
    await handle.trigger('pointerdown', { button: 0, clientX: 800, pointerId: 1 })
    await handle.trigger('pointermove', { clientX: 650, pointerId: 1 })
    await handle.trigger('pointercancel', { pointerId: 1 })
    expect(handle.attributes('aria-valuenow')).toBe('320')
    expect(preferredWidth()).toBe(320)
  })
})
