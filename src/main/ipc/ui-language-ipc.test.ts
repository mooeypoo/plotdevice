import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UI_LANGUAGE_CHANNELS } from '../../contract/channels'
import { createUiLanguageService } from '../ui-language'
import { registerUiLanguageIpc } from './ui-language-ipc'

const handlers = vi.hoisted(() => new Map<string, (args: readonly unknown[]) => Promise<unknown>>())
vi.mock('./handle-trusted', () => ({
  handleTrusted: (
    channel: string,
    respond: (event: unknown, args: readonly unknown[]) => Promise<unknown>
  ) => {
    handlers.set(channel, (args) => respond(undefined, args))
  }
}))

beforeEach(() => {
  handlers.clear()
})

describe('trusted interface language IPC', () => {
  it('registers fixed channels and rejects unsupported values and argument counts', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, value: undefined })
    const report = vi.fn()
    const service = await createUiLanguageService(
      {
        load: () => Promise.resolve({ ok: true, value: undefined }),
        save
      },
      ['en'],
      report
    )
    registerUiLanguageIpc(service)
    const get = handlers.get(UI_LANGUAGE_CHANNELS.get)
    const set = handlers.get(UI_LANGUAGE_CHANNELS.set)
    if (get === undefined || set === undefined) throw new Error('Missing language handlers')
    expect(await get([])).toEqual({ locale: 'en' })
    for (const args of [[], ['ar'], ['he', 'extra'], [{ locale: 'he' }]]) {
      expect(await set(args)).toMatchObject({
        ok: false,
        error: { code: 'ui-language-invalid-request' }
      })
    }
    expect(save).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledTimes(4)
    expect(await set(['he'])).toEqual({ ok: true, value: { locale: 'he' } })
    expect(await get([])).toEqual({ locale: 'he' })
  })
})
