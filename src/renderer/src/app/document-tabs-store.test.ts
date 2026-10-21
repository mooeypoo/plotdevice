// @vitest-environment happy-dom
import { EditorState } from '@codemirror/state'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from './codex-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  plotDeviceApi.current = () => createFakePlotDeviceApi().api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('document tabs', () => {
  it.each(['load', 'json', 'schema', 'save'] as const)(
    'retranslates a cached %s notice without storage access or lost session state',
    (failure) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const storage = localStorage
      const get = vi.fn((key: string) => storage.getItem(key))
      const set = vi.fn((key: string, value: string) => { storage.setItem(key, value); })
      vi.stubGlobal('localStorage', { getItem: get, setItem: set })
      const tabs = useDocumentTabsStore()
      if (failure === 'load')
        get.mockImplementation(() => {
          throw new Error('Denied')
        })
      if (failure === 'json') localStorage.setItem('plotdevice.documentTabs', '{')
      if (failure === 'schema') localStorage.setItem('plotdevice.documentTabs', '{"version":2}')
      tabs.restore('/book')
      if (failure === 'save')
        set.mockImplementation(() => {
          throw new Error('Full')
        })
      tabs.opened('The Ferry.md')
      tabs.togglePin('The Ferry.md')
      const id = tabs.documentId('The Ferry.md')
      if (id === undefined) throw new Error('Missing document identity')
      const view = {
        state: EditorState.create({ doc: 'טיוטה draft', selection: { anchor: 3 } }),
        scrollTop: 125,
        scrollLeft: 7
      }
      tabs.rememberView(id, view)
      const documents = tabs.documents
      const english = tabs.storageNotice
      expect(english).not.toBe('')
      get.mockClear()
      set.mockClear()
      warn.mockClear()
      useUiLanguageStore().locale = 'he'
      expect(tabs.storageNotice).not.toBe(english)
      expect(tabs.storageNotice).toMatch(/[\u0590-\u05ff]/u)
      expect(tabs.storageNotice).not.toMatch(/could not|invalid|tabs-notice-/u)
      expect(tabs.documents).toBe(documents)
      expect(tabs.writingPath).toBe('The Ferry.md')
      expect(tabs.activePath).toBe('The Ferry.md')
      expect(tabs.viewOf(id)).toBe(view)
      expect(get).not.toHaveBeenCalled()
      expect(set).not.toHaveBeenCalled()
      expect(warn).not.toHaveBeenCalled()
      useUiLanguageStore().locale = 'en'
      expect(tabs.storageNotice).toBe(english)
      tabs.clear()
      expect(tabs.storageNotice).toBe('')
    }
  )

  it('retranslates pruning without discarding an active missing document', () => {
    const tabs = useDocumentTabsStore()
    tabs.opened('The Ferry.md')
    tabs.opened('First frost.md', true)
    useManuscriptStore().manuscript = null
    tabs.refresh('The Ferry.md')
    expect(tabs.documents.map((tab) => tab.path)).toEqual(['The Ferry.md'])
    expect(tabs.storageNotice).toContain('removed from the tabs')
    useUiLanguageStore().locale = 'he'
    expect(tabs.storageNotice).not.toContain('removed from the tabs')
    expect(tabs.storageNotice).toMatch(/[\u0590-\u05ff]/u)
    expect(tabs.activePath).toBeNull()
    expect(tabs.documents[0]?.path).toBe('The Ferry.md')
    tabs.restore('/other')
    expect(tabs.storageNotice).toBe('')
  })

  it('keeps a tab-storage failure visible after a successful later save until restore or clear', () => {
    const tabs = useDocumentTabsStore()
    tabs.restore('/book')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const storage = localStorage
    const set = vi.fn(() => {
      throw new Error('Full')
    })
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.getItem(key), setItem: set })
    tabs.opened('The Ferry.md')
    expect(tabs.storageNotice).toContain('could not be saved')
    vi.unstubAllGlobals()
    tabs.togglePin('The Ferry.md')
    expect(tabs.storageNotice).toContain('could not be saved')
    useUiLanguageStore().locale = 'he'
    expect(tabs.storageNotice).toContain('לא ניתן לשמור')
    tabs.restore('/book')
    expect(tabs.storageNotice).toBe('')
    expect(tabs.writing?.pinned).toBe(true)
  })

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
