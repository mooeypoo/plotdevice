import { describe, expect, it } from 'vitest'
import type { Layout } from './layout'
import type { LayoutChange } from './operations'
import {
  activateSection,
  addView,
  closeSplit,
  moveSection,
  openSplit,
  removeSection,
  resizeArea,
  resizeSplit,
  setArrangement,
  setAreaCollapsed,
  setBinding,
  setCenterView,
  selectSection,
  setSectionCollapsed
} from './operations'
import { PRESETS } from './presets'

const write = PRESETS.write

function applied(change: LayoutChange): Layout {
  if (!change.ok) throw new Error(`refused: ${JSON.stringify(change.error)}`)
  return change.value
}

const views = (layout: Layout, region: 'start' | 'end' | 'bottom'): string[] =>
  layout[region].sections.map((section) => section.view)

describe('moveSection', () => {
  it('reorders within a dock', () => {
    const moved = applied(moveSection(write, 'reference', { region: 'end', index: 0 }))
    expect(views(moved, 'end')).toEqual(['reference', 'properties', 'outline'])
  })

  it('moves between docks, showing the moved tab and keeping the source showing another', () => {
    const moved = applied(moveSection(write, 'properties', { region: 'start', index: 1 }))
    expect(views(moved, 'start')).toEqual(['binder', 'properties', 'codex'])
    expect(moved.start.activeSection).toBe('properties')
    expect(views(moved, 'end')).toEqual(['outline', 'reference'])
    expect(moved.end.activeSection).toBe('outline')
  })

  it('moves the outline to the shelf, which accepts it', () => {
    const moved = applied(moveSection(write, 'outline', { region: 'bottom', index: 9 }))
    expect(views(moved, 'bottom')).toEqual(['outline'])
  })

  it('refuses regions a view does not accept and unknown sections', () => {
    expect(moveSection(write, 'binder', { region: 'bottom', index: 0 })).toEqual({
      ok: false,
      error: { code: 'view-misplaced', view: 'binder', region: 'bottom' }
    })
    expect(moveSection(write, 'nope', { region: 'end', index: 0 })).toEqual({
      ok: false,
      error: { code: 'section-missing', section: 'nope' }
    })
  })

  it('leaves an emptied tab set showing nothing', () => {
    let layout = applied(moveSection(write, 'binder', { region: 'end', index: 0 }))
    layout = applied(moveSection(layout, 'codex', { region: 'end', index: 0 }))
    expect(layout.start).toMatchObject({ sections: [], activeSection: null })
  })
})

describe('adding and removing views', () => {
  it('adds a view with its default binding and shows it in a tab set', () => {
    const added = applied(addView(write, 'warnings', 'start', 'warnings'))
    expect(added.start.sections.at(-1)).toMatchObject({ view: 'warnings', binding: 'global' })
    expect(added.start.activeSection).toBe('warnings')
  })

  it('refuses a view the layout already shows', () => {
    expect(addView(write, 'binder', 'end', 'binder-2')).toEqual({
      ok: false,
      error: { code: 'view-repeated', view: 'binder' }
    })
  })

  it('removes a section', () => {
    expect(views(applied(removeSection(write, 'codex')), 'start')).toEqual(['binder'])
  })
})

describe('center stage', () => {
  it('switches views and keeps splits for when the document returns', () => {
    const revise = PRESETS.revise
    const timeline = applied(setCenterView(revise, 'timeline'))
    expect(timeline.center).toEqual({ view: 'timeline', splits: revise.center.splits })
    expect(applied(setCenterView(timeline, 'document')).center).toEqual(revise.center)
  })

  it('refuses views that cannot fill the center', () => {
    expect(setCenterView(write, 'binder').ok).toBe(false)
    expect(setCenterView(write, 'plot-board')).toEqual({
      ok: false,
      error: { code: 'plotting-only', view: 'plot-board' }
    })
  })

  it('opens at most two splits, resizes within range and closes them', () => {
    let layout = applied(openSplit(write, 'a'))
    layout = applied(openSplit(layout, 'b'))
    expect(openSplit(layout, 'c')).toEqual({ ok: false, error: { code: 'too-many-splits' } })
    expect(openSplit(layout, 'a').ok).toBe(false)
    layout = applied(resizeSplit(layout, 'a', 0.99))
    expect(layout.center.splits[0]).toEqual({ id: 'a', share: 0.8 })
    layout = applied(closeSplit(layout, 'a'))
    expect(layout.center.splits.map((split) => split.id)).toEqual(['b'])
    expect(closeSplit(layout, 'a')).toEqual({
      ok: false,
      error: { code: 'split-missing', split: 'a' }
    })
  })

  it('refuses a split id already used by a section', () => {
    expect(openSplit(write, 'binder')).toEqual({
      ok: false,
      error: { code: 'id-repeated', id: 'binder' }
    })
  })
})

describe('collapse, size and arrangement', () => {
  it('collapses and restores areas and sections', () => {
    expect(applied(setAreaCollapsed(write, 'end', true)).end.collapsed).toBe(true)
    const collapsed = applied(setSectionCollapsed(write, 'outline', true))
    expect(collapsed.end.sections[1]?.collapsed).toBe(true)
  })

  it('clamps sizes to each area’s range', () => {
    expect(applied(resizeArea(write, 'end', 5000)).end.size).toBe(720)
    expect(applied(resizeArea(write, 'start', 10)).start.size).toBe(240)
    expect(applied(resizeArea(write, 'bottom', 333.4)).bottom.size).toBe(333)
  })

  it('switches between stack and tabs, keeping the shown tab', () => {
    const stacked = applied(setArrangement(write, 'end', 'stack'))
    expect(stacked.end).toMatchObject({ arrangement: 'stack', activeSection: 'properties' })
    const shelf = applied(setArrangement(PRESETS.revise, 'bottom', 'tabs'))
    expect(shelf.bottom.activeSection).toBe('warnings')
  })

  it('activating a section expands its area and the section', () => {
    let layout = applied(setAreaCollapsed(write, 'end', true))
    layout = applied(setSectionCollapsed(layout, 'reference', true))
    layout = applied(activateSection(layout, 'reference'))
    expect(layout.end.collapsed).toBe(false)
    expect(layout.end.activeSection).toBe('reference')
    expect(layout.end.sections[2]?.collapsed).toBe(false)
  })
})

describe('selectSection', () => {
  it('shows another tab without expanding a collapsed area', () => {
    let layout = applied(setAreaCollapsed(write, 'end', true))
    layout = applied(selectSection(layout, 'outline'))
    expect(layout.end).toMatchObject({ collapsed: true, activeSection: 'outline' })
    expect(selectSection(write, 'nope').ok).toBe(false)
  })
})

describe('setBinding', () => {
  it('pins views that support it and refuses the rest', () => {
    expect(applied(setBinding(write, 'reference', 'pinned')).end.sections[2]?.binding).toBe(
      'pinned'
    )
    expect(setBinding(write, 'binder', 'pinned').ok).toBe(false)
  })
})

describe('operations', () => {
  it('never change the layout they were given', () => {
    const before = JSON.stringify(write)
    applied(moveSection(write, 'properties', { region: 'start', index: 0 }))
    applied(resizeArea(write, 'end', 600))
    expect(JSON.stringify(write)).toBe(before)
  })
})
