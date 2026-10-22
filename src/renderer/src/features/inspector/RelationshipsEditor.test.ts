// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import RelationshipsEditor from './RelationshipsEditor.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('RelationshipsEditor', () => {
  it('retranslates an existing refusal as escaped text without replacing the editor controls', async () => {
    await useUiLanguageStore().initialize()
    await useEditorStore().open('characters/Ilka.md')
    const write = vi.spyOn(fake.api.codex, 'updateRelationships').mockResolvedValue({
      ok: false,
      error: {
        code: 'cannot-edit',
        message: 'Legacy',
        diagnostic: { reason: 'frontmatter-unsupported', key: '<img src=x>' }
      }
    })
    const editor = mount(RelationshipsEditor, {
      props: { disabled: false },
      attachTo: document.body
    })
    await flushPromises()
    const add = editor
      .findAll<HTMLButtonElement>('button')
      .find((button) => button.text().includes('Add relationship'))
    if (add === undefined) throw new Error('expected Add relationship')
    add.element.focus()
    await useCodexStore().updateRelationships([{ with: 'יעל' }])
    expect(editor.get('[role="alert"]').text()).toContain('left the file as it is')
    await useUiLanguageStore().change('he')
    expect(editor.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(editor.get('[role="alert"]').text()).toContain('<img src=x>')
    expect(editor.find('img').exists()).toBe(false)
    expect(editor.findAll('button').some((button) => button.element === add.element)).toBe(true)
    expect(document.activeElement).toBe(add.element)
    expect(write).toHaveBeenCalledOnce()
    editor.unmount()
  })

  it('adds a relationship with a character, never the open one', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const editor = mount(RelationshipsEditor, { props: { disabled: false } })
    await flushPromises()
    const add = editor
      .findAll('button')
      .find((button) => button.text().includes('Add relationship'))
    await add?.trigger('click')

    const options = editor.findAll('select option').map((option) => option.text())
    expect(options).toEqual(['Who…', 'Aunt Bea'])
    await editor.get('select').setValue('Aunt Bea')
    await flushPromises()
    const kind = editor.findAll('input')[0]
    await kind?.setValue('mentor')
    await kind?.trigger('change')
    await flushPromises()
    expect(useCodexStore().properties?.relationships).toEqual([
      { with: '[[Aunt Bea]]', kind: 'mentor', note: '' }
    ])
  })

  it('shows relationships it can’t edit read-only, with a note', async () => {
    const ilka = fake.codexProperties.get('characters/Ilka.md')
    if (ilka === undefined) throw new Error('expected Ilka')
    fake.codexProperties.set('characters/Ilka.md', {
      ...ilka,
      relationships: [{ with: '[[Aunt Bea]]', kind: 'mentor' }],
      relationshipsEditable: false
    })
    await useEditorStore().open('characters/Ilka.md')
    const editor = mount(RelationshipsEditor, { props: { disabled: false } })
    await flushPromises()
    expect(editor.text()).toContain('Aunt Bea · mentor')
    expect(editor.text()).toContain('can’t edit safely')
    expect(editor.find('select').exists()).toBe(false)
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(editor.text()).toContain('הקשרים בקובץ הזה כתובים בצורה')
    expect(editor.text()).toContain('Aunt Bea · mentor')
  })

  it('says so on the entry when a change is refused', async () => {
    const ilka = fake.codexProperties.get('characters/Ilka.md')
    if (ilka === undefined) throw new Error('expected Ilka')
    await useEditorStore().open('characters/Ilka.md')
    fake.codexProperties.set('characters/Ilka.md', { ...ilka, relationshipsEditable: false })
    expect(await useCodexStore().updateRelationships([{ with: 'Aunt Bea' }])).toBe(false)
    expect(useCodexStore().relationshipsError).toContain('left the file as it is')
  })

  it('translates relationship controls live without losing row drafts or writing', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const propertiesRead = vi.spyOn(fake.api.codex, 'getProperties')
    const update = vi.spyOn(fake.api.codex, 'updateRelationships')
    const editor = mount(RelationshipsEditor, { props: { disabled: false } })
    await flushPromises()
    await editor.get('button.quiet').trigger('click')
    const kind = editor.get('input')
    kind.element.value = 'Unsaved relationship kind'
    await kind.trigger('input')
    const reads = propertiesRead.mock.calls.length

    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(editor.get('h3').text()).toBe('קשרים')
    expect(editor.get('select').attributes('aria-label')).toBe('קשר 1: עם')
    expect(editor.get('select option[value=""]').text()).toBe('עם מי…')
    expect(kind.attributes('placeholder')).toBe('סוג: מורה דרך, אחות, יריב/ה…')
    expect(kind.attributes('aria-label')).toBe('קשר 1: סוג')
    expect(kind.element.value).toBe('Unsaved relationship kind')
    expect(editor.get('button.quiet').text()).toBe('+ הוספת קשר')
    expect(propertiesRead).toHaveBeenCalledTimes(reads)
    expect(update).not.toHaveBeenCalled()
    editor.unmount()
  })

  it('translates missing relationship targets without changing their link values', async () => {
    const ilka = fake.codexProperties.get('characters/Ilka.md')
    if (ilka === undefined) throw new Error('expected Ilka')
    fake.codexProperties.set('characters/Ilka.md', {
      ...ilka,
      relationships: [{ with: '[[Missing friend]]' }],
      relationshipsEditable: true
    })
    await useEditorStore().open('characters/Ilka.md')
    const update = vi.spyOn(fake.api.codex, 'updateRelationships')
    const editor = mount(RelationshipsEditor, { props: { disabled: false } })
    await flushPromises()

    await useUiLanguageStore().change('he')
    await flushPromises()

    const missing = editor
      .findAll('select option')
      .find((option) => option.attributes('value') === 'Missing friend')
    expect(missing?.text()).toBe('⁨Missing friend⁩ (אין קובץ)')
    expect(editor.get('select').element.value).toBe('Missing friend')
    expect(update).not.toHaveBeenCalled()
    editor.unmount()
  })
})
