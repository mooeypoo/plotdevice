// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ManuscriptDto, PartDto } from '../../../../contract/dtos'
import { sampleManuscript } from '../../app/fake-plot-device-api'
import BinderTree from './BinderTree.vue'
import { useUiLanguageStore } from '../../app/ui-language-store'

const partOne = sampleManuscript.parts[0] as PartDto
const partTwo: PartDto = {
  path: 'Part Two.md',
  title: 'Part Two: The Cannery',
  number: 2,
  wordCount: 0,
  chapters: []
}
const book = (parts: readonly PartDto[]): ManuscriptDto => ({ ...sampleManuscript, parts })
const props = { projectRoot: '/book', selectedPath: null, attentionCount: 0, readOnly: false }

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => vi.unstubAllGlobals())

const markers = (wrapper: ReturnType<typeof mount>): string[] =>
  wrapper.findAll('.marker').map((marker) => marker.text())

describe('BinderTree', () => {
  it('translates binder chrome, section details, status and grouped counts without replacing state', async () => {
    const first = partOne.chapters[0]
    if (first === undefined) throw new Error('Missing chapter')
    const chapter = { ...first, wordCount: 1234, status: undefined }
    const manuscript = {
      ...sampleManuscript,
      parts: [{ ...partOne, wordCount: 2345, chapters: [chapter] }],
      chapters: [],
      unnumberedParts: [{ ...partTwo, number: undefined }],
      unordered: [{ chapter: { ...chapter, path: 'loose.md' }, reason: 'missing-order' as const }],
      wordCount: 3456
    }
    const wrapper = mount(BinderTree, {
      props: { ...props, manuscript, attentionCount: 2, selectedPath: chapter.path },
      attachTo: document.body
    })
    const row = wrapper.get<HTMLButtonElement>('.row').element
    row.focus()
    const scroller = wrapper.get('.scroll').element
    scroller.scrollTop = 80
    const writes = vi.spyOn(Storage.prototype, 'setItem')

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Binder')
    expect(wrapper.get('.status').attributes('title')).toBe('No status')
    expect(wrapper.get('.total').text()).toContain('Manuscript')
    expect(wrapper.get('.total .value').text()).toBe('3,456 words')
    expect(wrapper.text()).toContain('Not in sequence')
    expect(wrapper.text()).toContain('Unordered')
    expect(wrapper.text()).toContain('2 things need attention')
    expect(wrapper.get('.header .open .words').text()).toBe('2,345')
    expect(wrapper.get('.row .meta').text()).toBe('1,234')

    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()

    expect(wrapper.get('nav').attributes('aria-label')).toBe('קלסר כתב היד')
    expect(wrapper.get('.status').attributes('title')).toBe('ללא סטטוס')
    expect(wrapper.get('.total').text()).toContain('כתב יד')
    expect(wrapper.get('.total .value').text()).toBe('3,456 מילים')
    expect(wrapper.text()).toContain('לא ברצף הממוספר')
    expect(wrapper.text()).toContain('ללא סדר')
    expect(wrapper.text()).toContain('2 פריטים דורשים תשומת לב')
    expect(wrapper.get('.header .open .words').text()).toBe('2,345')
    expect(wrapper.get('.row .meta').text()).toBe('1,234')
    expect(wrapper.get('.row').element).toBe(row)
    expect(document.activeElement).toBe(row)
    expect(scroller.scrollTop).toBe(80)
    expect(row.getAttribute('aria-current')).toBe('true')
    expect(writes).not.toHaveBeenCalled()

    await wrapper.get('.header .add').trigger('click')
    const input = wrapper.get('input')
    input.element.focus()
    await input.setValue('פרק חדש')
    const element = input.element
    writes.mockClear()
    useUiLanguageStore().locale = 'en'
    await wrapper.vm.$nextTick()
    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('input').element).toBe(element)
    expect(document.activeElement).toBe(element)
    expect(wrapper.get('input').element.value).toBe('פרק חדש')
    expect(writes).not.toHaveBeenCalled()
    await wrapper.get('.new-entry').trigger('submit')
    expect(wrapper.emitted('createChapter')).toEqual([[partOne.path, 'פרק חדש']])
    wrapper.unmount()
  })

  it('translates empty-manuscript guidance and creation inputs live', async () => {
    const manuscript = {
      ...sampleManuscript,
      parts: [],
      chapters: [],
      unnumberedParts: [],
      unordered: [],
      wordCount: 0
    }
    const wrapper = mount(BinderTree, { props: { ...props, manuscript } })
    expect(wrapper.text()).toContain('No chapters yet.')
    expect(wrapper.text()).toContain('New chapter')
    expect(wrapper.text()).toContain('New part')
    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('עדיין אין פרקים')
    expect(wrapper.text()).toContain('פרק חדש')
    expect(wrapper.text()).toContain('חלק חדש')
    await wrapper.get('.start button:first-child').trigger('click')
    expect(wrapper.get('input').attributes('placeholder')).toBe('כותרת הפרק')
    const input = wrapper.get('input').element
    useUiLanguageStore().locale = 'en'
    await wrapper.vm.$nextTick()
    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('input').attributes('placeholder')).toBe('כותרת הפרק')
    expect(wrapper.get('input').element).toBe(input)
    wrapper.unmount()
  })

  it('retranslates flat, part and unnumbered-part clashes and unordered reasons in place', async () => {
    const first = partOne.chapters[0]
    const second = partOne.chapters[1]
    if (first === undefined || second === undefined) throw new Error('Missing chapters')
    const chapters = [
      { ...first, order: 2, duplicateOrder: true },
      { ...second, title: 'יעל <img src=x>', order: 2, duplicateOrder: true }
    ]
    const manuscript = {
      ...sampleManuscript,
      parts: [{ ...partOne, chapters }],
      unnumberedParts: [{ ...partTwo, chapters }],
      chapters,
      unordered: [
        { chapter: { ...first, path: 'missing.md' }, reason: 'missing-order' as const },
        { chapter: { ...second, path: 'ambiguous.md' }, reason: 'part-ambiguous' as const }
      ]
    }
    const wrapper = mount(BinderTree, {
      props: { ...props, selectedPath: first.path, manuscript },
      attachTo: document.body
    })
    const row = wrapper.get<HTMLButtonElement>('.row').element
    row.focus()
    const warnings = wrapper.findAll('.warning')
    expect(warnings).toHaveLength(6)
    expect(warnings[0]?.attributes('title')).toContain('Shares order')
    expect(wrapper.text()).toContain('needs an order')
    expect(wrapper.text()).toContain('part is ambiguous')
    const scroller = wrapper.get('.scroll').element
    scroller.scrollTop = 125
    const get = vi.fn()
    const set = vi.fn()
    vi.stubGlobal('localStorage', { getItem: get, setItem: set })
    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.row').element).toBe(row)
    expect(document.activeElement).toBe(row)
    expect(row.getAttribute('aria-current')).toBe('true')
    expect(scroller.scrollTop).toBe(125)
    expect(wrapper.text()).not.toMatch(/needs an order|part is ambiguous/u)
    expect(wrapper.find('img').exists()).toBe(false)
    for (const warning of wrapper.findAll('.warning')) {
      const text = warning.attributes('title')
      expect(text).not.toContain('Shares order')
      expect(text).toMatch(/[\u0590-\u05ff]/u)
      expect(warning.attributes('aria-label')).toBe(text)
    }
    expect(wrapper.findAll('.warning')[0]?.attributes('title')).toContain(
      '\u2068יעל <img src=x>\u2069'
    )
    expect(wrapper.emitted('move')).toBeUndefined()
    expect(wrapper.emitted('open')).toBeUndefined()
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    expect(wrapper.findAll('.warning').map((warning) => warning.element)).toEqual(
      warnings.map((warning) => warning.element)
    )
    wrapper.unmount()
  })

  it('keeps collapse state when hidden and remounted, including unnumbered parts', async () => {
    const manuscript = {
      ...book([partOne]),
      unnumberedParts: [{ ...partTwo, number: undefined }]
    }
    const wrapper = mount(BinderTree, { props: { ...props, manuscript } })
    const toggles = wrapper.findAll('.toggle')
    for (const toggle of toggles) await toggle.trigger('click')
    expect(wrapper.findAll('.chapters')).toHaveLength(0)
    wrapper.unmount()

    const restored = mount(BinderTree, { props: { ...props, manuscript } })
    expect(restored.findAll('.toggle').map((toggle) => toggle.attributes('aria-expanded'))).toEqual(
      ['false', 'false']
    )
    await restored.setProps({ projectRoot: '/another-book' })
    expect(restored.findAll('.chapters')).toHaveLength(2)
    restored.unmount()
  })

  it('expands a collapsed part when creating a chapter and remembers the expansion', async () => {
    const manuscript = book([partOne])
    const wrapper = mount(BinderTree, { props: { ...props, manuscript } })
    await wrapper.get('.toggle').trigger('click')
    expect(wrapper.find('.chapters').exists()).toBe(false)
    await wrapper.get('.header .add').trigger('click')
    expect(wrapper.get('.toggle').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('input').exists()).toBe(true)
    wrapper.unmount()

    const restored = mount(BinderTree, { props: { ...props, manuscript } })
    expect(restored.get('.toggle').attributes('aria-expanded')).toBe('true')
    restored.unmount()
  })

  it('keeps the collapsed part collapsed after reorder and number changes', async () => {
    const wrapper = mount(BinderTree, { props: { ...props, manuscript: book([partOne, partTwo]) } })
    await wrapper.get('.toggle').trigger('click')
    await wrapper.setProps({
      manuscript: book([
        { ...partTwo, number: 1 },
        { ...partOne, number: 2 }
      ])
    })
    expect(wrapper.findAll('.toggle').map((toggle) => toggle.attributes('aria-expanded'))).toEqual([
      'true',
      'false'
    ])
    wrapper.unmount()
  })

  it('renumbers the parts after they are reordered', async () => {
    const wrapper = mount(BinderTree, { props: { ...props, manuscript: book([partOne, partTwo]) } })
    expect(markers(wrapper)).toEqual(['I', 'II'])

    // The same part components are reused (keyed by path), so their numbers must follow.
    await wrapper.setProps({
      manuscript: book([
        { ...partTwo, number: 1 },
        { ...partOne, number: 2 }
      ])
    })
    expect(wrapper.findAll('.header .title').map((title) => title.text())).toEqual([
      'Part Two: The Cannery',
      'Part One: The Orchard'
    ])
    expect(markers(wrapper)).toEqual(['I', 'II'])
  })

  it('asks to move a chapter dropped above another', async () => {
    const wrapper = mount(BinderTree, { props: { ...props, manuscript: book([partOne]) } })
    const rows = wrapper.findAll('.chapters li[draggable="true"]')
    const [ferry, frost] = [rows[0], rows[1]]
    if (ferry === undefined || frost === undefined) throw new Error('expected two chapter rows')

    const dataTransfer = new DataTransfer()
    await frost.trigger('dragstart', { dataTransfer })
    // happy-dom lays nothing out, so every row is 0px tall and the pointer counts as below it.
    await ferry.trigger('dragover', { dataTransfer, clientY: -1 })
    await ferry.trigger('drop', { dataTransfer })

    expect(wrapper.emitted('move')).toEqual([
      [
        {
          kind: 'move-chapter',
          path: 'First frost.md',
          destination: { part: 'Part One.md', index: 0 }
        }
      ]
    ])
  })
})
