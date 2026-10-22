// @vitest-environment happy-dom
import { undo, undoDepth } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useWritingPreferencesStore } from '../../app/writing-preferences-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
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

  it('switches writing direction live without changing the draft or editor history', async () => {
    const wrapper = mount(ChapterEditor, {
      props: {
        initialText: 'English line\nשורה בעברית',
        readOnly: false,
        focusMode: false,
        linkTargets: [],
        completions: []
      },
      attachTo: document.body
    })
    const editorElement = wrapper.get('.cm-editor').element
    const contentElement = wrapper.get('.cm-content').element
    if (!(editorElement instanceof HTMLElement) || !(contentElement instanceof HTMLElement))
      throw new Error('Expected the CodeMirror editor and content elements')
    const view = EditorView.findFromDOM(editorElement)
    if (view === null) throw new Error('Expected a mounted CodeMirror view')
    expect(wrapper.get('.cm-content').attributes('dir')).toBe('auto')
    expect(wrapper.findAll('.cm-line[dir="auto"]')).toHaveLength(2)

    view.dispatch({ changes: { from: 0, insert: 'First ' }, selection: { anchor: 3 } })
    const text = view.state.doc.toString()
    const selection = view.state.selection.main.anchor
    const historyDepth = undoDepth(view.state)
    const changes = wrapper.emitted('change')
    const preferences = useWritingPreferencesStore()

    for (const direction of ['rtl', 'ltr'] as const) {
      expect(preferences.setWritingDirection(direction).ok).toBe(true)
      await nextTick()
      expect(wrapper.get('.cm-editor').element).toBe(editorElement)
      expect(wrapper.get('.cm-content').element).toBe(contentElement)
      expect(wrapper.get('.cm-content').attributes('dir')).toBe(direction)
      expect(wrapper.findAll('.cm-line[dir="auto"]')).toHaveLength(0)
      expect(view.state.doc.toString()).toBe(text)
      expect(view.state.selection.main.anchor).toBe(selection)
      expect(undoDepth(view.state)).toBe(historyDepth)
      expect(wrapper.emitted('change')).toEqual(changes)
    }

    useUiLanguageStore().locale = 'he'
    await nextTick()
    expect(wrapper.get('.cm-content').attributes('dir')).toBe('ltr')

    expect(preferences.setWritingDirection('auto').ok).toBe(true)
    await nextTick()
    expect(wrapper.get('.cm-content').attributes('dir')).toBe('auto')
    expect(wrapper.findAll('.cm-line[dir="auto"]')).toHaveLength(2)
    expect(view.state.doc.toString()).toBe(text)
    expect(view.state.selection.main.anchor).toBe(selection)
    expect(undoDepth(view.state)).toBe(historyDepth)
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('English line\nשורה בעברית')
    wrapper.unmount()
  })
})
