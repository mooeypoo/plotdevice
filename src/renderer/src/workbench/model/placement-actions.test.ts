import { describe, expect, it } from 'vitest'
import type { Layout } from './layout'
import { setAboveView, setArrangement } from './operations'
import { areaActions, freshSectionId, missingViews, sectionActions } from './placement-actions'
import { PRESETS } from './presets'

const write = PRESETS.write

function applied(
  layout: Layout,
  change: ReturnType<typeof sectionActions>[number]['apply']
): Layout {
  const result = change(layout)
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return result.value
}

describe('sectionActions', () => {
  it('offers only moves the view accepts, plus reordering and close', () => {
    expect(sectionActions(write, 'binder').map((action) => action.kind)).toEqual([
      'move',
      'later',
      'close'
    ])
    const outline = sectionActions(write, 'outline')
    expect(
      outline
        .filter((action) => action.kind === 'move')
        .map((action) => 'region' in action && action.region)
    ).toEqual(['start', 'bottom'])
    expect(outline.map((action) => action.kind)).toContain('earlier')
    expect(outline.map((action) => action.kind)).toContain('later')
  })

  it('offers collapse only in a stack', () => {
    const stacked = applied(write, (layout) => setArrangement(layout, 'end', 'stack'))
    expect(sectionActions(stacked, 'outline').map((action) => action.kind)).toContain('collapse')
    expect(sectionActions(write, 'outline').map((action) => action.kind)).not.toContain('collapse')
  })

  it('moves a view to the end of another area', () => {
    const move = sectionActions(write, 'outline').find(
      (action) => action.kind === 'move' && action.region === 'bottom'
    )
    if (move === undefined) throw new Error('no move to bottom')
    const moved = applied(write, move.apply)
    expect(moved.bottom.sections.map((section) => section.view)).toEqual(['outline'])
  })

  it('offers nothing for an unknown section', () => {
    expect(sectionActions(write, 'nope')).toEqual([])
  })
})

describe('areaActions', () => {
  it('offers views the area accepts and the layout does not show, then the arrangement', () => {
    const actions = areaActions(write, 'bottom', ['binder', 'warnings', 'timeline', 'outline'])
    expect(actions.map((action) => ('view' in action ? action.view : action.kind))).toEqual([
      'warnings',
      'timeline'
    ])
    expect(areaActions(write, 'end', []).map((action) => action.kind)).toEqual(['stacked'])
  })
})

describe('missingViews', () => {
  it('places each missing view where the shipped layouts keep it', () => {
    const closed = applied(write, (layout) => {
      const close = sectionActions(layout, 'reference').find((action) => action.kind === 'close')
      if (close === undefined) throw new Error('no close')
      return close.apply(layout)
    })
    expect(
      missingViews(closed, ['reference', 'warnings', 'binder']).map((missing) => [
        missing.view,
        missing.region
      ])
    ).toEqual([
      ['reference', 'end'],
      ['warnings', 'bottom']
    ])
  })
})

describe('missingViews above the page', () => {
  it('returns the cast strip above the page', () => {
    const hidden = applied(write, (layout) => setAboveView(layout, null))
    const [missing] = missingViews(hidden, ['cast'])
    expect(missing?.region).toBe('above')
    if (missing === undefined) throw new Error('cast not missing')
    expect(applied(hidden, missing.apply).center.above).toBe('cast')
    expect(missingViews(write, ['cast'])).toEqual([])
  })
})

describe('freshSectionId', () => {
  it('reuses the view name when free and numbers it otherwise', () => {
    expect(freshSectionId(write, 'warnings')).toBe('warnings')
    expect(freshSectionId(write, 'binder')).toBe('binder-2')
  })
})
