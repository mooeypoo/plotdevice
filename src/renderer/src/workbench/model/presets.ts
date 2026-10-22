import type { Area, Layout, Section } from './layout'
import { DOCK_SIZE, SHELF_SIZE, SPLITS } from './sizes'
import type { ViewId } from './view-catalog'
import type { Binding } from './vocabulary'

/** Layouts that ship with the app. They can be rearranged and reset, never renamed or deleted. */
export const PRESET_IDS = ['write', 'revise', 'plot'] as const
/** A shipped layout's id. */
export type PresetId = (typeof PRESET_IDS)[number]

/** Whether `id` names a shipped layout. */
export function isPresetId(id: string): id is PresetId {
  return (PRESET_IDS as readonly string[]).includes(id)
}

const section = (view: ViewId, binding: Binding = 'global'): Section => ({
  id: view,
  view,
  collapsed: false,
  weight: 1,
  binding
})

const tabs = (size: number, sections: readonly Section[]): Area => ({
  collapsed: false,
  size,
  arrangement: 'tabs',
  activeSection: sections[0]?.id ?? null,
  sections
})

const emptyShelf: Area = {
  collapsed: true,
  size: SHELF_SIZE.default,
  arrangement: 'stack',
  activeSection: null,
  sections: []
}

/**
 * Today's app (binder and codex at the start, properties, outline and reference at the end), with
 * the chapter's cast above the page.
 */
const write: Layout = {
  mode: 'writing',
  center: { view: 'document', splits: [], above: 'cast' },
  start: tabs(DOCK_SIZE.start, [section('binder'), section('codex')]),
  end: tabs(DOCK_SIZE.end, [
    section('properties', 'follow'),
    section('outline'),
    section('reference')
  ]),
  bottom: emptyShelf
}

/** Write, plus a read-only split for another chapter, the scene card and the warnings below. */
const revise: Layout = {
  ...write,
  center: {
    view: 'document',
    splits: [{ id: 'split-1', share: SPLITS.defaultShare }],
    above: 'cast'
  },
  end: {
    ...write.end,
    sections: [...write.end.sections, section('scene-card', 'follow')]
  },
  bottom: { ...emptyShelf, collapsed: false, sections: [section('warnings')] }
}

/** The board over the outline in the center, the binder and a reference beside it. */
const plot: Layout = {
  mode: 'plotting',
  center: { view: 'plot-board', splits: [] },
  start: tabs(DOCK_SIZE.start, [section('binder'), section('codex')]),
  end: tabs(DOCK_SIZE.end, [section('reference'), section('properties', 'follow')]),
  bottom: emptyShelf
}

/** The shipped layouts, as data. */
export const PRESETS: Readonly<Record<PresetId, Layout>> = { write, revise, plot }
