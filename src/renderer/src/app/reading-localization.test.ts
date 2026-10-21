// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiResult, CodexListingDto, ManuscriptDto } from '../../../contract/dtos'
import ReferencePanel from '../features/reference/ReferencePanel.vue'
import OutlinePanel from '../features/outline/OutlinePanel.vue'
import SidePanel from './SidePanel.vue'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useUiLanguageStore().initialize()
  await useWorkspaceStore().openProject('/book')
})
afterEach(() => vi.restoreAllMocks())

describe('listing and reading diagnostics', () => {
  it.each(['manuscript', 'codex'] as const)(
    'shows a cached %s initial-load error without any locale-triggered reads',
    async (kind) => {
      const failure = {
        ok: false,
        error: {
          code: 'no-project',
          message: 'Legacy',
          diagnostic: { reason: 'no-project' }
        }
      } as const
      const load =
        kind === 'manuscript'
          ? vi.spyOn(fake.api.manuscript, 'getManuscript').mockResolvedValueOnce(failure)
          : vi.spyOn(fake.api.codex, 'listCodex').mockResolvedValueOnce(failure)
      useLayoutStore().sideTab = kind
      const store = kind === 'manuscript' ? useManuscriptStore() : useCodexStore()
      await store.load()
      const page = mount(SidePanel, { props: { attentionCount: 0 } })
      expect(page.get('[role="alert"]').text()).toContain('No project is open')
      const tab = page.get('[role="tab"][aria-selected="true"]').element
      await useUiLanguageStore().change('he')
      expect(page.get('[role="alert"]').text()).not.toContain('No project')
      expect(page.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
      expect(page.get('[aria-selected="true"]').element).toBe(tab)
      expect(load).toHaveBeenCalledOnce()
      await store.load()
      expect(page.find('[role="alert"]').exists()).toBe(false)
      page.unmount()
    }
  )

  it('keeps both listings and clears only the successfully retried listing notice', async () => {
    const manuscript = useManuscriptStore()
    const codex = useCodexStore()
    await Promise.all([manuscript.load(), codex.load()])
    const before = { manuscript: manuscript.manuscript, listing: codex.listing }
    const failure = { ok: false, error: { code: 'custom', message: 'EACCES <img src=x>' } } as const
    vi.spyOn(fake.api.manuscript, 'getManuscript').mockResolvedValueOnce(failure)
    vi.spyOn(fake.api.codex, 'listCodex').mockResolvedValueOnce(failure)
    await Promise.all([manuscript.load(), codex.load()])
    const page = mount(SidePanel, { props: { attentionCount: 0 } })
    expect(page.get('[role="alert"]').text()).toBe('EACCES <img src=x>')
    expect(page.find('img').exists()).toBe(false)
    await useUiLanguageStore().change('he')
    expect(manuscript.loadError).toBe('EACCES <img src=x>')
    expect(codex.loadError).toBe('EACCES <img src=x>')
    expect(manuscript.manuscript).toBe(before.manuscript)
    expect(codex.listing).toBe(before.listing)
    await manuscript.load()
    expect(manuscript.loadError).toBeNull()
    expect(codex.loadError).not.toBeNull()
    codex.close()
    expect(codex.loadError).toBeNull()
    page.unmount()
  })

  it.each(['manuscript', 'codex'] as const)(
    'does not restore a %s listing error after project close',
    async (kind) => {
      let finish: ((result: ApiResult<never>) => void) | undefined
      if (kind === 'manuscript')
        vi.spyOn(fake.api.manuscript, 'getManuscript').mockImplementation(
          () =>
            new Promise((resolve) => {
              finish = resolve
            })
        )
      else
        vi.spyOn(fake.api.codex, 'listCodex').mockImplementation(
          () =>
            new Promise((resolve) => {
              finish = resolve
            })
        )
      const store = kind === 'manuscript' ? useManuscriptStore() : useCodexStore()
      const pending = store.load()
      store.close()
      if (finish === undefined) throw new Error('Expected pending listing')
      finish({ ok: false, error: { code: 'no-project', message: 'Old project failure' } })
      await pending
      expect(store.loadError).toBeNull()
    }
  )

  it.each(['reference', 'outline'] as const)(
    'retranslates a %s read failure without retrying or changing the draft/selection/scroll',
    async (kind) => {
      await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
      const editor = useEditorStore()
      await editor.open('The Ferry.md')
      editor.edit('My unsaved טיוטה')
      editor.saveState = 'conflict'
      const path = kind === 'reference' ? 'characters/Ilka.md' : 'Outline.md'
      const read = vi.spyOn(fake.api.codex, 'openEntry').mockResolvedValue({
        ok: false,
        error: {
          code: 'not-found',
          message: 'Legacy',
          diagnostic: { reason: 'file-missing', path }
        }
      })
      if (kind === 'reference') useReferenceStore().open(path)
      const page = kind === 'reference' ? mount(ReferencePanel) : mount(OutlinePanel)
      await flushPromises()
      const reads = read.mock.calls.length
      const root = page.element as HTMLElement
      root.scrollTop = 123
      const before = new Map(fake.files)
      expect(page.get('[role="alert"]').text()).toContain('no longer exists')
      await useUiLanguageStore().change('he')
      expect(page.get('[role="alert"]').text()).not.toContain('no longer exists')
      expect(page.get('[role="alert"]').text()).toContain(path)
      expect(read).toHaveBeenCalledTimes(reads)
      expect(root.scrollTop).toBe(123)
      expect(editor.entry?.path).toBe('The Ferry.md')
      expect(editor.text).toBe('My unsaved טיוטה')
      expect(fake.files).toEqual(before)
      expect(fake.saves).toEqual([])
      if (kind === 'reference') expect(useReferenceStore().path).toBe(path)
      else expect(page.get('.file-path').text()).toBe(path)
      read.mockRestore()
      if (kind === 'reference') await page.get('.retry').trigger('click')
      else await useCodexStore().reload()
      await flushPromises()
      expect(page.find('[role="alert"]').exists()).toBe(false)
      expect(page.get('.view').text().length).toBeGreaterThan(0)
      expect(editor.text).toBe('My unsaved טיוטה')
      expect(fake.saves).toEqual([])
      page.unmount()
    }
  )

  it('rejects a manuscript listing returned after close and preserves the latest query outcome', async () => {
    const store = useManuscriptStore()
    await store.load()
    const listing = store.manuscript
    if (listing === null) throw new Error('Expected manuscript')
    let finish: ((result: ApiResult<ManuscriptDto>) => void) | undefined
    vi.spyOn(fake.api.manuscript, 'getManuscript').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = store.load()
    store.close()
    if (finish === undefined) throw new Error('Expected pending listing')
    finish({ ok: true, value: listing })
    await pending
    expect(store.manuscript).toBeNull()
    expect(store.loadError).toBeNull()
  })

  it('keeps the newest codex error when an older successful listing finishes later', async () => {
    const store = useCodexStore()
    await store.load()
    const listing = store.listing
    if (listing === null) throw new Error('Expected codex')
    const revision = store.revision
    let finish: ((result: ApiResult<CodexListingDto>) => void) | undefined
    vi.spyOn(fake.api.codex, 'listCodex')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValueOnce({ ok: false, error: { code: 'custom', message: 'Newest failure' } })
    const pending = store.load()
    await store.load()
    if (finish === undefined) throw new Error('Expected pending listing')
    finish({ ok: true, value: listing })
    await pending
    expect(store.listing).toBe(listing)
    expect(store.revision).toBe(revision)
    expect(store.loadError).toBe('Newest failure')
  })

  it('retranslates an unlisted reference with its exact path without reading it', async () => {
    const read = vi.spyOn(fake.api.codex, 'openEntry')
    const reference = useReferenceStore()
    reference.open('notes/יעל <img>.md')
    const page = mount(ReferencePanel)
    await flushPromises()
    expect(page.get('[role="alert"]').text()).toContain('no longer listed')
    await useUiLanguageStore().change('he')
    expect(page.get('[role="alert"]').text()).not.toContain('no longer listed')
    expect(page.get('[role="alert"]').text()).toContain('notes/יעל <img>.md')
    expect(page.find('img').exists()).toBe(false)
    expect(read).not.toHaveBeenCalled()
    page.unmount()
  })
})
