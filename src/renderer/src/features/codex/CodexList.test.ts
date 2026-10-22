// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { sampleCodex } from '../../app/fake-plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import CodexList from './CodexList.vue'

const mountList = (readOnly = false): ReturnType<typeof mount> =>
  mount(CodexList, {
    props: { listing: sampleCodex, selectedPath: null, readOnly, projectRoot: '/book' }
  })

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  document.documentElement.dir = 'ltr'
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

  it('translates list copy live while preserving a focused search and exact title input', async () => {
    const list = mount(CodexList, {
      attachTo: document.body,
      props: { listing: sampleCodex, selectedPath: null, readOnly: false, projectRoot: '/book' }
    })
    const search = list.get<HTMLInputElement>('input[type="search"]')
    await search.setValue('Ilk')
    search.element.focus()
    const searchElement = search.element

    useUiLanguageStore().locale = 'he'
    await list.vm.$nextTick()

    expect(list.findAll('h2').map((heading) => heading.text())).toEqual([
      'מתווים',
      'דמויות',
      'מקומות',
      'הערות',
      'תבניות',
      'קבצים ללא סוג'
    ])
    expect(list.get('input[type="search"]').attributes('aria-label')).toBe('חיפוש דמויות')
    expect(list.get('input[type="search"]').attributes('placeholder')).toBe('חיפוש לפי שם או כינוי…')
    expect(list.get('input[type="search"]').element).toBe(searchElement)
    expect(document.activeElement).toBe(searchElement)
    expect(list.get<HTMLInputElement>('input[type="search"]').element.value).toBe('Ilk')
    expect(list.text()).toContain('ברירת מחדל')
    expect(list.get('select').attributes('aria-label')).toContain('Loose thoughts.md')
    expect(list.get('select').attributes('aria-label')).toContain('הגדרת הסוג')
    expect(list.get('select option[value="note"]').text()).toBe('note')
    expect(list.text()).toContain('עריכה')
    expect(list.get('.edit').attributes('aria-label')).toContain('פתיחת')
    expect(list.get('.edit').attributes('title')).toBe('פתיחה בעורך')

    const create = list.findAll('button').find((button) => button.text().includes('מקום חדש'))
    await create?.trigger('click')
    expect(list.get('form input').attributes('placeholder')).toBe('שם המקום החדש')
    await list.get('form input').setValue('המרינה')
    await list.get('form').trigger('submit')
    expect(list.emitted('create')).toEqual([['location', 'המרינה']])
    list.unmount()
  })

  it('keeps codex entry text auto-directed and unchanged in Hebrew RTL', async () => {
    const list = mountList()
    document.documentElement.dir = 'rtl'
    useUiLanguageStore().locale = 'he'
    await list.vm.$nextTick()

    expect(document.documentElement.dir).toBe('rtl')
    expect(list.get('.row .title').attributes('dir')).toBe('auto')
    expect(list.get('.entry-row .row .title').attributes('dir')).toBe('auto')
    expect(list.get('.row .title').text()).toBe('Outline')
    expect(list.get('.entry-row .row .title').text()).toBe('Ilka')
    list.unmount()
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
