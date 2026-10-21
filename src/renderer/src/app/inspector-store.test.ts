import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiResult, InspectorVocabularyDto } from '../../../contract/dtos'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useInspectorStore } from './inspector-store'
import { plotDeviceApi } from './plot-device-api'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(() => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})

describe('inspector vocabulary requests', () => {
  it('does not restore a late status failure after the inspector is cleared', async () => {
    let finish: ((result: ApiResult<readonly string[]>) => void) | undefined
    vi.spyOn(fake.api.manuscript, 'addStatus').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const inspector = useInspectorStore()
    const pending = inspector.addStatus('new')
    inspector.clear()
    if (finish === undefined) throw new Error('Expected pending status')
    finish({ ok: false, error: { code: 'custom', message: 'Old project failure' } })
    await pending
    expect(inspector.error).toBeNull()
    expect(inspector.vocabulary).toBeNull()
  })

  it('retains vocabulary and keeps independent vocabulary/status failures', async () => {
    const inspector = useInspectorStore()
    await inspector.loadVocabulary()
    const vocabulary = inspector.vocabulary
    vi.spyOn(fake.api.inspector, 'getVocabulary').mockResolvedValueOnce({
      ok: false,
      error: { code: 'custom', message: 'Vocabulary EACCES' }
    })
    vi.spyOn(fake.api.manuscript, 'addStatus').mockResolvedValueOnce({
      ok: false,
      error: { code: 'custom', message: 'Status ENOSPC' }
    })
    await inspector.loadVocabulary()
    await inspector.addStatus('new')
    expect(inspector.vocabulary).toBe(vocabulary)
    expect(inspector.vocabularyError).toBe('Vocabulary EACCES')
    expect(inspector.error).toBe('Status ENOSPC')
    await inspector.loadVocabulary()
    expect(inspector.vocabularyError).toBeNull()
    expect(inspector.error).toBe('Status ENOSPC')
  })

  it.each(['success', 'failure'] as const)('ignores vocabulary %s after clear', async (outcome) => {
    let finish: ((result: ApiResult<InspectorVocabularyDto>) => void) | undefined
    vi.spyOn(fake.api.inspector, 'getVocabulary').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const inspector = useInspectorStore()
    const pending = inspector.loadVocabulary()
    inspector.clear()
    if (finish === undefined) throw new Error('Expected pending vocabulary')
    finish(
      outcome === 'success'
        ? { ok: true, value: { statuses: ['old'], threads: [], calendar: 'day-count' } }
        : { ok: false, error: { code: 'custom', message: 'Old failure' } }
    )
    await pending
    expect(inspector.vocabulary).toBeNull()
    expect(inspector.vocabularyError).toBeNull()
  })

  it('keeps a newer vocabulary failure when an older success finishes later', async () => {
    let finish: ((result: ApiResult<InspectorVocabularyDto>) => void) | undefined
    vi.spyOn(fake.api.inspector, 'getVocabulary')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValueOnce({ ok: false, error: { code: 'custom', message: 'Latest failure' } })
    const inspector = useInspectorStore()
    const pending = inspector.loadVocabulary()
    await inspector.loadVocabulary()
    if (finish === undefined) throw new Error('Expected pending vocabulary')
    finish({ ok: true, value: { statuses: [], threads: [], calendar: 'gregorian' } })
    await pending
    expect(inspector.vocabularyError).toBe('Latest failure')
    expect(inspector.vocabulary).toBeNull()
  })
})
