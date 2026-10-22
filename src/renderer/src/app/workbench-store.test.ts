// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resizeArea, setCenterView } from '../workbench/model/operations'
import { PRESETS } from '../workbench/model/presets'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchStore } from './workbench-store'
import { useWorkspaceStore } from './workspace-store'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const stored = (key: string): unknown => JSON.parse(localStorage.getItem(key) ?? 'null')

describe('workbench store', () => {
  it('starts with Write and remembers a rearranged layout per user', () => {
    const workbench = useWorkbenchStore()
    expect(workbench.layout).toEqual(PRESETS.write)
    expect(workbench.apply((layout) => resizeArea(layout, 'end', 500))).toBe(true)
    expect(workbench.layout.end.size).toBe(500)
    expect(stored('plotdevice.workbench')).toMatchObject({
      arrangements: { write: { end: { size: 500 } } }
    })
  })

  it('refuses invalid operations without changing anything', () => {
    const workbench = useWorkbenchStore()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // The binder can't fill the center stage.
    expect(workbench.apply((layout) => setCenterView(layout, 'binder'))).toBe(false)
    expect(workbench.layout).toEqual(PRESETS.write)
    expect(localStorage.getItem('plotdevice.workbench')).toBeNull()
  })

  it('chooses the active layout per project', () => {
    const workbench = useWorkbenchStore()
    const workspace = useWorkspaceStore()
    const book = workspace.project
    if (book === null) throw new Error('no project')
    expect(workbench.setActiveLayout('revise')).toBe(true)
    expect(workbench.activeLayoutId).toBe('revise')
    expect(workbench.setActiveLayout('plot')).toBe(false)
    workspace.project = { ...book, root: '/other' }
    expect(workbench.activeLayoutId).toBe('write')
    expect(stored('plotdevice.workbenchProjects')).toMatchObject({
      projects: { [book.root]: { active: { writing: 'revise' } } }
    })
  })

  it('remembers the shell choice', () => {
    const workbench = useWorkbenchStore()
    expect(workbench.shell).toBe('workbench')
    workbench.setShell('classic')
    expect(stored('plotdevice.workbench')).toMatchObject({ shell: 'classic' })
  })

  it('keeps the outline per project, falling back to the old shell’s global choice', async () => {
    localStorage.setItem('plotdevice.layout', JSON.stringify({ outlinePath: 'Plan.md' }))
    setActivePinia(createPinia())
    await useWorkspaceStore().openProject('/book')
    const workbench = useWorkbenchStore()
    expect(workbench.outlinePath).toBe('Plan.md')
    workbench.outlinePath = 'Ledger.md'
    expect(workbench.outlinePath).toBe('Ledger.md')
    expect(localStorage.getItem('plotdevice.layout')).toBe(
      JSON.stringify({ outlinePath: 'Plan.md' })
    )
  })

  it('shows a translated notice when saving fails, and keeps working', () => {
    const workbench = useWorkbenchStore()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('Full')
      }
    })
    expect(workbench.apply((layout) => resizeArea(layout, 'end', 400))).toBe(true)
    expect(workbench.layout.end.size).toBe(400)
    expect(workbench.storageNotice).toContain("couldn't be saved")
    useUiLanguageStore().locale = 'he'
    expect(workbench.storageNotice).toContain('לא ניתן לשמור')
  })
})

describe('layout store over the workbench', () => {
  it('opens and closes the sides by collapsing the areas that hold them', () => {
    const layout = useLayoutStore()
    const workbench = useWorkbenchStore()
    layout.binderOpen = false
    expect(workbench.layout.start.collapsed).toBe(true)
    layout.toggleInspector()
    expect(workbench.layout.end.collapsed).toBe(true)
    expect(layout).toMatchObject({ binderOpen: false, inspectorOpen: false })
  })

  it('switches tabs without opening a closed side', () => {
    const layout = useLayoutStore()
    const workbench = useWorkbenchStore()
    layout.inspectorOpen = false
    layout.rightTab = 'reference'
    layout.sideTab = 'codex'
    expect(workbench.layout.end).toMatchObject({ collapsed: true, activeSection: 'reference' })
    expect(workbench.layout.start.activeSection).toBe('codex')
    expect(layout.rightTab).toBe('reference')
  })

  it('toggles the outline like the old panel', () => {
    const layout = useLayoutStore()
    layout.toggleOutline()
    expect(layout).toMatchObject({ inspectorOpen: true, rightTab: 'outline' })
    layout.toggleOutline()
    expect(layout.inspectorOpen).toBe(false)
  })

  it('no longer writes the old layout key', () => {
    useLayoutStore().toggleBinder()
    expect(localStorage.getItem('plotdevice.layout')).toBeNull()
  })
})
