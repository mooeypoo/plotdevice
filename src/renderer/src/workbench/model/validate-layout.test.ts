import { describe, expect, it } from 'vitest'
import type { Layout } from './layout'
import { PRESETS } from './presets'
import { validateLayout } from './validate-layout'
import { isViewId, VIEW_CATALOG, VIEW_IDS } from './view-catalog'

const write = PRESETS.write

function problemOf(layout: unknown): unknown {
  const result = validateLayout(layout)
  return result.ok ? undefined : result.error
}

describe('view catalog', () => {
  it('places every view somewhere and gives it a default binding', () => {
    for (const view of VIEW_IDS) {
      expect(VIEW_CATALOG[view].regions.length).toBeGreaterThan(0)
      expect(VIEW_CATALOG[view].bindings[0]).toBeDefined()
    }
  })

  it('knows only its own view ids', () => {
    expect(isViewId('binder')).toBe(true)
    expect(isViewId('left-panel')).toBe(false)
  })
})

describe('validateLayout', () => {
  it('accepts every preset', () => {
    for (const layout of Object.values(PRESETS)) expect(validateLayout(layout).ok).toBe(true)
  })

  it.each([
    ['not an object', 'write'],
    ['an unknown view', { ...write, center: { view: 'left-panel', splits: [] } }],
    ['a dock below its minimum', { ...write, start: { ...write.start, size: 100 } }],
    ['a fractional size', { ...write, end: { ...write.end, size: 320.5 } }],
    ['an unknown mode', { ...write, mode: 'editing' }],
    [
      'a split share out of range',
      { ...write, center: { view: 'document', splits: [{ id: 's', share: 0.95 }] } }
    ]
  ])('refuses %s as malformed', (_, layout) => {
    expect(problemOf(layout)).toEqual({ code: 'malformed' })
  })

  it('refuses a view shown twice', () => {
    const layout: Layout = {
      ...write,
      center: { view: 'overview', splits: [] },
      bottom: {
        ...write.bottom,
        sections: [
          { id: 'compact', view: 'overview', collapsed: false, weight: 1, binding: 'global' }
        ]
      }
    }
    expect(problemOf(layout)).toEqual({ code: 'view-repeated', view: 'overview' })
  })

  it('refuses a view in a region it does not accept', () => {
    expect(problemOf({ ...write, center: { view: 'binder', splits: [] } })).toEqual({
      code: 'view-misplaced',
      view: 'binder',
      region: 'center'
    })
    const bottom = {
      ...write.bottom,
      sections: [{ id: 'p', view: 'properties', collapsed: false, weight: 1, binding: 'follow' }]
    }
    expect(
      problemOf({
        ...write,
        end: {
          ...write.end,
          sections: write.end.sections.filter((s) => s.view !== 'properties'),
          activeSection: 'outline'
        },
        bottom
      })
    ).toEqual({
      code: 'view-misplaced',
      view: 'properties',
      region: 'bottom'
    })
  })

  it('refuses a binding the view does not support', () => {
    const end = {
      ...write.end,
      sections: write.end.sections.map((section) =>
        section.view === 'outline' ? { ...section, binding: 'pinned' as const } : section
      )
    }
    expect(problemOf({ ...write, end })).toEqual({
      code: 'binding-unsupported',
      view: 'outline',
      binding: 'pinned'
    })
  })

  it('keeps the board out of Writing layouts', () => {
    expect(problemOf({ ...write, center: { view: 'plot-board', splits: [] } })).toEqual({
      code: 'plotting-only',
      view: 'plot-board'
    })
    expect(validateLayout(PRESETS.plot).ok).toBe(true)
  })

  it('refuses repeated section and split ids', () => {
    const start = {
      ...write.start,
      sections: write.start.sections.map((section) => ({ ...section, id: 'same' })),
      activeSection: 'same'
    }
    expect(problemOf({ ...write, start })).toEqual({ code: 'id-repeated', id: 'same' })
    const splits = [
      { id: 'x', share: 0.5 },
      { id: 'x', share: 0.5 }
    ]
    expect(problemOf({ ...write, center: { view: 'document', splits } })).toEqual({
      code: 'id-repeated',
      id: 'x'
    })
  })

  it('allows at most two splits', () => {
    const splits = ['a', 'b', 'c'].map((id) => ({ id, share: 0.5 }))
    expect(problemOf({ ...write, center: { view: 'document', splits } })).toEqual({
      code: 'too-many-splits'
    })
  })

  it('requires a tab set to show one of its own sections', () => {
    expect(problemOf({ ...write, start: { ...write.start, activeSection: null } })).toEqual({
      code: 'active-section-missing',
      region: 'start'
    })
    expect(problemOf({ ...write, start: { ...write.start, activeSection: 'outline' } })).toEqual({
      code: 'active-section-missing',
      region: 'start'
    })
    expect(
      validateLayout({
        ...write,
        start: { ...write.start, arrangement: 'stack', activeSection: null }
      }).ok
    ).toBe(true)
  })

  it('drops keys it does not know', () => {
    const result = validateLayout({ ...write, left: true })
    expect(result.ok && 'left' in result.value).toBe(false)
  })
})
