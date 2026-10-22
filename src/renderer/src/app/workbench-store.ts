import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { MessageKey } from '../../../i18n/translator'
import type { Layout } from '../workbench/model/layout'
import type { LayoutChange } from '../workbench/model/operations'
import { PRESETS } from '../workbench/model/presets'
import { storeArrangement } from '../workbench/model/saved-layouts'
import {
  defaultProjectBindings,
  layoutFor,
  type ProjectBindings,
  type WorkbenchSettings,
  type WorkbenchShell
} from '../workbench/model/workbench-settings'
import {
  loadWorkbenchProjects,
  loadWorkbenchSettings,
  saveWorkbenchProjects,
  saveWorkbenchSettings,
  type WorkbenchStorageProblem
} from '../workbench/storage/workbench-storage'
import { useUiLanguageStore } from './ui-language-store'

const NOTICES: Record<WorkbenchStorageProblem, MessageKey> = {
  unavailable: 'workbench-notice-unavailable',
  invalid: 'workbench-notice-invalid',
  'save-failed': 'workbench-notice-save-failed'
}

/**
 * The writer's workbench: per-user layouts, per-project bindings, and the layout in use for the
 * open project (ADR 0017). Kept in `userData` browser storage, never in the novel folder.
 */
export const useWorkbenchStore = defineStore('workbench', () => {
  const language = useUiLanguageStore()
  const loadedSettings = loadWorkbenchSettings()
  const loadedProjects = loadWorkbenchProjects()
  const settings = shallowRef<WorkbenchSettings>(loadedSettings.settings)
  const projects = shallowRef(loadedProjects.projects)
  const problem = ref<WorkbenchStorageProblem | null>(
    loadedSettings.problem ?? loadedProjects.problem
  )
  const storageNotice = computed(() =>
    problem.value === null ? '' : language.t(NOTICES[problem.value])
  )

  /** The open project's root, set by the workspace store; bindings are kept per root. */
  const projectRoot = ref<string | null>(null)
  const root = computed(() => projectRoot.value)
  /** Bindings while no project is open live only in this session. */
  const unboundBindings = shallowRef<ProjectBindings>(defaultProjectBindings())
  const bindings = computed<ProjectBindings>(() =>
    root.value === null
      ? unboundBindings.value
      : (projects.value.projects[root.value] ?? defaultProjectBindings())
  )
  /** The Writing layout chosen for this project, or Write if that choice no longer exists. */
  const activeLayoutId = computed(() => {
    const chosen = bindings.value.active.writing
    return layoutFor(settings.value, chosen)?.mode === 'writing' ? chosen : 'write'
  })
  const layout = computed<Layout>(
    () => layoutFor(settings.value, activeLayoutId.value) ?? PRESETS.write
  )
  const shell = computed<WorkbenchShell>(() => settings.value.shell)

  function record(outcome: WorkbenchStorageProblem | null): void {
    problem.value = outcome
  }

  function saveSettings(next: WorkbenchSettings): void {
    settings.value = next
    record(saveWorkbenchSettings(next))
  }

  function updateBindings(change: (current: ProjectBindings) => ProjectBindings): void {
    const current = root.value
    if (current === null) {
      unboundBindings.value = change(unboundBindings.value)
      return
    }
    const next = {
      ...projects.value,
      projects: { ...projects.value.projects, [current]: change(bindings.value) }
    }
    projects.value = next
    record(saveWorkbenchProjects(next))
  }

  /** Applies a model operation to the layout in use and remembers the result. */
  function apply(operation: (current: Layout) => LayoutChange): boolean {
    const change = operation(layout.value)
    if (!change.ok) {
      console.warn('Workbench layout change refused.', change.error)
      return false
    }
    const stored = storeArrangement(settings.value, activeLayoutId.value, change.value)
    if (!stored.ok) {
      console.warn('Workbench layout not stored.', stored.error)
      return false
    }
    saveSettings(stored.value)
    return true
  }

  /** Uses another Writing layout for this project. */
  function setActiveLayout(id: string): boolean {
    if (layoutFor(settings.value, id)?.mode !== 'writing') return false
    updateBindings((current) => ({ ...current, active: { ...current.active, writing: id } }))
    return true
  }

  function setShell(next: WorkbenchShell): void {
    if (next !== settings.value.shell) saveSettings({ ...settings.value, shell: next })
  }

  /** The outline this project reads beside the draft; before any choice, the old shell's. */
  const outlinePath = computed<string | null>({
    get: () => bindings.value.outlinePath ?? loadedSettings.legacyOutlinePath,
    set: (path) => {
      updateBindings((current) => ({ ...current, outlinePath: path }))
    }
  })

  return {
    settings,
    projectRoot,
    layout,
    activeLayoutId,
    shell,
    outlinePath,
    storageNotice,
    apply,
    setActiveLayout,
    setShell
  }
})
