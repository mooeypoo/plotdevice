import { describe, expect, it } from 'vitest'
import { nameComparisonKey } from './name-comparison-key'

describe('nameComparisonKey', () => {
  it('ignores case', () => {
    expect(nameComparisonKey('Harbor')).toBe(nameComparisonKey('HARBOR'))
    expect(nameComparisonKey('Mira Kovač')).toBe(nameComparisonKey('MIRA KOVAČ'))
  })

  it('treats composed and decomposed forms as the same name', () => {
    const composed = 'Kova\u010D' // č as one code point
    const decomposed = 'Kovac\u030C' // c + combining caron
    expect(nameComparisonKey(composed)).toBe(nameComparisonKey(decomposed))
  })

  it('treats Hebrew niqqud typed in a different order as the same name', () => {
    // בּ + qamats: dagesh then qamats, and qamats then dagesh.
    const dageshFirst = '\u05D1\u05BC\u05B8'
    const qamatsFirst = '\u05D1\u05B8\u05BC'
    expect(nameComparisonKey(dageshFirst)).toBe(nameComparisonKey(qamatsFirst))
  })

  it('leaves Hebrew letters unchanged, since Hebrew has no case', () => {
    expect(nameComparisonKey('מירה')).toBe('מירה')
  })

  it('does not depend on the locale (no Turkish dotless i)', () => {
    expect(nameComparisonKey('INDEX')).toBe('index')
  })
})
