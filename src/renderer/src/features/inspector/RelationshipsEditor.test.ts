// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import RelationshipsEditor from './RelationshipsEditor.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('RelationshipsEditor', () => {
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
  })

  it('says so on the entry when a change is refused', async () => {
    const ilka = fake.codexProperties.get('characters/Ilka.md')
    if (ilka === undefined) throw new Error('expected Ilka')
    await useEditorStore().open('characters/Ilka.md')
    fake.codexProperties.set('characters/Ilka.md', { ...ilka, relationshipsEditable: false })
    expect(await useCodexStore().updateRelationships([{ with: 'Aunt Bea' }])).toBe(false)
    expect(useCodexStore().relationshipsError).toContain('left the file as it is')
  })
})
