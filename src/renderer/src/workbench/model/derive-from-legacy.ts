import type { Area, Layout } from './layout'
import { PRESETS } from './presets'
import { DOCK_SIZE } from './sizes'
import { defaultWorkbenchSettings, type WorkbenchSettings } from './workbench-settings'

/** First-run settings derived from the old shell's storage. */
export interface LegacyDerivation {
  readonly settings: WorkbenchSettings
  /** The old shell's remembered outline; it was global, so each project checks it is its own. */
  readonly legacyOutlinePath: string | null
}

/**
 * Turns the old `plotdevice.layout` record and the writing preferences' `outlineWidth` into a
 * Write arrangement, reading them exactly as the old shell did. Values it can't use fall back to
 * the old shell's defaults. The old keys are only read, never changed.
 */
export function deriveFromLegacy(layoutRecord: unknown, outlineWidth: unknown): LegacyDerivation {
  const saved: Record<string, unknown> =
    typeof layoutRecord === 'object' && layoutRecord !== null && !Array.isArray(layoutRecord)
      ? (layoutRecord as Record<string, unknown>)
      : {}
  const binderOpen = typeof saved['binderOpen'] === 'boolean' ? saved['binderOpen'] : true
  const inspectorOpen = typeof saved['inspectorOpen'] === 'boolean' ? saved['inspectorOpen'] : true
  const sideTab = saved['sideTab'] === 'codex' ? 'codex' : 'binder'
  const rightTab =
    saved['rightTab'] === 'outline' || saved['rightTab'] === 'reference'
      ? saved['rightTab']
      : 'properties'
  const width =
    typeof outlineWidth === 'number' &&
    Number.isInteger(outlineWidth) &&
    outlineWidth >= DOCK_SIZE.min &&
    outlineWidth <= DOCK_SIZE.max
      ? outlineWidth
      : DOCK_SIZE.end

  const write = PRESETS.write
  const derived: Layout = {
    ...write,
    start: withState(write.start, !binderOpen, sideTab),
    end: { ...withState(write.end, !inspectorOpen, rightTab), size: width }
  }
  const settings = defaultWorkbenchSettings()
  return {
    settings: sameLayout(derived, write)
      ? settings
      : { ...settings, arrangements: { write: derived } },
    legacyOutlinePath: typeof saved['outlinePath'] === 'string' ? saved['outlinePath'] : null
  }
}

function withState(area: Area, collapsed: boolean, activeSection: string): Area {
  return { ...area, collapsed, activeSection }
}

function sameLayout(a: Layout, b: Layout): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
