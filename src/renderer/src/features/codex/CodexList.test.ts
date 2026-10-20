// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { sampleCodex } from '../../app/fake-plot-device-api'
import CodexList from './CodexList.vue'

const mountList = (readOnly = false): ReturnType<typeof mount> =>
  mount(CodexList, {
    props: { listing: sampleCodex, selectedPath: null, readOnly, projectRoot: '/book' }
  })

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('CodexList', () => {
  it('lists entries by section, with a role or other names beside them', () => {
    const list = mountList()
    expect(list.findAll('h2').map((heading) => heading.text())).toEqual([
      'Outlines',
      'Characters',
      'Locations',
      'Notes',
      'Templates',
      'Untyped files'
    ])
    expect(list.text()).toContain('Ilka')
    expect(list.text()).toContain('lead')
  })

  it('creates an entry from the section’s button', async () => {
    const list = mountList()
    const button = list.findAll('button').find((candidate) => candidate.text() === '+ New location')
    await button?.trigger('click')
    await list.get('form input').setValue('The Cannery')
    await list.get('form').trigger('submit')
    expect(list.emitted('create')).toEqual([['location', 'The Cannery']])
  })

  it('sets an untyped file’s type', async () => {
    const list = mountList()
    await list.get('select').setValue('note')
    expect(list.emitted('setType')).toEqual([['Loose thoughts.md', 'note']])
  })

  it('opens a template, marked default until the writer makes one', async () => {
    const list = mountList()
    expect(list.text()).toContain('New character')
    expect(list.text()).toContain('default')
    const template = list
      .findAll('button')
      .find((button) => button.text().startsWith('New location'))
    await template?.trigger('click')
    expect(list.emitted('editTemplate')).toEqual([['location']])
  })

  it('lists outlines first and creates one by name', async () => {
    const list = mountList()
    expect(list.text()).toContain('Outline')
    const button = list.findAll('button').find((candidate) => candidate.text() === '+ New outline')
    await button?.trigger('click')
    await list.get('form input').setValue('Revision plan')
    await list.get('form').trigger('submit')
    expect(list.emitted('createOutline')).toEqual([['Revision plan']])
  })

  it('offers no changes in a read-only project', () => {
    const list = mountList(true)
    expect(list.text()).not.toContain('+ New')
    expect(list.find('select').exists()).toBe(false)
  })
})
