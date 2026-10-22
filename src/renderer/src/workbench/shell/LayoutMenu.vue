<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { isolate } from '../../shared/isolate'
import { isPresetId } from '../model/presets'
import type { SavedLayoutRefusal } from '../model/saved-layouts'
import type { MenuItem } from './menu-item'
import MenuButton from './MenuButton.vue'
import { usePlacementMenus } from './use-placement-menus'

const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const navigation = useWorkbenchNavigation()
const menus = usePlacementMenus()

/** The step after choosing a menu item that needs more from the writer. */
const step = ref<'save' | 'rename' | 'delete' | null>(null)
const name = ref('')
const refusal = ref<SavedLayoutRefusal | null>(null)
const field = useTemplateRef<HTMLInputElement>('field')
const confirm = useTemplateRef<HTMLButtonElement>('confirm')

const active = computed(() => workbench.activeLayoutId)
const saved = computed(() => workbench.settings.saved.find((entry) => entry.id === active.value))
const hasOverride = computed(
  () => isPresetId(active.value) && active.value in workbench.settings.arrangements
)

async function begin(next: 'save' | 'rename' | 'delete'): Promise<void> {
  step.value = next
  refusal.value = null
  name.value = next === 'rename' ? (saved.value?.name ?? '') : ''
  await nextTick()
  if (next === 'delete') confirm.value?.focus()
  else field.value?.focus()
}

const items = computed((): MenuItem[] => [
  {
    key: 'save',
    label: language.t('workbench-layout-save-as'),
    run: () => void begin('save')
  },
  ...(saved.value === undefined
    ? []
    : [
        {
          key: 'rename',
          label: language.t('workbench-layout-rename'),
          run: () => void begin('rename')
        },
        {
          key: 'delete',
          label: language.t('workbench-layout-delete'),
          run: () => void begin('delete')
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
    : []),
  ...menus.showMenu()
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
  // Deleting the layout in use switches this project to Write first, with the usual guards.
  void navigation.switchLayout('write').then((switched) => {
    if (switched) workbench.remove(id)
  })
}
</script>

<template>
  <span class="layout-menu">
    <MenuButton :label="language.t('workbench-layout-options')" :items="items" />
    <form
      v-if="step === 'save' || step === 'rename'"
      class="step"
      @submit.prevent="submit"
      @keydown.esc.stop="step = null"
    >
      <label>
        {{ language.t('workbench-layout-name') }}
        <input
          ref="field"
          v-model="name"
          dir="auto"
          :aria-invalid="refusal !== null"
          :aria-describedby="refusal === null ? undefined : 'layout-name-error'"
        />
      </label>
      <p v-if="errorMessage" id="layout-name-error" class="error" role="alert">
        {{ errorMessage }}
      </p>
      <span class="actions">
        <button type="submit" class="primary">{{ language.t('workbench-layout-save') }}</button>
        <button type="button" class="quiet" @click="step = null">
          {{ language.t('workbench-layout-cancel') }}
        </button>
      </span>
    </form>
    <div v-else-if="step === 'delete' && saved" class="step" @keydown.esc.stop="step = null">
      <span class="actions">
        <button ref="confirm" type="button" class="danger" @click="remove">
          {{ language.t('workbench-layout-delete-confirm', isolate(saved.name)) }}
        </button>
        <button type="button" class="quiet" @click="step = null">
          {{ language.t('workbench-layout-cancel') }}
        </button>
      </span>
    </div>
  </span>
</template>

<style scoped>
.layout-menu {
  position: relative;
  display: inline-flex;
}

.step {
  position: absolute;
  z-index: 10;
  top: 100%;
  inset-inline-end: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 16em;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  box-shadow: 0 6px 18px rgb(0 0 0 / 35%);
  font-size: 13px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.error {
  margin: 0;
  color: var(--danger);
}

/* Deleting removes only an arrangement, never a file, but it still reads as a destructive step. */
button.danger {
  border-color: var(--danger);
  color: var(--danger);
}
</style>
