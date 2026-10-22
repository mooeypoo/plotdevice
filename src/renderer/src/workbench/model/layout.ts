import type { ViewId } from './view-catalog'
import type { AreaRegion, Arrangement, Binding, Mode } from './vocabulary'

/** One view placed in a dock or the shelf. */
export interface Section {
  /** Unique within its layout; project state (pins) refers to sections by this id. */
  readonly id: string
  readonly view: ViewId
  readonly collapsed: boolean
  /** Relative share of its area when stacked. */
  readonly weight: number
  readonly binding: Binding
}

/** A dock or the bottom shelf. */
export interface Area {
  readonly collapsed: boolean
  /** Inline size for docks, block size for the shelf, in CSS pixels. */
  readonly size: number
  readonly arrangement: Arrangement
  /** The section a tab set shows; kept while stacked so switching back restores it. */
  readonly activeSection: string | null
  readonly sections: readonly Section[]
}

/** A read-only split beside the writable editor; its document is project state. */
export interface Split {
  readonly id: string
  /** Fraction of the center stage's inline size. */
  readonly share: number
}

/** The center stage: one view, plus read-only splits shown while it holds the document. */
export interface CenterStage {
  readonly view: ViewId
  readonly splits: readonly Split[]
  /** A view in a strip above the page, shown with the document; absent in older layouts. */
  readonly above?: ViewId | null
}

/** A workbench arrangement. It names sides only logically and holds no project paths. */
export interface Layout {
  readonly mode: Mode
  readonly center: CenterStage
  readonly start: Area
  readonly end: Area
  readonly bottom: Area
}

/** Where a section sits in a layout. */
export interface SectionPlace {
  readonly region: AreaRegion
  readonly index: number
  readonly section: Section
}

/** Finds a section by id. */
export function findSection(layout: Layout, sectionId: string): SectionPlace | undefined {
  for (const region of ['start', 'end', 'bottom'] as const) {
    const index = layout[region].sections.findIndex((section) => section.id === sectionId)
    const section = layout[region].sections[index]
    if (section !== undefined) return { region, index, section }
  }
  return undefined
}

/** Finds the section showing `view`, if a dock or the shelf holds it. */
export function findView(layout: Layout, view: ViewId): SectionPlace | undefined {
  for (const region of ['start', 'end', 'bottom'] as const) {
    const index = layout[region].sections.findIndex((section) => section.view === view)
    const section = layout[region].sections[index]
    if (section !== undefined) return { region, index, section }
  }
  return undefined
}

/** Every view the layout shows: the center view and each section's view. */
export function viewsIn(layout: Layout): readonly ViewId[] {
  return [
    layout.center.view,
    ...(layout.center.above === undefined || layout.center.above === null
      ? []
      : [layout.center.above]),
    ...[layout.start, layout.end, layout.bottom].flatMap((area) =>
      area.sections.map((section) => section.view)
    )
  ]
}
