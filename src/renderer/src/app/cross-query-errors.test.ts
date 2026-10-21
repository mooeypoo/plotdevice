// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import type { ApiResult, AppearanceDto, InteractionsDto, TimelineDto } from '../../../contract/dtos'
import TimelineView from '../features/timeline/TimelineView.vue'
import InteractionsView from '../features/interactions/InteractionsView.vue'
import CodexInspector from '../features/inspector/CodexInspector.vue'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'
import { useTimeline } from '../features/timeline/use-timeline'
import { useInteractions } from '../features/interactions/use-interactions'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useUiLanguageStore().initialize()
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})
afterEach(() => vi.restoreAllMocks())

const failure = {
  ok: false,
  error: { code: 'no-project', message: 'Legacy', diagnostic: { reason: 'no-project' } }
} as const

describe('cross-context query errors', () => {
  it('rejects successful timeline data returned after scope disposal', async () => {
    let finish: ((result: ApiResult<TimelineDto>) => void) | undefined
    vi.spyOn(fake.api.timeline, 'getTimeline').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const scope = effectScope()
    const view = scope.run(() => useTimeline())
    scope.stop()
    if (finish === undefined || view === undefined) throw new Error('Expected pending timeline')
    finish({ ok: true, value: fake.timeline.current })
    await flushPromises()
    expect(view.timeline.value).toBeNull()
    expect(view.error.value).toBeNull()
  })

  it('rejects an old successful interactions result after a newer failure', async () => {
    const initial = await fake.api.interactions.getInteractions()
    if (!initial.ok) throw new Error('Expected fixture interactions')
    let finish: ((result: ApiResult<InteractionsDto>) => void) | undefined
    vi.spyOn(fake.api.interactions, 'getInteractions')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValueOnce(failure)
    const scope = effectScope()
    const view = scope.run(() => useInteractions())
    await useCodexStore().reload()
    await flushPromises()
    if (finish === undefined || view === undefined) throw new Error('Expected pending interactions')
    finish(initial)
    await flushPromises()
    expect(view.interactions.value).toBeNull()
    expect(view.error.value).toContain('No project')
    scope.stop()
  })

  it('keeps the latest appearance result when a prior same-document query fails later', async () => {
    await useEditorStore().open('characters/Ilka.md')
    let finish: ((result: ApiResult<readonly AppearanceDto[]>) => void) | undefined
    vi.spyOn(fake.api.codex, 'getAppearsIn')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValueOnce({
        ok: true,
        value: [{ path: 'chapter.md', title: 'Newest', keys: ['pov'] }]
      })
    const codex = useCodexStore()
    const pending = codex.readProperties('characters/Ilka.md')
    await codex.readProperties('characters/Ilka.md')
    if (finish === undefined) throw new Error('Expected pending appearances')
    finish(failure)
    await pending
    expect(codex.appearsInError).toBeNull()
    expect(codex.appearsIn.map((chapter) => chapter.title)).toEqual(['Newest'])
  })
  it.each(['timeline', 'interactions'] as const)(
    'rejects obsolete and disposed %s query failures',
    async (kind) => {
      const pending: ((result: ApiResult<never>) => void)[] = []
      if (kind === 'timeline')
        vi.spyOn(fake.api.timeline, 'getTimeline').mockImplementation(
          () => new Promise((resolve) => pending.push(resolve))
        )
      else
        vi.spyOn(fake.api.interactions, 'getInteractions').mockImplementation(
          () => new Promise((resolve) => pending.push(resolve))
        )
      const scope = effectScope()
      const view = scope.run(() => (kind === 'timeline' ? useTimeline() : useInteractions()))
      if (view === undefined) throw new Error('Expected query view')
      await useCodexStore().reload()
      await flushPromises()
      expect(pending).toHaveLength(2)
      pending[1]?.({ ok: false, error: { code: 'custom', message: 'Newest failure' } })
      pending[0]?.({ ok: false, error: { code: 'custom', message: 'Old failure' } })
      await flushPromises()
      expect(view.error.value).toBe('Newest failure')
      await useCodexStore().reload()
      await flushPromises()
      scope.stop()
      pending[2]?.({ ok: false, error: { code: 'custom', message: 'Disposed failure' } })
      await flushPromises()
      expect(view.error.value).toBe('Newest failure')
    }
  )

  it('rejects old appearance failures after changing or closing the current document', async () => {
    const editor = useEditorStore()
    const codex = useCodexStore()
    await editor.open('characters/Ilka.md')
    const pending: ((result: ApiResult<readonly AppearanceDto[]>) => void)[] = []
    vi.spyOn(fake.api.codex, 'getAppearsIn').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    const read = codex.readProperties('characters/Ilka.md')
    await editor.open('First frost.md')
    pending[0]?.(failure)
    await read
    expect(codex.appearsInError).toBeNull()
    const late = codex.readProperties('characters/Ilka.md')
    codex.close()
    pending[1]?.(failure)
    await late
    expect(codex.appearsInError).toBeNull()
    expect(codex.properties).toBeNull()
  })
  it.each(['timeline', 'interactions'] as const)(
    'shows and retranslates an initial %s query failure without retrying',
    async (kind) => {
      const query =
        kind === 'timeline'
          ? vi.spyOn(fake.api.timeline, 'getTimeline').mockResolvedValueOnce(failure)
          : vi.spyOn(fake.api.interactions, 'getInteractions').mockResolvedValueOnce(failure)
      const page = kind === 'timeline' ? mount(TimelineView) : mount(InteractionsView)
      await flushPromises()
      expect(page.get('[role="alert"]').text()).toContain('No project')
      await useUiLanguageStore().change('he')
      expect(page.get('[role="alert"]').text()).not.toContain('No project')
      expect(page.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
      expect(query).toHaveBeenCalledOnce()
      await useCodexStore().reload()
      await flushPromises()
      expect(page.find('[role="alert"]').exists()).toBe(false)
      expect(fake.saves).toEqual([])
      page.unmount()
    }
  )

  it.each(['timeline', 'interactions'] as const)(
    'retains %s data and selected controls on failed refresh and locale change',
    async (kind) => {
      const editor = useEditorStore()
      await editor.open('First frost.md')
      editor.edit('Unsaved טיוטה')
      editor.saveState = 'conflict'
      const page = kind === 'timeline' ? mount(TimelineView) : mount(InteractionsView)
      await flushPromises()
      if (kind === 'timeline') {
        await page.get('[aria-label="Order"] button:last-child').trigger('click')
        await page.get('[aria-label="Zoom"] button:first-child').trigger('click')
      } else await page.get('tbody .cell').trigger('click')
      const selected = page.get(kind === 'timeline' ? '.bar' : '.cell.picked').element
      const customFailure = {
        ok: false,
        error: { code: 'custom', message: 'ENOSPC <img src=x>' }
      } as const
      const query =
        kind === 'timeline'
          ? vi.spyOn(fake.api.timeline, 'getTimeline').mockResolvedValueOnce(customFailure)
          : vi.spyOn(fake.api.interactions, 'getInteractions').mockResolvedValueOnce(customFailure)
      await useCodexStore().reload()
      await flushPromises()
      expect(page.get('[role="alert"]').text()).toBe('ENOSPC <img src=x>')
      await useUiLanguageStore().change('he')
      expect(page.get('[role="alert"]').text()).toBe('ENOSPC <img src=x>')
      expect(page.find('img').exists()).toBe(false)
      expect(page.get(kind === 'timeline' ? '.bar' : '.cell.picked').element).toBe(selected)
      expect(query).toHaveBeenCalledOnce()
      expect(fake.saves).toEqual([])
      expect(editor.text).toBe('Unsaved טיוטה')
      expect(editor.entry?.path).toBe('First frost.md')
      page.unmount()
    }
  )

  it('shows an appearance failure instead of claiming the character has no chapters', async () => {
    const query = vi.spyOn(fake.api.codex, 'getAppearsIn').mockResolvedValueOnce(failure)
    await useEditorStore().open('characters/Ilka.md')
    const page = mount(CodexInspector, { attachTo: document.body })
    await flushPromises()
    expect(page.get('[data-testid="appearances-error"]').text()).toContain('No project')
    expect(page.text()).not.toContain('No chapter lists')
    const title = page.get<HTMLInputElement>('#codex-title')
    title.element.value = 'Unsaved טיוטה'
    await title.trigger('input')
    title.element.focus()
    await useUiLanguageStore().change('he')
    expect(page.get('[data-testid="appearances-error"]').text()).not.toContain('No project')
    expect(query).toHaveBeenCalledOnce()
    expect(title.element.value).toBe('Unsaved טיוטה')
    expect(page.get('#codex-title').element).toBe(title.element)
    expect(document.activeElement).toBe(title.element)
    expect(fake.codexWrites).toEqual([])
    await useCodexStore().readProperties('characters/Ilka.md')
    await flushPromises()
    expect(page.find('[data-testid="appearances-error"]').exists()).toBe(false)
    expect(page.text()).toContain('The Ferry')
    page.unmount()
  })
})
