// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiLanguageStore } from '../../app/ui-language-store'
import SynopsisCell from './SynopsisCell.vue'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('SynopsisCell', () => {
  it('translates editing labels while preserving the user-written title and synopsis', async () => {
    const title = 'The Ferry'
    const synopsis = 'Ilka crosses the river.'
    const cell = mount(SynopsisCell, {
      props: { synopsis, readOnly: false, title }
    })

    expect(cell.get('button').text()).toBe(synopsis)
    expect(cell.get('button').attributes('title')).toBe('Click to edit the synopsis')
    expect(cell.get('button').attributes('dir')).toBe('auto')

    await cell.get('button').trigger('click')
    const editor = cell.get<HTMLTextAreaElement>('textarea')
    expect(editor.attributes('aria-label')).toContain('Synopsis of')
    expect(editor.element.value).toBe(synopsis)

    useUiLanguageStore().locale = 'he'
    await cell.vm.$nextTick()

    expect(cell.get<HTMLTextAreaElement>('textarea').attributes('aria-label')).toContain(
      'תקציר של'
    )
    expect(cell.get<HTMLTextAreaElement>('textarea').element.value).toBe(synopsis)
    await cell.get('textarea').setValue('תקציר חדש')
    await cell.get('textarea').trigger('blur')
    expect(cell.emitted('save')).toEqual([['תקציר חדש']])
  })

  it('localizes the empty synopsis action without enabling edits in read-only mode', async () => {
    const cell = mount(SynopsisCell, {
      props: { synopsis: undefined, readOnly: false, title: 'The Ferry' }
    })
    expect(cell.get('button').text()).toBe('Add a synopsis…')

    useUiLanguageStore().locale = 'he'
    await cell.vm.$nextTick()
    expect(cell.get('button').text()).toBe('הוספת תקציר…')

    await cell.setProps({ readOnly: true })
    expect(cell.get('button').attributes('disabled')).toBeDefined()
    expect(cell.get('button').attributes('title')).toBeUndefined()
    await cell.get('button').trigger('click')
    expect(cell.find('textarea').exists()).toBe(false)
  })
})
