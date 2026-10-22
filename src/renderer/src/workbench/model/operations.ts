import { findSection, type Area, type Layout, type Section } from './layout'
import { refuse, succeed, type LayoutResult } from './layout-result'
import { clampShare, clampSize, SPLITS } from './sizes'
import { layoutProblem, type LayoutProblem } from './validate-layout'
import { VIEW_CATALOG, type ViewId } from './view-catalog'
import type { AreaRegion, Arrangement, Binding } from './vocabulary'

/** Why an operation was refused. */
export type LayoutRefusal =
  | LayoutProblem
  | { readonly code: 'section-missing'; readonly section: string }
  | { readonly code: 'split-missing'; readonly split: string }

/** The result of an operation: the new layout, or why nothing changed. */
export type LayoutChange = LayoutResult<Layout, LayoutRefusal>

/** Accepts `next` only if it keeps every layout rule. */
function checked(next: Layout): LayoutChange {
  const problem = layoutProblem(next)
  return problem === undefined ? succeed(next) : refuse(problem)
}

function withArea(layout: Layout, region: AreaRegion, change: (area: Area) => Area): Layout {
  return { ...layout, [region]: change(layout[region]) }
}

/** After removing a section, a tab set shows its first remaining section. */
function withoutSection(area: Area, sectionId: string): Area {
  const sections = area.sections.filter((section) => section.id !== sectionId)
  const activeSection =
    area.activeSection === sectionId
      ? area.arrangement === 'tabs'
        ? (sections[0]?.id ?? null)
        : null
      : area.activeSection
  return { ...area, sections, activeSection }
}

/** Inserts a section; a tab set shows the section it receives. */
function withSection(area: Area, section: Section, index: number): Area {
  const at = Math.max(0, Math.min(index, area.sections.length))
  return {
    ...area,
    sections: [...area.sections.slice(0, at), section, ...area.sections.slice(at)],
    activeSection: area.arrangement === 'tabs' ? section.id : area.activeSection
  }
}

/** Moves a section to `index` in `region`, within its own area or into another. */
export function moveSection(
  layout: Layout,
  sectionId: string,
  to: { readonly region: AreaRegion; readonly index: number }
): LayoutChange {
  const place = findSection(layout, sectionId)
  if (place === undefined) return refuse({ code: 'section-missing', section: sectionId })
  const removed = withArea(layout, place.region, (area) => withoutSection(area, sectionId))
  return checked(withArea(removed, to.region, (area) => withSection(area, place.section, to.index)))
}

/** Places a view that the layout doesn't show yet at the end of `region`. */
export function addView(
  layout: Layout,
  view: ViewId,
  region: AreaRegion,
  sectionId: string
): LayoutChange {
  const section: Section = {
    id: sectionId,
    view,
    collapsed: false,
    weight: 1,
    binding: VIEW_CATALOG[view].bindings[0]
  }
  return checked(
    withArea(layout, region, (area) => withSection(area, section, area.sections.length))
  )
}

/** Removes a section from the layout. */
export function removeSection(layout: Layout, sectionId: string): LayoutChange {
  const place = findSection(layout, sectionId)
  if (place === undefined) return refuse({ code: 'section-missing', section: sectionId })
  return checked(withArea(layout, place.region, (area) => withoutSection(area, sectionId)))
}

/** Shows `view` in the center stage. Splits stay in the layout, shown again with the document. */
export function setCenterView(layout: Layout, view: ViewId): LayoutChange {
  return checked({ ...layout, center: { ...layout.center, view } })
}

/** Shows `view` in the strip above the page, or empties the strip with `null`. */
export function setAboveView(layout: Layout, view: ViewId | null): LayoutChange {
  return checked({ ...layout, center: { ...layout.center, above: view } })
}

/** Collapses or restores a dock or the shelf. */
export function setAreaCollapsed(
  layout: Layout,
  region: AreaRegion,
  collapsed: boolean
): LayoutChange {
  return checked(withArea(layout, region, (area) => ({ ...area, collapsed })))
}

