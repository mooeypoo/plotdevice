// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ManuscriptDto, PartDto } from '../../../../contract/dtos'
import { sampleManuscript } from '../../app/fake-plot-device-api'
import BinderTree from './BinderTree.vue'

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

const markers = (wrapper: ReturnType<typeof mount>): string[] =>
  wrapper.findAll('.marker').map((marker) => marker.text())

describe('BinderTree', () => {
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
