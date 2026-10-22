import { describe, expect, it } from 'vitest'
import { isPresetId, PRESETS } from './presets'

describe('presets', () => {
  it('reproduce today’s shell in Write', () => {
    const write = PRESETS.write
    expect(write.mode).toBe('writing')
    expect(write.center).toEqual({ view: 'document', splits: [] })
    expect(write.start.sections.map((section) => section.view)).toEqual(['binder', 'codex'])
    expect(write.start).toMatchObject({ arrangement: 'tabs', activeSection: 'binder', size: 280 })
    expect(write.end.sections.map((section) => section.view)).toEqual([
      'properties',
      'outline',
      'reference'
    ])
    expect(write.end).toMatchObject({ arrangement: 'tabs', activeSection: 'properties', size: 320 })
    expect(write.bottom).toMatchObject({ collapsed: true, sections: [] })
  })

  it('add a split and warnings in Revise', () => {
    expect(PRESETS.revise.center.splits).toHaveLength(1)
    expect(PRESETS.revise.bottom.sections.map((section) => section.view)).toEqual(['warnings'])
  })

  it('put the board in the center of Plot', () => {
    expect(PRESETS.plot).toMatchObject({ mode: 'plotting', center: { view: 'plot-board' } })
  })

  it('name sides only logically, so a language switch mirrors them without rewriting', () => {
    const text = JSON.stringify(PRESETS)
    expect(text).not.toMatch(/left|right/i)
  })

  it('recognize only their own ids', () => {
    expect(isPresetId('write')).toBe(true)
    expect(isPresetId('focus')).toBe(false)
  })
})
