// @vitest-environment happy-dom
import { undo, undoDepth } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useWritingPreferencesStore } from '../../app/writing-preferences-store'
import ChapterEditor from './ChapterEditor.vue'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  // happy-dom dispatches selectionchange synchronously, unlike Chromium.
  vi.spyOn(EditorView.prototype, 'focus').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChapterEditor appearance', () => {
  it('focuses a newly navigated document once it becomes editable, without stealing focus after later freezes', async () => {
    const focus = vi.spyOn(EditorView.prototype, 'focus')
    const wrapper = mount(ChapterEditor, {
      props: {
        initialText: 'Draft',
        readOnly: true,
        focusMode: false,
        linkTargets: [],
        completions: []
      }
    })
    expect(focus).not.toHaveBeenCalled()
    await wrapper.setProps({ readOnly: false })
    expect(focus).toHaveBeenCalledOnce()
    await wrapper.setProps({ readOnly: true })
    await wrapper.setProps({ readOnly: false })
    expect(focus).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
  it('temporarily freezes editing during recovery without losing the draft, selection or undo history', async () => {
    const wrapper = mount(ChapterEditor, {
      props: {
        initialText: 'Draft',
        readOnly: false,
        focusMode: false,
        linkTargets: [],
        completions: []
      },
      attachTo: document.body
    })
    const dom = wrapper.get('.cm-editor').element
    if (!(dom instanceof HTMLElement)) throw new Error('Expected CodeMirror')
    const view = EditorView.findFromDOM(dom)
    if (view === null) throw new Error('Expected editor view')
    view.dispatch({ changes: { from: 5, insert: ' text' }, selection: { anchor: 3 } })
    await wrapper.setProps({ readOnly: true })
    expect(view.state.facet(EditorState.readOnly)).toBe(true)
    expect(wrapper.get('.cm-content').attributes('contenteditable')).toBe('false')
    expect(wrapper.get('.cm-editor').element).toBe(dom)
    expect(view.state.doc.toString()).toBe('Draft text')
    expect(view.state.selection.main.anchor).toBe(3)
    expect(undoDepth(view.state)).toBe(1)
    await wrapper.setProps({ readOnly: false })
    expect(view.state.facet(EditorState.readOnly)).toBe(false)
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('Draft')
    wrapper.unmount()
  })

  it('remeasures without replacing the editor or changing text, selection, or undo history', async () => {
    const wrapper = mount(ChapterEditor, {
      props: {
        initialText: 'Original prose.',
        readOnly: false,
        focusMode: false,
        linkTargets: [],
        completions: []
      },
      attachTo: document.body
    })
    const dom = wrapper.get('.cm-editor').element
    if (!(dom instanceof HTMLElement)) throw new Error('Expected a CodeMirror element')
    const view = EditorView.findFromDOM(dom)
    if (view === null) throw new Error('Expected a mounted CodeMirror view')
    const measure = vi.spyOn(view, 'requestMeasure')
    view.dispatch({
      changes: { from: view.state.doc.length, insert: ' More.' },
      selection: { anchor: 4 }
    })
    const before = view.state
    const preferences = useWritingPreferencesStore()
    preferences.setFontSize(28)
    preferences.setLineWidth(45)
    await nextTick()

    expect(measure).toHaveBeenCalled()
    expect(wrapper.get('.cm-editor').element).toBe(dom)
    expect(view.state).toBe(before)
    expect(view.state.doc.toString()).toBe('Original prose. More.')
    expect(view.state.selection.main.anchor).toBe(4)
    expect(undoDepth(view.state)).toBe(1)
    expect(wrapper.emitted('change')).toEqual([['Original prose. More.']])
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('Original prose.')
    measure.mockRestore()
    wrapper.unmount()
  })
})