/** Collapses or restores one section. */
export function setSectionCollapsed(
  layout: Layout,
  sectionId: string,
  collapsed: boolean
): LayoutChange {
  return updateSection(layout, sectionId, (section) => ({ ...section, collapsed }))
}

/** Sets a dock's inline size or the shelf's block size, kept within its range. */
export function resizeArea(layout: Layout, region: AreaRegion, size: number): LayoutChange {
  return checked(withArea(layout, region, (area) => ({ ...area, size: clampSize(region, size) })))
}

/** Shows an area's sections stacked or as a tab set. */
export function setArrangement(
  layout: Layout,
  region: AreaRegion,
  arrangement: Arrangement
): LayoutChange {
  return checked(
    withArea(layout, region, (area) => ({
      ...area,
      arrangement,
      activeSection:
        arrangement === 'tabs'
          ? (area.activeSection ?? area.sections[0]?.id ?? null)
          : area.activeSection
    }))
  )
}

/** Brings a section forward: its area and the section are expanded, and a tab set shows it. */
export function activateSection(layout: Layout, sectionId: string): LayoutChange {
  const place = findSection(layout, sectionId)
  if (place === undefined) return refuse({ code: 'section-missing', section: sectionId })
  return checked(
    withArea(layout, place.region, (area) => ({
      ...area,
      collapsed: false,
      activeSection: sectionId,
      sections: area.sections.map((section) =>
        section.id === sectionId ? { ...section, collapsed: false } : section
      )
    }))
  )
}

/** Makes a tab set show `sectionId` without expanding its area, as clicking a visible tab does. */
export function selectSection(layout: Layout, sectionId: string): LayoutChange {
  const place = findSection(layout, sectionId)
  if (place === undefined) return refuse({ code: 'section-missing', section: sectionId })
  return checked(withArea(layout, place.region, (area) => ({ ...area, activeSection: sectionId })))
}

/** Changes what a section shows: project-wide, following the writer, or a pinned entry. */
export function setBinding(layout: Layout, sectionId: string, binding: Binding): LayoutChange {
  return updateSection(layout, sectionId, (section) => ({ ...section, binding }))
}

/** Adds a read-only split beside the writable editor. */
export function openSplit(layout: Layout, splitId: string): LayoutChange {
  if (layout.center.splits.length >= SPLITS.max) return refuse({ code: 'too-many-splits' })
  return checked({
    ...layout,
    center: {
      ...layout.center,
      splits: [...layout.center.splits, { id: splitId, share: SPLITS.defaultShare }]
    }
  })
}

/** Removes a read-only split. */
export function closeSplit(layout: Layout, splitId: string): LayoutChange {
  if (!layout.center.splits.some((split) => split.id === splitId)) {
    return refuse({ code: 'split-missing', split: splitId })
  }
  return checked({
    ...layout,
    center: {
      ...layout.center,
      splits: layout.center.splits.filter((split) => split.id !== splitId)
    }
  })
}

/** Sets a split's share of the center stage, kept within its range. */
export function resizeSplit(layout: Layout, splitId: string, share: number): LayoutChange {
  if (!layout.center.splits.some((split) => split.id === splitId)) {
    return refuse({ code: 'split-missing', split: splitId })
  }
  return checked({
    ...layout,
    center: {
      ...layout.center,
      splits: layout.center.splits.map((split) =>
        split.id === splitId ? { ...split, share: clampShare(share) } : split
      )
    }
  })
}

function updateSection(
  layout: Layout,
  sectionId: string,
  change: (section: Section) => Section
): LayoutChange {
  const place = findSection(layout, sectionId)
  if (place === undefined) return refuse({ code: 'section-missing', section: sectionId })
  return checked(
    withArea(layout, place.region, (area) => ({
      ...area,
      sections: area.sections.map((section) =>
        section.id === sectionId ? change(section) : section
      )
    }))
  )
}
