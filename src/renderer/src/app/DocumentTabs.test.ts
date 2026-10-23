// @vitest-environment happy-dom
import { undo, undoDepth } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useWorkbenchStore } from './workbench-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'
import ProjectLayout from './ProjectLayout.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
let wrapper: ReturnType<typeof mount>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  vi.spyOn(EditorView.prototype, 'focus').mockImplementation(() => undefined)
  wrapper = mount(ProjectLayout, {
    attachTo: document.body,
    global: {
      stubs: {
        TopBar: true,
        SidePanel: true,
        RightPanel: true,
        DockArea: true,
        ShelfArea: true,
        StatusBar: true
      }
    }
  })
  await flushPromises()
})
afterEach(async () => {
  await useEditorStore().flush()
  wrapper.unmount()
  vi.restoreAllMocks()
})

function prose(): EditorView {
  const dom = wrapper.get('.cm-editor').element
  if (!(dom instanceof HTMLElement)) throw new Error('Expected CodeMirror element')
  const view = EditorView.findFromDOM(dom)
  if (view === null) throw new Error('Expected mounted CodeMirror')
  return view
}
const action = (label: string) => {
  const button = wrapper
    .findAll('.document-actions button')
    .find((candidate) => candidate.text() === label)
  if (button === undefined) throw new Error(`Expected ${label}`)
  return button
}

describe('document tab writing workflow', () => {
  it('keeps keyboard focus in the strip when activating tabs with arrows, Home and End', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    await editor.open('First frost.md', { keep: true })
    await flushPromises()
    await wrapper.get('[role=tab][aria-selected=true]').trigger('keydown', { key: 'Home' })
    await flushPromises()
    expect(editor.entry?.path).toBe('The Ferry.md')
    expect(document.activeElement).toBe(wrapper.get('[role=tab][aria-selected=true]').element)
    await wrapper.get('[role=tab][aria-selected=true]').trigger('keydown', { key: 'End' })
    await flushPromises()
    expect(editor.entry?.path).toBe('First frost.md')
    expect(document.activeElement).toBe(wrapper.get('[role=tab][aria-selected=true]').element)
  })

  it('restores independent history, selection and scroll, with fresh callbacks for each document', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    await flushPromises()
    const original = editor.text
    prose().dispatch({
      changes: { from: 0, insert: 'Writing. ' },
      selection: { anchor: 4, head: 8 }
    })
    const pane = wrapper.get('.pane').element
    pane.scrollTop = 140
    await action('Pin').trigger('click')
    await editor.open('First frost.md', { keep: true })
    await flushPromises()
    expect(prose().state.selection.main.anchor).toBe(0)
    expect(pane.scrollTop).toBe(0)
    prose().dispatch({ changes: { from: 0, insert: 'Comparison. ' }, selection: { anchor: 2 } })
    pane.scrollTop = 90
    await editor.returnToWriting()
    await flushPromises()
    expect(prose().state.doc.toString()).toBe(`Writing. ${original}`)
    expect(prose().state.selection.main.anchor).toBe(4)
    expect(prose().state.selection.main.head).toBe(8)
    expect(undoDepth(prose().state)).toBe(1)
    expect(pane.scrollTop).toBe(140)
    expect(undo(prose())).toBe(true)
    expect(editor.text).toBe(original)
    await editor.open('First frost.md')
    await flushPromises()
    expect(prose().state.selection.main.anchor).toBe(2)
    expect(undoDepth(prose().state)).toBe(1)
    expect(pane.scrollTop).toBe(90)
    expect(undo(prose())).toBe(true)
    expect(editor.text).toBe('Four words are here.\n')
    expect(fake.files.get('The Ferry.md')).toBe(original)
  })

  it('discards stale editing state after an inactive document changes outside the app', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    await flushPromises()
    prose().dispatch({ changes: { from: 0, insert: 'Old history. ' }, selection: { anchor: 4 } })
    wrapper.get('.pane').element.scrollTop = 150
    await editor.open('First frost.md', { keep: true })
    fake.files.set('The Ferry.md', 'Replaced outside.')
    await editor.open('The Ferry.md')
    await flushPromises()
    expect(prose().state.doc.toString()).toBe('Replaced outside.')
    expect(undoDepth(prose().state)).toBe(0)
    expect(prose().state.selection.main.anchor).toBe(0)
    expect(wrapper.get('.pane').element.scrollTop).toBe(0)
  })

  it('preserves history across project views and keeps Writing accessible there', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    await flushPromises()
    prose().dispatch({ changes: { from: 0, insert: 'Draft. ' }, selection: { anchor: 3 } })
    useWorkbenchStore().centerView = 'overview'
    await flushPromises()
    expect(wrapper.find('.cm-editor').exists()).toBe(false)
    expect(wrapper.get('[role=tablist][aria-label="Open tabs"]').text()).toContain('Your chapter')
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    await action('Back to your chapter').trigger('click')
    await flushPromises()
    expect(useWorkbenchStore().centerView).toBe('write')
    expect(undoDepth(prose().state)).toBe(1)
    expect(prose().state.selection.main.anchor).toBe(3)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('offers preview, keep, pin, write-here, close and keyboard cycling without duplicate tabs', async () => {
    const editor = useEditorStore()
    const tabs = useDocumentTabsStore()
    await editor.open('The Ferry.md')
    await editor.open('First frost.md')
    await flushPromises()
    expect(wrapper.get('.preview').text()).toBe('Preview')
    await action('Keep open').trigger('click')
    expect(wrapper.find('.preview').exists()).toBe(false)
    await action('Write here').trigger('click')
    expect(tabs.writingPath).toBe('First frost.md')
    expect(tabs.writing?.pinned).toBe(true)
    await action('Unpin').trigger('click')
    await wrapper
      .get('[role=tab][aria-selected=true]')
      .trigger('keydown', { key: 'Tab', ctrlKey: true })
    await flushPromises()
    expect(editor.entry?.path).toBe('The Ferry.md')
    expect(tabs.documents).toHaveLength(2)
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, shiftKey: true })
    )
    await flushPromises()
    expect(editor.entry?.path).toBe('First frost.md')
    const close = wrapper.find('.close')
    expect(close.exists()).toBe(true)
    await close.trigger('click')
    await flushPromises()
    expect(tabs.documents.map((tab) => tab.path)).toEqual(['First frost.md'])
  })

  it('opens the active document beside Writing and returns the editor to Writing', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('Writing here.')
    await editor.open('First frost.md', { keep: true })
    await flushPromises()
    expect(useDocumentTabsStore().writingPath).toBe('The Ferry.md')
    await wrapper.get('.document-actions .beside').trigger('click')
    await flushPromises()
    expect(editor.entry?.path).toBe('The Ferry.md')
    const workbench = useWorkbenchStore()
    expect(Object.values(workbench.splits).map((split) => split.path)).toEqual(['First frost.md'])
  })
})
