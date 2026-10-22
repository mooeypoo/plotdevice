import { describe, expect, it } from 'vitest'
import { checkLayoutName, layoutNameKey } from './layout-name'
import { PRESETS } from './presets'
import {
  deleteLayout,
  renameLayout,
  resetPreset,
  saveLayoutAs,
  storeArrangement,
  type SettingsChange
} from './saved-layouts'
import {
  layoutFor,
  layoutChoices,
  defaultWorkbenchSettings,
  type WorkbenchSettings
} from './workbench-settings'

function applied(change: SettingsChange): WorkbenchSettings {
  if (!change.ok) throw new Error(`refused: ${JSON.stringify(change.error)}`)
  return change.value
}

const wide = { ...PRESETS.write, end: { ...PRESETS.write.end, size: 600 } }

describe('layout names', () => {
  it('trims and normalizes to NFC', () => {
    // "é" written as e + combining acute accent.
    expect(checkLayoutName('  Révision  ')).toEqual({ ok: true, value: 'Révision' })
  })

  it('refuses empty and overlong names, counting characters not code units', () => {
    expect(checkLayoutName('   ')).toEqual({ ok: false, error: 'name-empty' })
    expect(checkLayoutName('ש'.repeat(80)).ok).toBe(true)
    // Shin with a dot and a qamats: three code points, one character.
    expect(checkLayoutName('שָׁ'.repeat(80)).ok).toBe(true)
    expect(checkLayoutName('😀'.repeat(80)).ok).toBe(true)
    expect(checkLayoutName('x'.repeat(81))).toEqual({ ok: false, error: 'name-too-long' })
  })

  it('compares names after case-folding; Hebrew has no case', () => {
    expect(layoutNameKey('Revise Wide')).toBe(layoutNameKey('revise wide'))
    expect(layoutNameKey('עריכה')).toBe('עריכה')
  })
})

describe('saved layouts', () => {
  const settings = applied(
    saveLayoutAs(defaultWorkbenchSettings(), 'user-1', 'Wide reference', wide)
  )

  it('saves a named layout under the caller’s id', () => {
    expect(settings.saved).toEqual([{ id: 'user-1', name: 'Wide reference' }])
    expect(layoutFor(settings, 'user-1')).toEqual(wide)
  })

  it('refuses a clashing name or id, and an invalid layout', () => {
    expect(saveLayoutAs(settings, 'user-2', 'WIDE reference', wide)).toEqual({
      ok: false,
      error: { code: 'name-taken', name: 'WIDE reference' }
    })
    expect(saveLayoutAs(settings, 'write', 'Mine', wide)).toEqual({
      ok: false,
      error: { code: 'id-taken', id: 'write' }
    })
    const broken = { ...wide, center: { view: 'binder' as const, splits: [] } }
    expect(saveLayoutAs(settings, 'user-2', 'Broken', broken).ok).toBe(false)
  })

  it('renames, allowing a case change of its own name', () => {
    const renamed = applied(renameLayout(settings, 'user-1', 'WIDE REFERENCE'))
    expect(renamed.saved[0]?.name).toBe('WIDE REFERENCE')
    expect(renameLayout(settings, 'write', 'Mine')).toEqual({
      ok: false,
      error: { code: 'preset-fixed', id: 'write' }
    })
    expect(renameLayout(settings, 'user-9', 'Mine').ok).toBe(false)
  })

  it('deletes saved layouts but never presets', () => {
    const deleted = applied(deleteLayout(settings, 'user-1'))
    expect(deleted).toEqual(defaultWorkbenchSettings())
    expect(deleteLayout(settings, 'plot')).toEqual({
      ok: false,
      error: { code: 'preset-fixed', id: 'plot' }
    })
  })

  it('lists choices by mode, presets first', () => {
    expect(layoutChoices(settings, 'writing')).toEqual([
      { kind: 'preset', id: 'write' },
      { kind: 'preset', id: 'revise' },
      { kind: 'saved', id: 'user-1', name: 'Wide reference' }
    ])
    expect(layoutChoices(settings, 'plotting')).toEqual([{ kind: 'preset', id: 'plot' }])
  })
})

describe('rearranging presets', () => {
  it('stores a rearrangement and resets it to the shipped layout', () => {
    const stored = applied(storeArrangement(defaultWorkbenchSettings(), 'write', wide))
    expect(layoutFor(stored, 'write')).toEqual(wide)
    const reset = applied(resetPreset(stored, 'write'))
    expect(layoutFor(reset, 'write')).toEqual(PRESETS.write)
  })

  it('refuses to change a layout’s mode, or to rearrange unknown layouts', () => {
    expect(storeArrangement(defaultWorkbenchSettings(), 'plot', wide)).toEqual({
      ok: false,
      error: { code: 'mode-changed', id: 'plot' }
    })
    expect(storeArrangement(defaultWorkbenchSettings(), 'user-1', wide).ok).toBe(false)
    expect(resetPreset(defaultWorkbenchSettings(), 'user-1').ok).toBe(false)
  })
})
