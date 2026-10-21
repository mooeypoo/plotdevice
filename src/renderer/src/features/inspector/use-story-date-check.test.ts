import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiResult, StoryDateCheckDto } from '../../../../contract/dtos'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useInspectorStore } from '../../app/inspector-store'
import { useStoryDateCheck } from './use-story-date-check'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(() => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})

describe('document date checks', () => {
  it('rechecks unchanged date text when the project calendar changes, rejecting the old result', async () => {
    const inspector = useInspectorStore()
    await inspector.loadVocabulary()
    const pending: ((result: ApiResult<StoryDateCheckDto>) => void)[] = []
    const query = vi
      .spyOn(fake.api.inspector, 'checkStoryDate')
      .mockImplementation(() => new Promise((resolve) => pending.push(resolve)))
    const scope = effectScope()
    const check = scope.run(() =>
      useStoryDateCheck(
        () => '14',
        () => 'chapter.md'
      )
    )
    vi.spyOn(fake.api.inspector, 'getVocabulary').mockResolvedValue({
      ok: true,
      value: { statuses: [], threads: [], calendar: 'day-count' }
    })
    await inspector.loadVocabulary()
    await nextTick()
    expect(query).toHaveBeenCalledTimes(2)
    pending[1]?.({ ok: true, value: { kind: 'date', date: { calendar: 'day-count', day: 14 } } })
    pending[0]?.({ ok: false, error: { code: 'custom', message: 'Old calendar failure' } })
    await nextTick()
    expect(check?.reading.value).toEqual({ kind: 'date', date: { calendar: 'day-count', day: 14 } })
    expect(check?.error.value).toBeNull()
    scope.stop()
  })

  it('rejects out-of-order failures and clears the prior reading while checking', async () => {
    const pending: ((result: ApiResult<StoryDateCheckDto>) => void)[] = []
    vi.spyOn(fake.api.inspector, 'checkStoryDate').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    const text = ref('1952')
    const scope = effectScope()
    const check = scope.run(() =>
      useStoryDateCheck(
        () => text.value,
        () => 'chapter.md'
      )
    )
    if (check === undefined) throw new Error('Expected date checker')
    text.value = '1953'
    await nextTick()
    pending[1]?.({ ok: true, value: { kind: 'date', date: { calendar: 'gregorian', year: 1953 } } })
    await nextTick()
    pending[0]?.({ ok: false, error: { code: 'custom', message: 'Old failure' } })
    await nextTick()
    expect(check.reading.value).toEqual({
      kind: 'date',
      date: { calendar: 'gregorian', year: 1953 }
    })
    expect(check.error.value).toBeNull()
    text.value = '1954'
    await nextTick()
    expect(check.reading.value).toBeUndefined()
    scope.stop()
    pending[2]?.({ ok: false, error: { code: 'custom', message: 'Disposed failure' } })
    await nextTick()
    expect(check.error.value).toBeNull()
  })

  it('does not show old results for A → B → A with identical input', async () => {
    const pending: ((result: ApiResult<StoryDateCheckDto>) => void)[] = []
    vi.spyOn(fake.api.inspector, 'checkStoryDate').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    const path = ref('a.md')
    const scope = effectScope()
    const check = scope.run(() =>
      useStoryDateCheck(
        () => '1952',
        () => path.value
      )
    )
    if (check === undefined) throw new Error('Expected date checker')
    path.value = 'b.md'
    await nextTick()
    path.value = 'a.md'
    await nextTick()
    pending[2]?.({ ok: false, error: { code: 'custom', message: 'Newest EACCES' } })
    pending[0]?.({ ok: true, value: { kind: 'undated' } })
    pending[1]?.({ ok: false, error: { code: 'custom', message: 'B failure' } })
    await nextTick()
    expect(check.error.value).toBe('Newest EACCES')
    expect(check.reading.value).toBeUndefined()
    scope.stop()
  })

  it('retains invalid-date readings as validation results, not API errors', async () => {
    vi.spyOn(fake.api.inspector, 'checkStoryDate').mockResolvedValue({
      ok: true,
      value: { kind: 'invalid', issue: { reason: 'not-date', value: 'nonsense' } }
    })
    const scope = effectScope()
    const check = scope.run(() =>
      useStoryDateCheck(
        () => 'nonsense',
        () => 'chapter.md'
      )
    )
    await nextTick()
    expect(check?.reading.value?.kind).toBe('invalid')
    expect(check?.error.value).toBeNull()
    scope.stop()
  })
})
