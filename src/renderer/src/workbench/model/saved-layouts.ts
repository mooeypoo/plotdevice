import type { Layout } from './layout'
import { refuse, succeed, type LayoutResult } from './layout-result'
import { checkLayoutName, layoutNameKey, type LayoutNameProblem } from './layout-name'
import { isPresetId, PRESETS } from './presets'
import { layoutProblem, type LayoutProblem } from './validate-layout'
import type { WorkbenchSettings } from './workbench-settings'

/** Why a change to the writer's layouts was refused. */
export type SavedLayoutRefusal =
  | { readonly code: LayoutNameProblem }
  | { readonly code: 'name-taken'; readonly name: string }
  | { readonly code: 'id-taken'; readonly id: string }
  | { readonly code: 'preset-fixed'; readonly id: string }
  | { readonly code: 'not-a-preset'; readonly id: string }
  | { readonly code: 'layout-missing'; readonly id: string }
  | { readonly code: 'mode-changed'; readonly id: string }
  | { readonly code: 'invalid-layout'; readonly problem: LayoutProblem }

/** The settings after a change, or why nothing changed. */
export type SettingsChange = LayoutResult<WorkbenchSettings, SavedLayoutRefusal>

function exists(settings: WorkbenchSettings, id: string): boolean {
  return isPresetId(id) || settings.saved.some((entry) => entry.id === id)
}

function nameTaken(settings: WorkbenchSettings, name: string, except?: string): boolean {
  const key = layoutNameKey(name)
  return settings.saved.some((entry) => entry.id !== except && layoutNameKey(entry.name) === key)
}

/** Remembers how the writer rearranged a preset or saved layout. Its mode can't change. */
export function storeArrangement(
  settings: WorkbenchSettings,
  id: string,
  layout: Layout
): SettingsChange {
  if (!exists(settings, id)) return refuse({ code: 'layout-missing', id })
  const current = settings.arrangements[id] ?? (isPresetId(id) ? PRESETS[id] : undefined)
  if (current?.mode !== layout.mode) return refuse({ code: 'mode-changed', id })
  const problem = layoutProblem(layout)
  if (problem !== undefined) return refuse({ code: 'invalid-layout', problem })
  return succeed({ ...settings, arrangements: { ...settings.arrangements, [id]: layout } })
}

/** Saves `layout` as a new named layout with the caller's fresh `id`. */
export function saveLayoutAs(
  settings: WorkbenchSettings,
  id: string,
  name: string,
  layout: Layout
): SettingsChange {
  const checked = checkLayoutName(name)
  if (!checked.ok) return refuse({ code: checked.error })
  if (exists(settings, id) || id in settings.arrangements) return refuse({ code: 'id-taken', id })
  if (nameTaken(settings, checked.value)) return refuse({ code: 'name-taken', name: checked.value })
  const problem = layoutProblem(layout)
  if (problem !== undefined) return refuse({ code: 'invalid-layout', problem })
  return succeed({
    ...settings,
    arrangements: { ...settings.arrangements, [id]: layout },
    saved: [...settings.saved, { id, name: checked.value }]
  })
}

/** Renames one of the writer's layouts. Presets keep their translated names. */
export function renameLayout(
  settings: WorkbenchSettings,
  id: string,
  name: string
): SettingsChange {
  if (isPresetId(id)) return refuse({ code: 'preset-fixed', id })
  if (!exists(settings, id)) return refuse({ code: 'layout-missing', id })
  const checked = checkLayoutName(name)
  if (!checked.ok) return refuse({ code: checked.error })
  if (nameTaken(settings, checked.value, id)) {
    return refuse({ code: 'name-taken', name: checked.value })
  }
  return succeed({
    ...settings,
    saved: settings.saved.map((entry) => (entry.id === id ? { id, name: checked.value } : entry))
  })
}

/** Deletes one of the writer's layouts. Presets can only be reset. */
export function deleteLayout(settings: WorkbenchSettings, id: string): SettingsChange {
  if (isPresetId(id)) return refuse({ code: 'preset-fixed', id })
  if (!exists(settings, id)) return refuse({ code: 'layout-missing', id })
  const arrangements = Object.fromEntries(
    Object.entries(settings.arrangements).filter(([key]) => key !== id)
  )
  return succeed({
    ...settings,
    arrangements,
    saved: settings.saved.filter((entry) => entry.id !== id)
  })
}

/** Returns a preset to the arrangement it ships with. */
export function resetPreset(settings: WorkbenchSettings, id: string): SettingsChange {
  if (!isPresetId(id)) return refuse({ code: 'not-a-preset', id })
  const arrangements = Object.fromEntries(
    Object.entries(settings.arrangements).filter(([key]) => key !== id)
  )
  return succeed({ ...settings, arrangements })
}
