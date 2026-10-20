// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CodexEntryDto } from '../../../../contract/dtos'
import { useWritingPreferencesStore } from '../../app/writing-preferences-store'
import CharacterList from './CharacterList.vue'

const entries: readonly CodexEntryDto[] = [
  {
    path: 'Ilka.md',
    kind: 'character',
    title: 'Ilka',
    aliases: ['Ilk'],
    groups: ['Main', 'Part 2']
  },
  { path: 'Bea.md', kind: 'character', title: 'Bea', aliases: [], groups: ['Main'] },
  { path: 'Yael.md', kind: 'character', title: 'יעל', aliases: ['Yael'] }
]
const mountList = (projectRoot = '/book') =>
  mount(CharacterList, {
    props: { entries, selectedPath: 'Ilka.md', projectRoot }
  })
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('character navigation', () => {
  it('reveals matching characters in collapsed groups while searching, then restores collapse', async () => {
    const wrapper = mountList()
    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    await wrapper.findAll('.group-heading')[0]?.trigger('click')
    await wrapper.get('input[type="search"]').setValue('Bea')
    expect(wrapper.findAll('.row')).toHaveLength(1)
    expect(wrapper.get('.group-heading').attributes('aria-expanded')).toBe('true')
    await wrapper.get('input[type="search"]').setValue('')
    expect(wrapper.findAll('.group-heading')[0]?.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('collapses overlapping groups, including Ungrouped, without duplicating files', async () => {
    const wrapper = mountList()
    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    const headings = wrapper.findAll('.group-heading')
    expect(headings.map((heading) => heading.get('bdi').text())).toEqual([
      'Main',
      'Part 2',
      'Ungrouped'
    ])
    expect(headings.map((heading) => heading.get('.count').text())).toEqual(['2', '1', '1'])
    expect(wrapper.findAll('.row.active')).toHaveLength(2)
    await wrapper.findAll('.row.active')[1]?.trigger('click')
    expect(wrapper.emitted('open')).toEqual([['Ilka.md']])
    await headings[0]?.trigger('click')
    expect(headings[0]?.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.row')).toHaveLength(2)
    wrapper.unmount()
    const restored = mountList()
    expect(restored.findAll('.group-heading')[0]?.attributes('aria-expanded')).toBe('false')
    restored.unmount()
  })

  it('filters by any selected group, deduplicates All, and searches aliases and Hebrew', async () => {
    const wrapper = mountList()
    const filters = wrapper.findAll('input[type="checkbox"]')
    await filters[0]?.setValue(true)
    await filters[1]?.setValue(true)
    expect(wrapper.findAll('.row')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 shown')
    await wrapper.get('input[type="search"]').setValue('Ilk')
    expect(wrapper.findAll('.row')).toHaveLength(1)
    await wrapper.get('.clear').trigger('click')
    await wrapper.get('input[type="search"]').setValue('יעל')
    expect(wrapper.findAll('.row')).toHaveLength(1)
    expect(wrapper.get('.row .title').text()).toBe('יעל')
    wrapper.unmount()
  })

  it('isolates preferences by project and restores filters and mode after restarting', async () => {
    const wrapper = mountList()
    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    await wrapper.findAll('input[type="checkbox"]')[1]?.setValue(true)
    wrapper.unmount()
    setActivePinia(createPinia())
    const restored = mountList()
    expect(restored.text()).toContain('1 shown')
    expect(restored.findAll('.group-heading')).toHaveLength(1)
    const other = mountList('/other')
    expect(other.text()).toContain('3 shown')
    expect(other.findAll('.group-heading')).toHaveLength(0)
    restored.unmount()
    other.unmount()
  })

  it('handles outside membership changes and removed groups without stranding the filter', async () => {
    const wrapper = mountList()
    await wrapper.findAll('input[type="checkbox"]')[1]?.setValue(true)
    expect(wrapper.findAll('.row')).toHaveLength(1)
    await wrapper.setProps({ entries: entries.map((entry) => ({ ...entry, groups: [] })) })
    await flushPromises()
    expect(wrapper.findAll('.row')).toHaveLength(3)
    expect(wrapper.find('.filters').exists()).toBe(false)
    expect(useWritingPreferencesStore().characterView('/book').filters).toEqual(['Part 2'])
    wrapper.unmount()
  })

  it('distinguishes a group named Ungrouped from the ungrouped section', async () => {
    const wrapper = mountList()
    await wrapper.setProps({
      entries: [
        {
          ...entries[0],
          path: 'Ilka.md',
          kind: 'character',
          title: 'Ilka',
          aliases: [],
          groups: ['Ungrouped']
        },
        { path: 'Bea.md', kind: 'character', title: 'Bea', aliases: [] }
      ]
    })
    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    const headings = wrapper.findAll('.group-heading')
    await headings[0]?.trigger('click')
    expect(headings[0]?.attributes('aria-expanded')).toBe('false')
    expect(headings[1]?.attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })
})
