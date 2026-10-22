import { findSection, findView, viewsIn, type Layout } from './layout'
import {
  addView,
  moveSection,
  removeSection,
  setArrangement,
  setSectionCollapsed,
  type LayoutChange
} from './operations'
import { PRESETS } from './presets'
import { VIEW_CATALOG, type ViewId } from './view-catalog'
import { AREA_REGIONS, type AreaRegion } from './vocabulary'

/** Something the writer can do to one section, with the operation that does it. */
export type SectionAction =
  | { readonly kind: 'move'; readonly region: AreaRegion; readonly apply: Apply }
  | { readonly kind: 'earlier' | 'later'; readonly apply: Apply }
  | { readonly kind: 'collapse' | 'expand'; readonly apply: Apply }
  | { readonly kind: 'close'; readonly apply: Apply }

/** Something the writer can do to a whole area. */
export type AreaAction =
  | { readonly kind: 'add'; readonly view: ViewId; readonly apply: Apply }
  | { readonly kind: 'tabs' | 'stacked'; readonly apply: Apply }

/** A view the layout doesn't show, with where it would go. */
export interface MissingView {
  readonly view: ViewId
  readonly region: AreaRegion
  readonly apply: Apply
}

type Apply = (layout: Layout) => LayoutChange

/** Keeps only actions the model accepts for `layout`, so menus never offer a refusal. */
function accepted<T extends { readonly apply: Apply }>(layout: Layout, actions: readonly T[]): T[] {
  return actions.filter((action) => action.apply(layout).ok)
}

/** A section id for `view` that the layout doesn't use yet. */
export function freshSectionId(layout: Layout, view: ViewId): string {
  const used = (id: string): boolean =>
    findSection(layout, id) !== undefined || layout.center.splits.some((split) => split.id === id)
  if (!used(view)) return view
  let n = 2
  while (used(`${view}-${String(n)}`)) n += 1
  return `${view}-${String(n)}`
}

/** What can be done to the section `sectionId`: moves, reordering, collapse, close. */
export function sectionActions(layout: Layout, sectionId: string): readonly SectionAction[] {
  const place = findSection(layout, sectionId)
  if (place === undefined) return []
  const area = layout[place.region]
  const moves = AREA_REGIONS.filter((region) => region !== place.region).map(
    (region): SectionAction => ({
      kind: 'move',
      region,
      apply: (current) =>
        moveSection(current, sectionId, { region, index: current[region].sections.length })
    })
  )
  const reorder: SectionAction[] = [
    ...(place.index > 0
      ? [
          {
            kind: 'earlier' as const,
            apply: (current: Layout) =>
              moveSection(current, sectionId, { region: place.region, index: place.index - 1 })
          }
        ]
      : []),
    ...(place.index < area.sections.length - 1
      ? [
          {
            kind: 'later' as const,
            apply: (current: Layout) =>
              moveSection(current, sectionId, { region: place.region, index: place.index + 1 })
          }
        ]
      : [])
  ]
  const collapse: SectionAction[] =
    area.arrangement === 'stack'
      ? [
          {
            kind: place.section.collapsed ? 'expand' : 'collapse',
            apply: (current) => setSectionCollapsed(current, sectionId, !place.section.collapsed)
          }
        ]
      : []
  const close: SectionAction = {
    kind: 'close',
    apply: (current) => removeSection(current, sectionId)
  }
  return accepted(layout, [...moves, ...reorder, ...collapse, close])
}

/** What can be done to an area: add views it accepts (among `available`), switch arrangement. */
export function areaActions(
  layout: Layout,
  region: AreaRegion,
  available: readonly ViewId[]
): readonly AreaAction[] {
  const shown = new Set(viewsIn(layout))
  const adds = available
    .filter((view) => !shown.has(view))
    .map((view): AreaAction => ({
      kind: 'add',
      view,
      apply: (current) => addView(current, view, region, freshSectionId(current, view))
    }))
  const arrangement: AreaAction =
    layout[region].arrangement === 'tabs'
      ? { kind: 'stacked', apply: (current) => setArrangement(current, region, 'stack') }
      : { kind: 'tabs', apply: (current) => setArrangement(current, region, 'tabs') }
  return accepted(layout, [...adds, ...(layout[region].sections.length > 1 ? [arrangement] : [])])
}

/** Where a view usually lives: its place in the shipped layouts, else its first accepted area. */
function homeOf(view: ViewId): AreaRegion | undefined {
  const shipped = Object.values(PRESETS)
    .map((preset) => findView(preset, view)?.region)
    .find((region) => region !== undefined)
  // Otherwise the catalog lists a view's regions in order of preference.
  return (
    shipped ??
    VIEW_CATALOG[view].regions.find((region): region is AreaRegion => region !== 'center')
  )
}

/** Views among `available` the layout doesn't show, each placed where it usually lives. */
export function missingViews(layout: Layout, available: readonly ViewId[]): readonly MissingView[] {
  return available.flatMap((view): MissingView[] => {
    if (findView(layout, view) !== undefined || layout.center.view === view) return []
    const region = homeOf(view)
    if (region === undefined) return []
    const action: MissingView = {
      view,
      region,
      apply: (current) => addView(current, view, region, freshSectionId(current, view))
    }
    return action.apply(layout).ok ? [action] : []
  })
}
