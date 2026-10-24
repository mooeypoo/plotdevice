import { describe, expect, it, vi } from 'vitest'
import type { ApiResult, UiTheme } from '../contract/dtos'
import { createUiThemeService, type UiThemeStore } from './ui-theme'

function memoryStore(initial?: UiTheme, saving: ApiResult<void> = { ok: true, value: undefined }) {
  let saved = initial
  const store: UiThemeStore = {
    load: () => Promise.resolve({ ok: true, value: saved }),
    save: (theme) => {
      if (saving.ok) saved = theme
      return Promise.resolve(saving)
    }
  }
  return store
}

describe('the theme service', () => {
  it('follows the system until the writer chooses, and applies the saved choice at once', async () => {
    const apply = vi.fn()
    const service = await createUiThemeService(memoryStore(), apply, vi.fn())
    expect(service.current()).toBe('system')
    expect(apply).toHaveBeenLastCalledWith('system')
    expect(await service.set('dark')).toEqual({ ok: true, value: 'dark' })
    expect(apply).toHaveBeenLastCalledWith('dark')
    expect(service.current()).toBe('dark')
    const restored = await createUiThemeService(memoryStore('light'), apply, vi.fn())
    expect(restored.current()).toBe('light')
  })

  it('keeps the old theme when saving fails, and refuses a theme it does not know', async () => {
    const apply = vi.fn()
    const report = vi.fn()
    const failing = {
      ok: false as const,
      error: { code: 'ui-language-write', message: 'Disk full' }
    }
    const service = await createUiThemeService(memoryStore('dark', failing), apply, report)
    expect(await service.set('light')).toEqual(failing)
    expect(service.current()).toBe('dark')
    expect(apply).toHaveBeenLastCalledWith('dark')
    expect(await service.set('sepia')).toMatchObject({
      ok: false,
      error: { code: 'ui-theme-invalid-request' }
    })
    expect(report).toHaveBeenCalledTimes(2)
  })
})
