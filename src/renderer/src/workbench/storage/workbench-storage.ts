import { deriveFromLegacy } from '../model/derive-from-legacy'
import {
  defaultWorkbenchProjects,
  defaultWorkbenchSettings,
  parseWorkbenchProjects,
  parseWorkbenchSettings,
  type WorkbenchProjects,
  type WorkbenchSettings
} from '../model/workbench-settings'

/** Per-user layouts. Chromium keeps browser storage in `userData`, never in the novel folder. */
export const WORKBENCH_KEY = 'plotdevice.workbench'
/** Per-project bindings, keyed by project root. */
export const WORKBENCH_PROJECTS_KEY = 'plotdevice.workbenchProjects'
/** The old shell's layout record: read once to derive the first workbench settings, then removed. */
export const LEGACY_LAYOUT_KEY = 'plotdevice.layout'
/** Writing preferences, which hold the old shell's outline width. */
export const WRITING_PREFERENCES_KEY = 'plotdevice.writingPreferences'

/** Why stored workbench state couldn't be used or kept. The shell chooses the words. */
export type WorkbenchStorageProblem = 'unavailable' | 'invalid' | 'save-failed'

/** The storage calls the adapter needs; `localStorage` by default. */
export type WorkbenchStorage = Pick<Storage, 'getItem' | 'setItem'> &
  Partial<Pick<Storage, 'removeItem'>>

/** Per-user settings as loaded. */
export interface LoadedWorkbenchSettings {
  readonly settings: WorkbenchSettings
  /** True when no workbench settings existed yet and these came from the old shell's keys. */
  readonly derived: boolean
  /** The old shell's global outline, read with its record in the session that removes it. */
  readonly legacyOutlinePath: string | null
  readonly problem: WorkbenchStorageProblem | null
}

function defaultStorage(): WorkbenchStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function report(problem: WorkbenchStorageProblem, key: string, detail?: unknown): void {
  console.warn('Workbench storage failure.', problem, key, detail)
}

type Read =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly problem: WorkbenchStorageProblem }

/** Reads and parses one key: `undefined` when absent. */
function readJson(storage: WorkbenchStorage | undefined, key: string): Read {
  if (storage === undefined) return { ok: false, problem: 'unavailable' }
  let text: string | null
  try {
    text = storage.getItem(key)
  } catch (error) {
    report('unavailable', key, error)
    return { ok: false, problem: 'unavailable' }
  }
  if (text === null) return { ok: true, value: undefined }
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    report('invalid', key, error)
    return { ok: false, problem: 'invalid' }
  }
}

/** Reads a legacy key for derivation; anything unreadable counts as absent. */
function readLegacy(storage: WorkbenchStorage | undefined, key: string): unknown {
  const read = readJson(storage, key)
  return read.ok ? read.value : undefined
}

function writeJson(
  storage: WorkbenchStorage | undefined,
  key: string,
  value: unknown
): WorkbenchStorageProblem | null {
  if (storage === undefined) return 'unavailable'
  try {
    storage.setItem(key, JSON.stringify(value))
    return null
  } catch (error) {
    report('save-failed', key, error)
    return 'save-failed'
  }
}

/** Removes the old shell's layout record once its settings live on in the workbench's (W6). */
function retireLegacyLayout(storage: WorkbenchStorage | undefined): void {
  try {
    storage?.removeItem?.(LEGACY_LAYOUT_KEY)
  } catch (error) {
    report('save-failed', LEGACY_LAYOUT_KEY, error)
  }
}

/**
 * Loads per-user layouts. On first run they are derived from the old shell's keys and saved; once
 * workbench settings are safely stored, the old record is removed. Unusable storage falls back to
 * the presets and is reported, never blocking writing, and then the old record is kept.
 */
export function loadWorkbenchSettings(given?: WorkbenchStorage): LoadedWorkbenchSettings {
  const storage = given ?? defaultStorage()
  if (storage === undefined) report('unavailable', WORKBENCH_KEY)
  const legacyLayout = readLegacy(storage, LEGACY_LAYOUT_KEY)
  const legacyOutlinePath = deriveFromLegacy(legacyLayout, undefined).legacyOutlinePath
  const fallback = (problem: WorkbenchStorageProblem): LoadedWorkbenchSettings => ({
    settings: defaultWorkbenchSettings(),
    derived: false,
    legacyOutlinePath,
    problem
  })

  const read = readJson(storage, WORKBENCH_KEY)
  if (!read.ok) return fallback(read.problem)
  if (read.value === undefined) {
    const preferences = readLegacy(storage, WRITING_PREFERENCES_KEY)
    const outlineWidth =
      typeof preferences === 'object' && preferences !== null && 'outlineWidth' in preferences
        ? preferences.outlineWidth
        : undefined
    const settings = deriveFromLegacy(legacyLayout, outlineWidth).settings
    if (legacyLayout === undefined)
      return { settings, derived: true, legacyOutlinePath, problem: null }
    const saved = writeJson(storage, WORKBENCH_KEY, settings)
    if (saved === null) retireLegacyLayout(storage)
    return { settings, derived: true, legacyOutlinePath, problem: saved }
  }
  const parsed = parseWorkbenchSettings(read.value)
  if (parsed === undefined) {
    report('invalid', WORKBENCH_KEY)
    return fallback('invalid')
  }
  if (parsed.dropped > 0) report('invalid', WORKBENCH_KEY, `${String(parsed.dropped)} dropped`)
  retireLegacyLayout(storage)
  return {
    settings: parsed.settings,
    derived: false,
    legacyOutlinePath,
    problem: parsed.dropped > 0 ? 'invalid' : null
  }
}

/** Saves per-user layouts. */
export function saveWorkbenchSettings(
  settings: WorkbenchSettings,
  given?: WorkbenchStorage
): WorkbenchStorageProblem | null {
  const storage = given ?? defaultStorage()
  return writeJson(storage, WORKBENCH_KEY, settings)
}

/** Loads per-project bindings; unusable storage starts empty and is reported. */
export function loadWorkbenchProjects(given?: WorkbenchStorage): {
  readonly projects: WorkbenchProjects
  readonly problem: WorkbenchStorageProblem | null
} {
  const read = readJson(given ?? defaultStorage(), WORKBENCH_PROJECTS_KEY)
  if (!read.ok) return { projects: defaultWorkbenchProjects(), problem: read.problem }
  if (read.value === undefined) return { projects: defaultWorkbenchProjects(), problem: null }
  const parsed = parseWorkbenchProjects(read.value)
  if (parsed !== undefined) return { projects: parsed, problem: null }
  report('invalid', WORKBENCH_PROJECTS_KEY)
  return { projects: defaultWorkbenchProjects(), problem: 'invalid' }
}

/** Saves per-project bindings. */
export function saveWorkbenchProjects(
  projects: WorkbenchProjects,
  given?: WorkbenchStorage
): WorkbenchStorageProblem | null {
  const storage = given ?? defaultStorage()
  return writeJson(storage, WORKBENCH_PROJECTS_KEY, projects)
}
