import { describe, expect, it } from 'vitest'
import { effectiveTheme } from './appearance'

describe('effectiveTheme', () => {
  it.each([
    ['system', false, 'light'],
    ['system', true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)('%s with the system %s dark → %s', (preference, systemIsDark, expected) => {
    expect(effectiveTheme(preference, systemIsDark)).toBe(expected)
  })
})
