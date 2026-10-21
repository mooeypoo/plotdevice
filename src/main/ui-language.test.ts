import { describe, expect, it, vi } from 'vitest'
import { createUiLanguageService, type UiLanguageStore } from './ui-language'

function store(): UiLanguageStore {
  return {
    load: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    save: vi.fn().mockResolvedValue({ ok: true, value: undefined })
  }
}

describe('interface language lifecycle', () => {
  it('detects supported system language without writing a preference', async () => {
    const settings = store()
    const service = await createUiLanguageService(settings, ['fr-FR', 'he-IL'], vi.fn())
    expect(service.current()).toEqual({ locale: 'he' })
    expect(settings.save).not.toHaveBeenCalled()
  })

  it('uses explicit choice ahead of the system and broadcasts only after persistence', async () => {
    const settings = store()
    settings.load = vi.fn().mockResolvedValue({ ok: true, value: 'en' })
    const service = await createUiLanguageService(settings, ['he'], vi.fn())
    const changed = vi.fn()
    const unsubscribe = service.onChanged(changed)
    expect(service.current().locale).toBe('en')
    expect(await service.set('he')).toEqual({ ok: true, value: { locale: 'he' } })
    expect(settings.save).toHaveBeenCalledExactlyOnceWith('he')
    expect(changed).toHaveBeenCalledExactlyOnceWith({ locale: 'he' })
    unsubscribe()
    await service.set('en')
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('reports failed load without overwriting invalid settings', async () => {
    const settings = store()
    const error = { code: 'ui-language-invalid', message: 'Invalid saved value' }
    settings.load = vi.fn().mockResolvedValue({ ok: false, error })
    const report = vi.fn()
    const service = await createUiLanguageService(settings, ['he'], report)
    expect(service.current()).toEqual({ locale: 'he', notice: 'invalid-settings' })
    expect(report).toHaveBeenCalledWith(error)
    expect(settings.save).not.toHaveBeenCalled()
  })

  it('retains the active locale and reports persistence failure without broadcasting', async () => {
    const settings = store()
    const error = { code: 'ui-language-write', message: 'Disk full' }
    settings.save = vi.fn().mockResolvedValue({ ok: false, error })
    const report = vi.fn()
    const service = await createUiLanguageService(settings, ['en'], report)
    const changed = vi.fn()
    service.onChanged(changed)
    expect(await service.set('he')).toEqual({ ok: false, error })
    expect(service.current()).toEqual({ locale: 'en' })
    expect(changed).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledWith(error)
  })

  it('rejects unsupported values without writing or changing state', async () => {
    const settings = store()
    const report = vi.fn()
    const service = await createUiLanguageService(settings, ['en'], report)
    expect(await service.set('ar')).toMatchObject({
      ok: false,
      error: { code: 'ui-language-invalid-request' }
    })
    expect(settings.save).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledOnce()
    expect(service.current().locale).toBe('en')
  })

  it('serializes concurrent switches so persisted and active languages agree', async () => {
    const settings = store()
    let release: () => void = () => {
      throw new Error('Save did not start')
    }
    settings.save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => {
              resolve({ ok: true, value: undefined })
            }
          })
      )
      .mockResolvedValue({ ok: true, value: undefined })
    const service = await createUiLanguageService(settings, ['en'], vi.fn())
    const first = service.set('he')
    const second = service.set('en')
    await Promise.resolve()
    expect(settings.save).toHaveBeenCalledTimes(1)
    expect(service.current().locale).toBe('en')
    release()
    await Promise.all([first, second])
    expect(vi.mocked(settings.save).mock.calls).toEqual([['he'], ['en']])
    expect(service.current().locale).toBe('en')
  })
})
