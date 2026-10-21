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
import { effectScope } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'

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

  it.each([
    { kind: 'wiki', target: 'Nobody <img src=x> יעל' },
    { kind: 'markdown', address: '../Nobody <img src=x> יעל.md' }
  ] as const)('reformats cached $kind notices without restarting their lifetime', async (link) => {
    const navigate = vi.fn()
    const { openLink, linkNotice } = useEditorLinks(navigate)
    await openLink(link)
    const english = linkNotice.value
    const value = link.kind === 'wiki' ? link.target : link.address
    expect(english).toContain(`\u2068${value}\u2069`)
    await vi.advanceTimersByTimeAsync(3000)
    useUiLanguageStore().locale = 'he'
    expect(linkNotice.value).not.toBe(english)
    expect(linkNotice.value).toContain(`\u2068${value}\u2069`)
    expect(linkNotice.value).not.toMatch(/doesn’t point|isn’t a file/u)
    expect(navigate).not.toHaveBeenCalled()
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    await vi.advanceTimersByTimeAsync(1999)
    expect(linkNotice.value).not.toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(linkNotice.value).toBeNull()
  })

  it('cleans up the notice timer when its scope is disposed', async () => {
    const scope = effectScope()
    const links = scope.run(() => useEditorLinks())
    if (links === undefined) throw new Error('Missing links scope')
    await links.openLink({ kind: 'wiki', target: 'Nobody' })
    expect(vi.getTimerCount()).toBe(1)
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
    expect(links.linkNotice.value).toBeNull()
  })

  it('reformats an unsupported resolved target without changing the draft or route', async () => {
    const editor = useEditorStore()
    const manuscript = useManuscriptStore()
    if (manuscript.manuscript === null) throw new Error('Missing manuscript')
    manuscript.manuscript = {
      ...manuscript.manuscript,
      linkTargets: [
        ...manuscript.manuscript.linkTargets,
        { name: 'Other', path: 'Other.md', type: 'note' }
      ]
    }
    editor.edit('Unsaved draft.')
    editor.saveState = 'conflict'
    await useEditorLinks().openLink({ kind: 'wiki', target: 'Other' })
    const english = editor.actionError
    expect(english).toContain('\u2068Other.md\u2069')
    useUiLanguageStore().locale = 'he'
    expect(editor.actionError).not.toBe(english)
    expect(editor.actionError).toContain('\u2068Other.md\u2069')
    expect(editor.text).toBe('Unsaved draft.')
    expect(editor.entry?.path).toBe('The Ferry.md')
  })
})
