import { computed, ref } from 'vue'
import type { MessageKey } from '../../../../i18n/translator'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { isolate } from '../../shared/isolate'
import type { MenuItem } from '../../shared/menu-item'
import { viewsIn } from '../model/layout'
import { isPresetId, type PresetId } from '../model/presets'
import type { SavedLayoutRefusal } from '../model/saved-layouts'
import { layoutChoices, layoutFor, type LayoutChoice } from '../model/workbench-settings'
import { VIEW_REGISTRY } from '../views/view-registry'

const PRESET_NAMES: Record<PresetId, MessageKey> = {
  write: 'workbench-layout-write',
  revise: 'workbench-layout-revise',
  plot: 'workbench-layout-plot'
}

/** A step after a layout menu item that needs more from the writer: a name, or a confirmation. */
export type LayoutStep = 'save' | 'rename' | 'delete'

/**
 * Everything the Layout submenu offers: this mode's layouts to choose from, then saving,
 * renaming, deleting and resetting them. The steps that need a name or a confirmation are
 * answered in a {@link LayoutDialog} that reads the same state.
 */
export function useLayoutActions() {
  const workbench = useWorkbenchStore()
  const language = useUiLanguageStore()
  const navigation = useWorkbenchNavigation()

  const step = ref<LayoutStep | null>(null)
  const name = ref('')
  const refusal = ref<SavedLayoutRefusal | null>(null)

  const active = computed(() => workbench.activeLayoutId)
  const saved = computed(() => workbench.settings.saved.find((entry) => entry.id === active.value))
  const hasOverride = computed(
    () => isPresetId(active.value) && active.value in workbench.settings.arrangements
  )

  /** The current mode's layouts whose views all exist, so choosing one never shows an empty panel. */
  const choices = computed(() =>
    layoutChoices(workbench.settings, workbench.mode).filter((choice) => {
      const layout = layoutFor(workbench.settings, choice.id)
      return (
        layout !== undefined && viewsIn(layout).every((view) => VIEW_REGISTRY[view] !== undefined)
      )
    })
  )
  const layoutName = (choice: LayoutChoice): string =>
    choice.kind === 'preset' ? language.t(PRESET_NAMES[choice.id as PresetId]) : choice.name

  function begin(next: LayoutStep): void {
    step.value = next
    refusal.value = null
    name.value = next === 'rename' ? (saved.value?.name ?? '') : ''
  }

  const items = computed((): MenuItem[] => [
    ...choices.value.map((choice): MenuItem => ({
      key: `use:${choice.id}`,
      label: layoutName(choice),
      checked: choice.id === active.value,
      run: () => void navigation.switchLayout(choice.id)
    })),
    {
      key: 'save',
      label: language.t('workbench-layout-save-as'),
      separator: true,
      run: () => {
        begin('save')
      }
    },
    ...(saved.value === undefined
      ? []
      : [
          {
            key: 'rename',
            label: language.t('workbench-layout-rename'),
            run: () => {
              begin('rename')
            }
          },
          {
            key: 'delete',
            label: language.t('workbench-layout-delete'),
            run: () => {
              begin('delete')
            }
          }
        ]),
    ...(hasOverride.value
      ? [
          {
            key: 'reset',
            label: language.t('workbench-layout-reset'),
            run: () => {
              const id = active.value
              void navigation.rearrange(() => {
                workbench.reset(id)
              })
            }
          }
        ]
      : [])
  ])

  const errorMessage = computed(() => {
    const problem = refusal.value
    if (problem === null) return ''
    switch (problem.code) {
      case 'name-empty':
        return language.t('workbench-layout-name-empty')
      case 'name-too-long':
        return language.t('workbench-layout-name-too-long')
      case 'name-taken':
        return language.t('workbench-layout-name-taken', isolate(problem.name))
      default:
        // Other refusals are bugs in the menu itself; the console has the details.
        console.warn('Layout change refused.', problem)
        return ''
    }
  })

  function submit(): void {
    const id = saved.value?.id
    refusal.value =
      step.value === 'rename' && id !== undefined
        ? workbench.rename(id, name.value)
        : workbench.saveAs(name.value)
    if (refusal.value === null) step.value = null
  }

  function remove(): void {
    const id = saved.value?.id
    step.value = null
    if (id === undefined) return
    // Deleting the layout in use switches this project to Standard first, with the usual guards.
    void navigation.switchLayout('write').then((switched) => {
      if (switched) workbench.remove(id)
    })
  }

  function cancel(): void {
    step.value = null
  }

  function setName(next: string): void {
    name.value = next
  }

  return { items, step, name, refusal, errorMessage, saved, submit, remove, cancel, setName }
}

/** What a {@link LayoutDialog} needs from {@link useLayoutActions}. */
export type LayoutActions = ReturnType<typeof useLayoutActions>
