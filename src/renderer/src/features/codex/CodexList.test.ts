// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { sampleCodex } from '../../app/fake-plot-device-api'
import CodexList from './CodexList.vue'

const mountList = (readOnly = false): ReturnType<typeof mount> =>
  mount(CodexList, { props: { listing: sampleCodex, selectedPath: null, readOnly } })

describe('CodexList', () => {
  it('lists entries by section, with a role or other names beside them', () => {
    const list = mountList()
    expect(list.findAll('h2').map((heading) => heading.text())).toEqual([
      'Characters',
      'Locations',
      'Notes',
      'Untyped files'
    ])
    expect(list.text()).toContain('Ilka')
    expect(list.text()).toContain('lead')
  })

  it('creates an entry from the section’s button', async () => {
    const list = mountList()
    const button = list.findAll('button').find((candidate) => candidate.text() === '+ New location')
    await button?.trigger('click')
    await list.get('input').setValue('The Cannery')
    await list.get('form').trigger('submit')
    expect(list.emitted('create')).toEqual([['location', 'The Cannery']])
  })

  it('sets an untyped file’s type', async () => {
    const list = mountList()
    await list.get('select').setValue('note')
    expect(list.emitted('setType')).toEqual([['Loose thoughts.md', 'note']])
  })

  it('offers no changes in a read-only project', () => {
    const list = mountList(true)
    expect(list.text()).not.toContain('+ New')
    expect(list.find('select').exists()).toBe(false)
  })
})
