/** Writing and Plotting: two modes over the same files, each with its own active layout. */
export const MODES = ['writing', 'plotting'] as const
/** A workbench mode. */
export type Mode = (typeof MODES)[number]

/** The workbench's regions, named by logical side so a layout mirrors with the interface. */
export const REGIONS = ['center', 'start', 'end', 'bottom'] as const
/** A workbench region. */
export type Region = (typeof REGIONS)[number]

/** Regions that hold sections: the two docks and the bottom shelf. */
export const AREA_REGIONS = ['start', 'end', 'bottom'] as const
/** A region that holds sections. */
export type AreaRegion = (typeof AREA_REGIONS)[number]

/** The two vertical docks, at the inline start and end of the page. */
export type DockSide = Extract<AreaRegion, 'start' | 'end'>

/** How an area shows its sections: all at once, or one at a time. */
export const ARRANGEMENTS = ['stack', 'tabs'] as const
/** An area's arrangement. */
export type Arrangement = (typeof ARRANGEMENTS)[number]

/**
 * What a view shows: something project-wide, whatever relates to the Writing target or active
 * document, or one entry the writer chose. A pinned entry's path is project state, never stored
 * in the layout.
 */
export const BINDINGS = ['global', 'follow', 'pinned'] as const
/** A view's binding. */
export type Binding = (typeof BINDINGS)[number]
