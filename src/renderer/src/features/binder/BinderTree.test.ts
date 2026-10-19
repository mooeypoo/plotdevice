// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
const props = { selectedPath: null, attentionCount: 0, readOnly: false }

const markers = (wrapper: ReturnType<typeof mount>): string[] =>
  wrapper.findAll('.marker').map((marker) => marker.text())

describe('BinderTree', () => {
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
