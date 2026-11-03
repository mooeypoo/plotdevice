import { describe, expect, it } from 'vitest'
import { preferencesPatchSchema, preferencesSchema } from './preferences'

describe('preferences on the wire', () => {
  it('accepts valid settings', () => {
    expect(
      preferencesSchema.safeParse({
        theme: 'dark',
        locale: 'he',
        writingSize: 'large',
        pageWidth: 'narrow',
        checkForUpdates: false,
        navigatorWidth: 300,
        shelfWidth: 480,
      }).success,
    ).toBe(true)
  })

  it.each([
    [{ theme: 'purple', locale: 'en' }],
    [{ theme: 'dark', locale: 'fr' }],
    [{ theme: 'dark' }],
    [{ theme: 'dark', locale: 'en', extra: true }],
    ['dark'],
    [null],
  ])('rejects %j', (payload) => {
    expect(preferencesSchema.safeParse(payload).success).toBe(false)
  })

  it('accepts a partial change but no unknown keys', () => {
    expect(preferencesPatchSchema.safeParse({ locale: 'he' }).success).toBe(true)
    expect(preferencesPatchSchema.safeParse({}).success).toBe(true)
    expect(preferencesPatchSchema.safeParse({ fontSize: 20 }).success).toBe(false)
  })

  it('accepts panel widths only within their limits', () => {
    expect(preferencesPatchSchema.safeParse({ shelfWidth: 400 }).success).toBe(true)
    expect(preferencesPatchSchema.safeParse({ shelfWidth: 5000 }).success).toBe(false)
    expect(preferencesPatchSchema.safeParse({ navigatorWidth: 20 }).success).toBe(false)
    expect(preferencesPatchSchema.safeParse({ navigatorWidth: 250.5 }).success).toBe(false)
  })
})
