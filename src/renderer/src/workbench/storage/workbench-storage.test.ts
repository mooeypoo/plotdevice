// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../model/presets'
import { defaultProjectBindings, layoutFor } from '../model/workbench-settings'
import {
  LEGACY_LAYOUT_KEY,
  loadWorkbenchProjects,
  loadWorkbenchSettings,
  saveWorkbenchProjects,
  saveWorkbenchSettings,
  WORKBENCH_KEY,
  WORKBENCH_PROJECTS_KEY,
  WRITING_PREFERENCES_KEY
} from './workbench-storage'

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const legacyLayout = JSON.stringify({
  binderOpen: false,
  inspectorOpen: true,
  sideTab: 'codex',
  rightTab: 'outline',
  outlinePath: 'Working plan.md'
})
const legacyPreferences = JSON.stringify({ version: 1, fontSize: 19, outlineWidth: 480 })

describe('loadWorkbenchSettings', () => {
  it('derives the first settings from the old shell and leaves its keys untouched', () => {
    localStorage.setItem(LEGACY_LAYOUT_KEY, legacyLayout)
    localStorage.setItem(WRITING_PREFERENCES_KEY, legacyPreferences)
    const loaded = loadWorkbenchSettings()
    expect(loaded).toMatchObject({
      derived: true,
      problem: null,
      legacyOutlinePath: 'Working plan.md'
    })
    expect(layoutFor(loaded.settings, 'write')).toMatchObject({
      start: { collapsed: true, activeSection: 'codex' },
      end: { collapsed: false, activeSection: 'outline', size: 480 }
    })
    expect(localStorage.getItem(LEGACY_LAYOUT_KEY)).toBe(legacyLayout)
    expect(localStorage.getItem(WRITING_PREFERENCES_KEY)).toBe(legacyPreferences)
    expect(localStorage.getItem(WORKBENCH_KEY)).toBeNull()
  })

  it('starts from the presets on a fresh profile', () => {
    const loaded = loadWorkbenchSettings()
    expect(loaded).toMatchObject({ derived: true, problem: null, legacyOutlinePath: null })
    expect(layoutFor(loaded.settings, 'write')).toEqual(PRESETS.write)
  })

  it('reads saved settings instead of deriving again', () => {
    localStorage.setItem(LEGACY_LAYOUT_KEY, legacyLayout)
    const settings = { version: 1 as const, arrangements: {}, saved: [] }
    expect(saveWorkbenchSettings(settings)).toBeNull()
    expect(loadWorkbenchSettings()).toEqual({
      settings,
      derived: false,
      legacyOutlinePath: 'Working plan.md',
      problem: null
    })
  })

  it('reports invalid JSON or envelopes and falls back to the presets without overwriting', () => {
    for (const text of ['{oops', JSON.stringify({ version: 9 })]) {
      localStorage.setItem(WORKBENCH_KEY, text)
      const loaded = loadWorkbenchSettings()
      expect(loaded).toMatchObject({ derived: false, problem: 'invalid' })
      expect(loaded.settings.arrangements).toEqual({})
      expect(localStorage.getItem(WORKBENCH_KEY)).toBe(text)
    }
  })

  it('keeps valid layouts when one is invalid, and reports it', () => {
    const wide = { ...PRESETS.write, end: { ...PRESETS.write.end, size: 600 } }
    localStorage.setItem(
      WORKBENCH_KEY,
      JSON.stringify({
        version: 1,
        arrangements: { write: wide, revise: { mode: 'writing' } },
        saved: []
      })
    )
    const loaded = loadWorkbenchSettings()
    expect(loaded.problem).toBe('invalid')
    expect(loaded.settings.arrangements).toEqual({ write: wide })
  })

  it('reports unavailable storage and still returns usable presets', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Denied')
      },
      setItem: () => {
        throw new Error('Denied')
      }
    })
    const loaded = loadWorkbenchSettings()
    expect(loaded.problem).toBe('unavailable')
    expect(layoutFor(loaded.settings, 'write')).toEqual(PRESETS.write)
    expect(saveWorkbenchSettings(loaded.settings)).toBe('save-failed')
  })
})

describe('project bindings', () => {
  it('round-trip per project root', () => {
    const projects = {
      version: 1 as const,
      projects: {
        '/novels/salt': { ...defaultProjectBindings(), cards: ['characters/Ilka Szabó.md'] }
      }
    }
    expect(saveWorkbenchProjects(projects)).toBeNull()
    expect(loadWorkbenchProjects()).toEqual({ projects, problem: null })
  })

  it('start empty, reporting invalid storage without overwriting it', () => {
    expect(loadWorkbenchProjects()).toEqual({
      projects: { version: 1, projects: {} },
      problem: null
    })
    localStorage.setItem(WORKBENCH_PROJECTS_KEY, '{"version":1,"projects":{"/x":3}}')
    expect(loadWorkbenchProjects().problem).toBe('invalid')
    expect(localStorage.getItem(WORKBENCH_PROJECTS_KEY)).toBe('{"version":1,"projects":{"/x":3}}')
  })
})
