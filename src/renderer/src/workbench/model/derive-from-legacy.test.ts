import { describe, expect, it } from 'vitest'
import { deriveFromLegacy } from './derive-from-legacy'
import { PRESETS } from './presets'
import { layoutFor } from './workbench-settings'

function writeLayout(layoutRecord: unknown, outlineWidth?: unknown) {
  const { settings } = deriveFromLegacy(layoutRecord, outlineWidth)
  return layoutFor(settings, 'write')
}

describe('deriveFromLegacy', () => {
  it('stores nothing when the old shell had its defaults', () => {
    expect(deriveFromLegacy(undefined, undefined).settings.arrangements).toEqual({})
    expect(
      deriveFromLegacy(
        { binderOpen: true, inspectorOpen: true, sideTab: 'manuscript', rightTab: 'properties' },
        320
      ).settings.arrangements
    ).toEqual({})
  })

  it('carries over closed panels, chosen tabs and the outline width', () => {
    const layout = writeLayout(
      { binderOpen: false, inspectorOpen: false, sideTab: 'codex', rightTab: 'reference' },
      560
    )
    expect(layout?.start).toMatchObject({ collapsed: true, activeSection: 'codex' })
    expect(layout?.end).toMatchObject({ collapsed: true, activeSection: 'reference', size: 560 })
    expect(writeLayout({ rightTab: 'outline' })?.end.activeSection).toBe('outline')
  })

  it.each([
    ['not an object', 'layout', 'width'],
    ['an array', [], -1],
    ['wrong types', { binderOpen: 'no', sideTab: 7, rightTab: 'left' }, 320.5],
    ['an out-of-range width', {}, 9000]
  ])('falls back to the old defaults for %s', (_, layoutRecord, width) => {
    expect(writeLayout(layoutRecord, width)).toEqual(PRESETS.write)
  })

  it('returns the old global outline for projects to check', () => {
    expect(deriveFromLegacy({ outlinePath: 'Working plan.md' }, undefined).legacyOutlinePath).toBe(
      'Working plan.md'
    )
    expect(deriveFromLegacy({ outlinePath: 3 }, undefined).legacyOutlinePath).toBeNull()
  })
})
