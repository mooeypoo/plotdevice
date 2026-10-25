import { err, ok, type Result } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { defaultPreferences, loadPreferences, parsePreferences, updatePreferences } from './preferences'
import type { PreferencesStore, PreferencesWriteFailure } from './preferences-store'

function memoryStore(initial: string | null, failWith?: PreferencesWriteFailure) {
  const state = { text: initial, setAside: [] as string[] }
  const store: PreferencesStore = {
    read: async () => state.text,
    write: async (text): Promise<Result<void, PreferencesWriteFailure>> => {
      if (failWith) return err(failWith)
      state.text = text
      return ok(undefined)
    },
    setAside: async () => {
      if (state.text !== null) state.setAside.push(state.text)
      state.text = null
    },
  }
  return { store, state }
}

describe('defaults', () => {
  it('follow the system theme, and the system language when it is Hebrew', () => {
    expect(defaultPreferences('he-IL')).toEqual({ theme: 'system', locale: 'he' })
    expect(defaultPreferences('en-US')).toEqual({ theme: 'system', locale: 'en' })
    expect(defaultPreferences('fr')).toEqual({ theme: 'system', locale: 'en' })
  })
})

describe('reading saved settings', () => {
  const defaults = defaultPreferences('en')

  it('keeps valid values', () => {
    expect(parsePreferences('{"theme":"dark","locale":"he"}', defaults)).toEqual({ ok: true, value: { theme: 'dark', locale: 'he' } })
  })

  it('replaces only the invalid value with its default', () => {
    expect(parsePreferences('{"theme":"neon","locale":"he"}', defaults)).toEqual({ ok: true, value: { theme: 'system', locale: 'he' } })
  })

  it.each(['not json', '[]', '"dark"', 'null', '{"theme":'])('treats %j as unreadable', (text) => {
    expect(parsePreferences(text, defaults)).toEqual({ ok: false, error: 'unreadable' })
  })
})

describe('loading', () => {
  it('uses defaults on first run', async () => {
    const { store } = memoryStore(null)
    expect(await loadPreferences(store, 'he')).toEqual({ preferences: { theme: 'system', locale: 'he' } })
  })

  it('sets an unreadable file aside instead of losing it, and says so', async () => {
    const { store, state } = memoryStore('{{ broken')
    expect(await loadPreferences(store, 'en')).toEqual({ preferences: { theme: 'system', locale: 'en' }, notice: 'reset-unreadable' })
    expect(state.setAside).toEqual(['{{ broken'])
  })
})

describe('updating', () => {
  it('saves the merged settings and returns them', async () => {
    const { store, state } = memoryStore(null)
    const result = await updatePreferences(store, { theme: 'system', locale: 'en' }, { locale: 'he' })
    expect(result).toEqual({ ok: true, value: { theme: 'system', locale: 'he' } })
    expect(JSON.parse(state.text ?? '')).toEqual({ theme: 'system', locale: 'he' })
  })

  it('regression: an undefined value in a change does not erase the setting', async () => {
    const { store } = memoryStore(null)
    const result = await updatePreferences(store, { theme: 'dark', locale: 'he' }, { theme: undefined })
    expect(result).toEqual({ ok: true, value: { theme: 'dark', locale: 'he' } })
  })

  it('reports a failed save without pretending it worked', async () => {
    const { store } = memoryStore(null, 'read-only')
    expect(await updatePreferences(store, { theme: 'system', locale: 'en' }, { theme: 'dark' })).toEqual({ ok: false, error: 'read-only' })
  })
})
