// @vitest-environment happy-dom
import { EditorState } from '@codemirror/state'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from './codex-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  plotDeviceApi.current = () => createFakePlotDeviceApi().api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('document tabs', () => {
  it('selects another manuscript if the Writing file changes type outside the app', () => {
    const tabs = useDocumentTabsStore()
    tabs.opened('The Ferry.md')
    tabs.togglePin('The Ferry.md')
    tabs.opened('First frost.md', true)
    const manuscript = useManuscriptStore()
    const book = manuscript.manuscript
    const codex = useCodexStore()
    const listing = codex.listing
    const character = listing?.entries.find((entry) => entry.kind === 'character')
    if (book === null || listing === null || character === undefined)
      throw new Error('Expected listings')
    manuscript.manuscript = {
      ...book,
      parts: book.parts.map((part) => ({
        ...part,
        chapters: part.chapters.filter((chapter) => chapter.path !== 'The Ferry.md')
      }))
    }
    codex.listing = {
      ...listing,
      entries: [...listing.entries, { ...character, path: 'The Ferry.md' }]
    }
    tabs.refresh('The Ferry.md')
    expect(tabs.writingPath).toBe('First frost.md')
    expect(tabs.writing?.temporary).toBe(false)
    expect(tabs.documents).toHaveLength(2)
  })

  it('keeps session identity and editor state across moves, and releases state when a tab closes', () => {
    const tabs = useDocumentTabsStore()
    tabs.opened('The Ferry.md')
    tabs.opened('Lost.md')
    const id = tabs.documentId('Lost.md')
    if (id === undefined) throw new Error('Expected tab identity')
    const state = EditorState.create({ doc: 'Session draft.', selection: { anchor: 4 } })
    const view = { state, scrollTop: 130, scrollLeft: 0 }
    tabs.rememberView(id, view)
    tabs.followMove('Lost.md', 'notes/Research.md')
    expect(tabs.documentId('notes/Research.md')).toBe(id)
    expect(tabs.viewOf(id)).toBe(view)
    tabs.remove('notes/Research.md')
    tabs.rememberView(id, view)
    expect(tabs.viewOf(id)).toBeUndefined()
    tabs.clear()
    expect(tabs.documents).toEqual([])
  })

  it('retains Writing and reuses only the temporary browsing tab', () => {
    const tabs = useDocumentTabsStore()
    tabs.opened('The Ferry.md')
    tabs.opened('First frost.md')
    tabs.opened('Lost.md')
    expect(tabs.documents.map((tab) => tab.path)).toEqual(['The Ferry.md', 'Lost.md'])
    expect(tabs.writingPath).toBe('The Ferry.md')
    expect(tabs.documents[0]?.temporary).toBe(false)
    expect(tabs.documents[1]?.temporary).toBe(true)
    tabs.keep('Lost.md')
    tabs.opened('First frost.md')
    tabs.opened('Lost.md')
    expect(tabs.documents).toHaveLength(3)
    expect(tabs.activePath).toBe('Lost.md')
    expect(tabs.documents.filter((tab) => tab.temporary)).toHaveLength(1)
  })

  it('changes automatic Writing only for manuscript edits, and pinning locks it', () => {
    const tabs = useDocumentTabsStore()
    tabs.opened('The Ferry.md')
    tabs.opened('First frost.md')
    tabs.edited('First frost.md')
    expect(tabs.writingPath).toBe('First frost.md')
    tabs.togglePin('First frost.md')
    tabs.opened('The Ferry.md')
    tabs.edited('The Ferry.md')
    expect(tabs.writingPath).toBe('First frost.md')
    tabs.opened('characters/Ilka.md')
    tabs.edited('characters/Ilka.md')
    expect(tabs.writingPath).toBe('First frost.md')
    tabs.writeHere('The Ferry.md')
    expect(tabs.writingPath).toBe('The Ferry.md')
    expect(tabs.documents.find((tab) => tab.path === 'The Ferry.md')?.pinned).toBe(true)
    expect(tabs.documents.find((tab) => tab.path === 'characters/Ilka.md')?.temporary).toBe(false)
  })

  it('restores valid project-scoped metadata, not document text, and follows app moves', async () => {
    let tabs = useDocumentTabsStore()
    tabs.restore('/book')
    tabs.opened('The Ferry.md')
    tabs.togglePin('The Ferry.md')
    tabs.opened('First frost.md')
    tabs.keep('First frost.md')
    tabs.opened('Lost.md')
    tabs.followMove('Lost.md', 'notes/Research.md')
    expect(tabs.activePath).toBe('notes/Research.md')
    setActivePinia(createPinia())
    await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
    tabs = useDocumentTabsStore()
    tabs.restore('/book')
    expect(tabs.documents.map((tab) => tab.path)).toEqual([
      'The Ferry.md',
      'First frost.md',
      'notes/Research.md'
    ])
    expect(tabs.writingPath).toBe('The Ferry.md')
    expect(tabs.documents[0]?.pinned).toBe(true)
    tabs.restore('/other')
    expect(tabs.documents).toEqual([])
    expect(tabs.writingPath).toBeNull()
    expect(localStorage.getItem('plotdevice.documentTabs')).not.toContain('Three words')
  })

  it('prunes unavailable restored paths and does not replace an active missing draft', () => {
    localStorage.setItem(
      'plotdevice.documentTabs',
      JSON.stringify({
        version: 1,
        projects: {
          '/book': {
            documents: [
              { path: 'gone.md', pinned: true, temporary: false },
              { path: 'The Ferry.md', pinned: false, temporary: true }
            ],
            activePath: 'gone.md',
            writingPath: 'gone.md'
          }
        }
      })
    )
    const tabs = useDocumentTabsStore()
    tabs.restore('/book')
    expect(tabs.documents.map((tab) => tab.path)).toEqual(['The Ferry.md'])
    expect(tabs.writingPath).toBe('The Ferry.md')
    expect(tabs.activePath).toBe('The Ferry.md')
  })

  it('reports invalid/unavailable settings and keeps session tabs usable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    localStorage.setItem('plotdevice.documentTabs', '{')
    const tabs = useDocumentTabsStore()
    tabs.restore('/book')
    expect(tabs.storageNotice).toContain('invalid')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    tabs.opened('The Ferry.md')
    expect(tabs.documents).toHaveLength(1)
    expect(tabs.storageNotice).toContain('could not be saved')
    expect(warn).toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
