import type { Binding, Region } from './vocabulary'

/** Every view the workbench can place, including views later phases will register. */
export const VIEW_IDS = [
  'document',
  'binder',
  'codex',
  'properties',
  'reference',
  'outline',
  'overview',
  'timeline',
  'interactions',
  'warnings',
  'card-stack',
  'cast',
  'scene-card',
  'plot-board'
] as const
/** A view's stable identity, used in stored layouts. */
export type ViewId = (typeof VIEW_IDS)[number]

/** Where a view may sit and what it may show; the view registry adds how it looks. */
export interface ViewPlacement {
  readonly regions: readonly Region[]
  /** Allowed bindings; the first is the default for a new section. */
  readonly bindings: readonly [Binding, ...Binding[]]
  /** Shown only in Plotting mode layouts. */
  readonly plottingOnly: boolean
}

const panel = (
  regions: readonly Region[],
  bindings: readonly [Binding, ...Binding[]] = ['global']
): ViewPlacement => ({ regions, bindings, plottingOnly: false })

/** Placement rules for each view. */
export const VIEW_CATALOG: Readonly<Record<ViewId, ViewPlacement>> = {
  document: panel(['center']),
  binder: panel(['start', 'end']),
  codex: panel(['start', 'end']),
  properties: panel(['start', 'end'], ['follow']),
  reference: panel(['start', 'end'], ['global', 'pinned']),
  outline: panel(['start', 'end', 'bottom']),
  overview: panel(['center', 'bottom']),
  timeline: panel(['center', 'bottom']),
  interactions: panel(['center', 'bottom']),
  warnings: panel(['start', 'end', 'bottom']),
  'card-stack': panel(['end', 'start']),
  cast: panel(['start', 'end', 'bottom'], ['follow']),
  'scene-card': panel(['start', 'end'], ['follow', 'pinned']),
  'plot-board': { regions: ['center'], bindings: ['global'], plottingOnly: true }
}

/** Whether `value` names a known view. */
export function isViewId(value: string): value is ViewId {
  return (VIEW_IDS as readonly string[]).includes(value)
}
