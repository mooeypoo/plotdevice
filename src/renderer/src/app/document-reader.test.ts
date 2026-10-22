// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useCodexStore } from './codex-store'
import { createDocumentReader } from './document-reader'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { documentMoved } from './move-followers'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'
import { useLiveDraft } from './use-live-draft'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('createDocumentReader', () => {
  it('keeps independent readers apart', async () => {
    const first = createDocumentReader()
    const second = createDocumentReader()
    first.open('The Ferry.md')
    second.open('First frost.md')
    await flushPromises()
    expect(first.text.value).not.toBeNull()
    expect(first.text.value).toBe(fake.files.get('The Ferry.md'))
    expect(second.text.value).toBe(fake.files.get('First frost.md'))
    first.rememberScroll(120)
    expect(second.scrollTop('The Ferry.md')).toBe(0)
  })

  it('never saves or changes the editor', async () => {
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('A draft.')
    const reader = createDocumentReader()
    reader.open('The Ferry.md')
    await flushPromises()
    expect(editor.text).toBe('A draft.')
    expect(editor.saveState).not.toBe('saved')
    await editor.flush()
  })
})

describe('move followers', () => {
  it('tell the Reference panel about the app’s moves', () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    reference.rememberScroll(80)
    documentMoved('characters/Ilka.md', 'characters/Ilka Szabó.md')
    expect(reference.path).toBe('characters/Ilka Szabó.md')
    expect(reference.scrollTop()).toBe(80)
  })
})

describe('useLiveDraft', () => {
  it('shows the editor’s draft only while the same file is open for editing', async () => {
    const editor = useEditorStore()
    const path = ref<string | null>('The Ferry.md')
    const readText = ref<string | null>('As read.')
    const { openInEditor, text } = useLiveDraft(path, readText)
    expect(text.value).toBe('As read.')
    await editor.open('The Ferry.md')
    editor.edit('Live draft.')
    expect(openInEditor.value).toBe(true)
    expect(text.value).toBe('Live draft.')
    path.value = 'First frost.md'
    expect(text.value).toBe('As read.')
    await editor.flush()
  })
})
