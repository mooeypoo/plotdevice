import { z } from 'zod'
import type { Layout } from './layout'
import { refuse, succeed, type LayoutResult } from './layout-result'
import { DOCK_SIZE, SHELF_SIZE, SPLITS } from './sizes'
import { VIEW_CATALOG, VIEW_IDS, type ViewId } from './view-catalog'
import {
  AREA_REGIONS,
  ARRANGEMENTS,
  BINDINGS,
  MODES,
  type AreaRegion,
  type Binding
} from './vocabulary'

/** Why a layout is not acceptable. Semantic only; the shell chooses the words. */
export type LayoutProblem =
  | { readonly code: 'malformed' }
  | { readonly code: 'view-repeated'; readonly view: ViewId }
  | { readonly code: 'view-misplaced'; readonly view: ViewId; readonly region: string }
  | { readonly code: 'binding-unsupported'; readonly view: ViewId; readonly binding: Binding }
  | { readonly code: 'plotting-only'; readonly view: ViewId }
  | { readonly code: 'id-repeated'; readonly id: string }
  | { readonly code: 'too-many-splits' }
  | { readonly code: 'active-section-missing'; readonly region: AreaRegion }

const id = z.string().min(1).max(100)
const sectionSchema = z.object({
  id,
  view: z.enum(VIEW_IDS),
  collapsed: z.boolean(),
  weight: z.number().positive().max(1000),
  binding: z.enum(BINDINGS)
})
const areaSchema = (min: number, max: number) =>
  z.object({
    collapsed: z.boolean(),
    size: z.number().int().min(min).max(max),
    arrangement: z.enum(ARRANGEMENTS),
    activeSection: id.nullable(),
    sections: z.array(sectionSchema)
  })
const dockSchema = areaSchema(DOCK_SIZE.min, DOCK_SIZE.max)

/** The stored shape of a layout, before its semantic rules are checked. */
export const layoutSchema = z.object({
  mode: z.enum(MODES),
  center: z.object({
    view: z.enum(VIEW_IDS),
    splits: z.array(z.object({ id, share: z.number().min(SPLITS.minShare).max(SPLITS.maxShare) }))
  }),
  start: dockSchema,
  end: dockSchema,
  bottom: areaSchema(SHELF_SIZE.min, SHELF_SIZE.max)
})

/** Parses and checks a stored layout. */
export function validateLayout(value: unknown): LayoutResult<Layout, LayoutProblem> {
  const parsed = layoutSchema.safeParse(value)
  if (!parsed.success) return refuse({ code: 'malformed' })
  const problem = layoutProblem(parsed.data)
  return problem === undefined ? succeed(parsed.data) : refuse(problem)
}

/** The first rule `layout` breaks, if any. */
export function layoutProblem(layout: Layout): LayoutProblem | undefined {
  const views = new Set<ViewId>()
  const ids = new Set<string>()
  const place = (view: ViewId, region: string): LayoutProblem | undefined => {
    if (views.has(view)) return { code: 'view-repeated', view }
    views.add(view)
    const placement = VIEW_CATALOG[view]
    if (!(placement.regions as readonly string[]).includes(region)) {
      return { code: 'view-misplaced', view, region }
    }
    if (placement.plottingOnly && layout.mode !== 'plotting') return { code: 'plotting-only', view }
    return undefined
  }
  const claim = (value: string): LayoutProblem | undefined => {
    if (ids.has(value)) return { code: 'id-repeated', id: value }
    ids.add(value)
    return undefined
  }

  const centerProblem = place(layout.center.view, 'center')
  if (centerProblem !== undefined) return centerProblem
  if (layout.center.splits.length > SPLITS.max) return { code: 'too-many-splits' }
  for (const split of layout.center.splits) {
    const repeated = claim(split.id)
    if (repeated !== undefined) return repeated
  }
  for (const region of AREA_REGIONS) {
    const area = layout[region]
    for (const section of area.sections) {
      const problem = claim(section.id) ?? place(section.view, region)
      if (problem !== undefined) return problem
      if (!VIEW_CATALOG[section.view].bindings.includes(section.binding)) {
        return { code: 'binding-unsupported', view: section.view, binding: section.binding }
      }
    }
    const active = area.activeSection
    const activeMissing =
      active === null
        ? area.arrangement === 'tabs' && area.sections.length > 0
        : !area.sections.some((section) => section.id === active)
    if (activeMissing) return { code: 'active-section-missing', region }
  }
  return undefined
}
