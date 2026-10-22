// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { PEEK_GRACE_MS, usePeekStore } from '../../app/peek-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { ENTRY_PATH_DRAG_TYPE } from '../../shared/drag-types'
import CardStack from './CardStack.vue'
import EntryCard from './EntryCard.vue'
import PeekLayer from './PeekLayer.vue'

const ILKA = 'characters/Ilka.md'
const BEA = 'characters/Aunt Bea.md'
let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('EntryCard', () => {
  it('shows the title, chosen fields and opening text without saving anything', async () => {
    const save = vi.spyOn(fake.api.codex, 'saveEntryText')
    const card = mount(EntryCard, { props: { path: ILKA } })
    await flushPromises()
    expect(card.get('h3').text()).toBe('Ilka')
    expect(card.get('dl').text()).toContain('Role')
    expect(card.get('dl').text()).toContain('lead')
    expect(card.text()).toContain('Ilka grafts pear trees.')
    expect(save).not.toHaveBeenCalled()
  })

  it('follows the editor’s live draft of the same entry', async () => {
    const editor = useEditorStore()
    await editor.open(ILKA)
    const card = mount(EntryCard, { props: { path: ILKA } })
    await flushPromises()
    editor.edit('Ilka mends the fence.')
    await flushPromises()
    expect(card.text()).toContain('Ilka mends the fence.')
    expect(card.get('[role=status]').text()).toContain('current draft')
    await editor.flush()
  })

  it('pins itself and brings the card stack forward', async () => {
    const card = mount(EntryCard, { props: { path: ILKA } })
    await flushPromises()
    await card.get('button[aria-pressed=false]').trigger('click')
    const workbench = useWorkbenchStore()
    expect(workbench.cards).toEqual([ILKA])
    expect(workbench.layout.end.sections.map((section) => section.view)).toContain('card-stack')
    expect(card.get('button[aria-pressed=true]').attributes('aria-label')).toBe('Unpin ⁨Ilka⁩')
  })
})

describe('CardStack', () => {
  const openMenu = async (stack: ReturnType<typeof mount>, index: number) => {
    await stack.findAll('button[aria-haspopup=menu]')[index]?.trigger('click')
    await flushPromises()
    return stack.findAll('[role=menuitem]')
  }

  it('explains how to pin when empty', () => {
    const stack = mount(CardStack)
    expect(stack.get('.empty').text()).toContain('Pin')
  })

  it('reorders, changes fields, collapses and unpins from each card', async () => {
    const workbench = useWorkbenchStore()
    workbench.pinCard(ILKA)
    workbench.pinCard(BEA)
    const stack = mount(CardStack, { attachTo: document.body })
    await flushPromises()

    let items = await openMenu(stack, 0)
    await items.find((item) => item.text() === 'Move down')?.trigger('click')
    expect(workbench.cards).toEqual([BEA, ILKA])

    items = await openMenu(stack, 1)
    await items.find((item) => item.text() === 'Hide Role on cards')?.trigger('click')
    expect(workbench.cardFieldsFor('character')).toEqual(['aliases', 'groups'])

    await stack.findAll('.disclosure')[1]?.trigger('click')
    expect(workbench.collapsedCards).toEqual([ILKA])
    await flushPromises()
    expect(stack.findAll('article')[1]?.find('dl').exists()).toBe(false)

    items = await openMenu(stack, 1)
    await items.find((item) => item.text().startsWith('Unpin'))?.trigger('click')
    expect(workbench.cards).toEqual([BEA])
    stack.unmount()
  })

  it('reorders by dragging a card onto another', async () => {
    const workbench = useWorkbenchStore()
    workbench.pinCard(ILKA)
    workbench.pinCard(BEA)
    const stack = mount(CardStack)
    await flushPromises()
    const [first, second] = stack.findAll('li')
    await second?.trigger('dragstart')
    await first?.trigger('drop')
    expect(workbench.cards).toEqual([BEA, ILKA])
  })
})

describe('PeekLayer', () => {
  const near = { left: 100, right: 140, top: 100, bottom: 120 }

  it('takes focus for a keyboard peek and returns it on Escape', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const layer = mount(PeekLayer, { attachTo: document.body })
    usePeekStore().show(ILKA, near, true)
    await flushPromises()
    const dialog = layer.get('[role=dialog]')
    expect(dialog.attributes('aria-label')).toBe('Preview of ⁨Ilka⁩')
    expect(document.activeElement).toBe(dialog.element)
    await dialog.trigger('keydown', { key: 'Escape' })
    expect(layer.find('[role=dialog]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger)
    layer.unmount()
    trigger.remove()
  })

  it('closes a pointer peek after a short grace unless the pointer reaches the card', async () => {
    vi.useFakeTimers()
    const peek = usePeekStore()
    const layer = mount(PeekLayer)
    peek.show(ILKA, near, false)
    await flushPromises()
    peek.endHover()
    await layer.get('[role=dialog]').trigger('pointerenter')
    vi.advanceTimersByTime(PEEK_GRACE_MS + 50)
    expect(peek.path).toBe(ILKA)
    await layer.get('[role=dialog]').trigger('pointerleave')
    vi.advanceTimersByTime(PEEK_GRACE_MS + 50)
    expect(peek.path).toBeNull()
  })

  it('stays open while the pointer is on the card, even over links inside it', async () => {
    // Regression: leaving a link inside the card started the close timer, and hovering one
    // replaced the card, so the writer couldn't reach Pin.
    fake.files.set(ILKA, 'Ilka trusts [[Aunt Bea]] with the ledger.\n')
    vi.useFakeTimers()
    const peek = usePeekStore()
    const layer = mount(PeekLayer)
    peek.show(ILKA, near, false)
    await vi.runOnlyPendingTimersAsync()
    await flushPromises()
    const dialog = layer.get('[role=dialog]')
    await dialog.trigger('pointerenter')
    const inner = dialog.get('a.markdown-link')
    await inner.trigger('mouseover')
    await inner.trigger('mouseout', { relatedTarget: document.body })
    vi.advanceTimersByTime(PEEK_GRACE_MS * 3)
    expect(peek.path).toBe(ILKA)
    await dialog.trigger('pointerleave')
    vi.advanceTimersByTime(PEEK_GRACE_MS + 50)
    expect(peek.path).toBeNull()
  })

  it('opens toward the right-hand edge in Hebrew', async () => {
    useUiLanguageStore().locale = 'he'
    const layer = mount(PeekLayer)
    usePeekStore().show(ILKA, { left: 700, right: 760, top: 100, bottom: 120 }, false)
    await flushPromises()
    expect(layer.get('[role=dialog]').attributes('style')).toContain('left: 400px')
  })
})

describe('CardStack drops', () => {
  it('pins an entry dragged in from elsewhere, at the drop position', async () => {
    const workbench = useWorkbenchStore()
    workbench.pinCard(BEA)
    const stack = mount(CardStack)
    await flushPromises()
    const dataTransfer = { getData: (type: string) => (type === ENTRY_PATH_DRAG_TYPE ? ILKA : '') }
    await stack.get('li').trigger('drop', { dataTransfer })
    expect(workbench.cards).toEqual([ILKA, BEA])
    await stack.get('li').trigger('drop', { dataTransfer: { getData: () => 'not/listed.md' } })
    expect(workbench.cards).toEqual([ILKA, BEA])
  })
})
