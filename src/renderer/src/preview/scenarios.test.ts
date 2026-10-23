import { describe, expect, it } from 'vitest'
import { parseScenario, SCENARIOS } from './scenarios'

describe('parseScenario', () => {
  it('reads a known scenario and language', () => {
    expect(parseScenario('?scenario=board&lang=he')).toEqual({ name: 'board', lang: 'he' })
    for (const name of SCENARIOS) expect(parseScenario(`?scenario=${name}`).name).toBe(name)
  })

  it('falls back to Writing in English', () => {
    expect(parseScenario('')).toEqual({ name: 'writing', lang: 'en' })
    expect(parseScenario('?scenario=nope&lang=fr')).toEqual({ name: 'writing', lang: 'en' })
  })
})
