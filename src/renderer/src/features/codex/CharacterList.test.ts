// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CodexEntryDto } from '../../../../contract/dtos'
import { useUiLanguageStore } from '../../app/ui-language-store'
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
  it('translates search and result copy without changing focus, filters or authored names', async () => {
    const wrapper = mount(CharacterList, {
      attachTo: document.body,
      props: { entries, selectedPath: 'Ilka.md', projectRoot: '/book' }
    })
    await wrapper.get('input[type="checkbox"]').setValue(true)
    const search = wrapper.get<HTMLInputElement>('input[type="search"]')
    await search.setValue('Ilk')
    search.element.focus()
    const searchElement = search.element
    const row = wrapper.get<HTMLButtonElement>('.row').element
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    writes.mockClear()

    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()

    expect(wrapper.get('input[type="search"]').attributes('aria-label')).toBe('חיפוש דמויות')
    expect(wrapper.get('input[type="search"]').attributes('placeholder')).toBe(
      'חיפוש לפי שם או כינוי…'
    )
    expect(wrapper.get('input[type="search"]').element).toBe(searchElement)
    expect(document.activeElement).toBe(searchElement)
    expect(wrapper.get<HTMLInputElement>('input[type="search"]').element.value).toBe('Ilk')
    expect(wrapper.get('[role="status"]').text()).toBe('1 דמות מוצגת')
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('מצב רשימת הדמויות')
    expect(wrapper.get('[role="group"]').text()).toContain('הכול')
    expect(wrapper.get('[role="group"]').text()).toContain('מקובץ')
    expect(wrapper.get('.filters summary').text()).toContain('סינון לפי קבוצות')
    expect(wrapper.get('.filters .hint').text()).toContain('הצגת דמויות')
    expect(wrapper.get('.clear').text()).toBe('ניקוי מסנני הקבוצות')
    expect(wrapper.get('.row').element).toBe(row)
    expect(wrapper.get('.row .title').text()).toBe('Ilka')
    expect(wrapper.get<HTMLInputElement>('.filters input[type="checkbox"]').element.checked).toBe(
      true
    )
    expect(writes).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('localizes empty and searching states without changing their filtering behavior', async () => {
    const wrapper = mountList()
    await wrapper.get('input[type="search"]').setValue('missing')
    expect(wrapper.text()).toContain('No characters match.')
    await wrapper.get('input[type="search"]').setValue('Ilk')
    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    expect(wrapper.text()).toContain('Matching groups are expanded while searching.')

    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('בזמן חיפוש, הקבוצות המתאימות נפתחות.')
    await wrapper.get('input[type="search"]').setValue('missing')
    expect(wrapper.text()).toContain('לא נמצאו דמויות מתאימות.')

    await wrapper.setProps({ entries: [] })
    expect(wrapper.text()).toContain('עדיין אין דמויות.')
    wrapper.unmount()
  })

  it('reorders group presentation by locale while retaining selected filters and rows', async () => {
    const [ilka, bea, yael] = entries
    if (ilka === undefined || bea === undefined || yael === undefined) {
      throw new Error('Expected sample characters')
    }
    const mixedEntries: readonly CodexEntryDto[] = [
      { ...ilka, groups: ['Main', 'שירה'] },
      { ...bea, groups: ['Ari', 'דוד'] },
      yael
    ]
    const wrapper = mount(CharacterList, {
      props: { entries: mixedEntries, selectedPath: 'Ilka.md', projectRoot: '/book' }
    })
    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    const groupNames = (): string[] =>
      wrapper.findAll('.group-heading bdi').map((heading) => heading.text())
    expect(groupNames()).toEqual(['Ari', 'Main', 'דוד', 'שירה', 'Ungrouped'])

    const mainFilter = wrapper
      .findAll('.filters label')
      .find((label) => label.get('bdi').text() === 'Main')
    if (mainFilter === undefined) throw new Error('Expected a Main group filter')
    await mainFilter.get('input').setValue(true)
    const activeRow = wrapper.get('.row.active').element
    const writePreference = vi.spyOn(Storage.prototype, 'setItem')
    writePreference.mockClear()

    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()

    expect(groupNames()).toEqual(['Main'])
    const selectedFilter = wrapper
      .findAll('.filters label')
      .find((label) => label.get<HTMLInputElement>('input').element.checked)
    expect(selectedFilter?.get('bdi').text()).toBe('Main')
    expect(wrapper.get('.row.active').element).toBe(activeRow)
    expect(writePreference).not.toHaveBeenCalled()

    await wrapper.get('.clear').trigger('click')
    expect(groupNames()).toEqual(['דוד', 'שירה', 'Ari', 'Main', 'ללא קבוצה'])
    wrapper.unmount()
  })

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
