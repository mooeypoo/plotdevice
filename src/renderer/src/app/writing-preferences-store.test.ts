// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWritingPreferencesStore } from './writing-preferences-store'

const KEY = 'plotdevice.writingPreferences'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('writing preferences', () => {
  it('keeps the existing typography as the default', () => {
    const preferences = useWritingPreferencesStore()
    expect(preferences.fontSize).toBe(19)
    expect(preferences.lineWidth).toBe(66)
    expect(preferences.proseStyle).toEqual({ '--prose-size': '19px', '--measure': '66ch' })
  })

  it('persists both typography controls between app sessions', () => {
    const preferences = useWritingPreferencesStore()
    preferences.setFontSize(24)
    preferences.setLineWidth(80)
    setActivePinia(createPinia())
    const restored = useWritingPreferencesStore()
    expect(restored.fontSize).toBe(24)
    expect(restored.lineWidth).toBe(80)
  })

  it('accepts exact limits and rejects out-of-range or non-integer input explicitly', () => {
    const preferences = useWritingPreferencesStore()
    expect(preferences.setFontSize(14).ok).toBe(true)
    expect(preferences.setFontSize(28).ok).toBe(true)
    expect(preferences.setLineWidth(45).ok).toBe(true)
    expect(preferences.setLineWidth(90).ok).toBe(true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    for (const value of [13, 29, 19.5, NaN, Infinity]) {
      expect(preferences.setFontSize(value).ok).toBe(false)
    }
    for (const value of [44, 91, 66.5, NaN, Infinity]) {
      expect(preferences.setLineWidth(value).ok).toBe(false)
    }
    expect(preferences.fontSize).toBe(28)
    expect(preferences.lineWidth).toBe(90)
    expect(warn).toHaveBeenCalledTimes(10)
  })

  it('resets typography without erasing project collapse preferences', () => {
    const preferences = useWritingPreferencesStore()
    preferences.setFontSize(28)
    preferences.setLineWidth(45)
    preferences.setPartCollapsed('/book', 'Part One.md', true)
    preferences.resetTypography()
    expect(preferences.fontSize).toBe(19)
    expect(preferences.lineWidth).toBe(66)
    expect(preferences.isPartCollapsed('/book', 'Part One.md')).toBe(true)
  })

  it.each([
    '{ malformed',
    'null',
    JSON.stringify({ version: 2, fontSize: 19, lineWidth: 66, collapsedParts: {} }),
    JSON.stringify({ version: 1, fontSize: '19', lineWidth: 66, collapsedParts: {} }),
    JSON.stringify({ version: 1, fontSize: 29, lineWidth: 66, collapsedParts: {} }),
    JSON.stringify({ version: 1, fontSize: 19, lineWidth: 44, collapsedParts: {} }),
    JSON.stringify({ version: 1, fontSize: 19, lineWidth: 66, collapsedParts: { '/book': [42] } })
  ])('reports corrupt settings and retains the original until a deliberate change: %s', (text) => {
    localStorage.setItem(KEY, text)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const preferences = useWritingPreferencesStore()
    expect(preferences.fontSize).toBe(19)
    expect(preferences.lineWidth).toBe(66)
    expect(preferences.storageNotice).not.toBe('')
    expect(warn).toHaveBeenCalledOnce()
    expect(localStorage.getItem(KEY)).toBe(text)
    preferences.setFontSize(20)
    expect(preferences.storageNotice).toBe('')
    expect(localStorage.getItem(KEY)).not.toBe(text)
  })

  it('keeps writing usable and reports unavailable storage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('Denied', 'SecurityError')
      }
    })
    const preferences = useWritingPreferencesStore()
    expect(preferences.fontSize).toBe(19)
    expect(preferences.storageNotice).toContain('could not be loaded')
    expect(warn).toHaveBeenCalledOnce()
  })

  it('applies preferences in memory but reports a failed save', () => {
    const preferences = useWritingPreferencesStore()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new DOMException('Full', 'QuotaExceededError')
      }
    })
    preferences.setFontSize(22)
    expect(preferences.fontSize).toBe(22)
    expect(preferences.storageNotice).toContain('could not be saved')
  })
})
