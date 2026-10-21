import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useEditorLinks } from './use-editor-links'
import { useReferenceStore } from '../../app/reference-store'
import { flushPromises } from '@vue/test-utils'

beforeEach(async () => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
  await useEditorStore().open('The Ferry.md')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useEditorLinks', () => {
  it('suggests every link target with its aliases', () => {
    const { completions } = useEditorLinks()
    expect(completions.value.find((target) => target.name === 'Ilka')?.aliases).toEqual(['Ilk'])
  })

  it('consults codex links without replacing the manuscript and resolves relative links from their source', async () => {
    const { openLink } = useEditorLinks()
    await openLink({ kind: 'wiki', target: 'Marrow' })
    await flushPromises()
    expect(useReferenceStore().entry?.path).toBe('locations/Marrow.md')
    await openLink({ kind: 'markdown', address: '../characters/Ilka.md' }, 'locations/Marrow.md')
    await flushPromises()
    expect(useReferenceStore().entry?.path).toBe('characters/Ilka.md')
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
  })

  it('still opens manuscript links in the main editor', async () => {
    await useEditorLinks().openLink({ kind: 'wiki', target: 'First frost' })
    expect(useEditorStore().entry?.path).toBe('First frost.md')
  })

  it('explains a link that opens nothing, briefly', async () => {
    const { openLink, linkNotice } = useEditorLinks()
    await openLink({ kind: 'wiki', target: 'Nobody' })
    expect(linkNotice.value).toContain('doesn’t point to one file')
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    await vi.advanceTimersByTimeAsync(5000)
    expect(linkNotice.value).toBeNull()
  })
})
