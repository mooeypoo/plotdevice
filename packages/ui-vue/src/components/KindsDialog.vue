<script setup lang="ts">
import { kindFolderFor } from '@plotdevice/presentation'
import { computed, nextTick, ref, watch } from 'vue'
import { useConfirm } from '../composables/use-confirm'
import { useKinds } from '../composables/use-kinds'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'
import HelpLink from './HelpLink.vue'

// "Kinds of pages" (Milestone 18, ADR 0011): what the book keeps pages about, from a friendly screen,
// never from a file. Renaming a kind changes only its names; its folder stays. Removing one deletes
// nothing: its pages go to "Not sorted yet", where a folder can become a kind again.
const project = useProjectStore()
const story = useStoryStore()
const view = useViewStore()
const kinds = useKinds()
const settings = useSettingsStore()
const { confirm } = useConfirm()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)

/** The form for adding a kind, renaming one, or making an unsorted folder a kind. */
interface Editing {
  mode: 'add' | 'rename' | 'adopt'
  one: string
  many: string
  folder: string
  /** The author typed a folder of their own; it no longer follows the plural. */
  folderTyped: boolean
}
const editing = ref<Editing | null>(null)
const problem = ref<string | null>(null)
const unitOne = ref('')
const unitMany = ref('')
/** What the book calls a part (ADR 0013), as the chapter word above. */
const partOne = ref('')
const partMany = ref('')

// Kinds renamed since their folder was made: matching the folders is offered, never done unasked.
const mismatches = computed(() => (project.project?.folderMismatches ?? []).filter(({ from }) => pagesOf(from) > 0))

const pagesOf = (folder: string): number => story.references.filter((reference) => reference.kind === folder).length

watch(
  () => view.kindsDialog,
  async (open) => {
    if (!open) return dialog.value?.close()
    problem.value = null
    editing.value = null
    unitOne.value = project.project?.manuscriptUnit?.one ?? ''
    unitMany.value = project.project?.manuscriptUnit?.many ?? ''
    partOne.value = project.project?.partUnit?.one ?? ''
    partMany.value = project.project?.partUnit?.many ?? ''
    dialog.value?.showModal()
    if (view.kindsAdopt) startAdopt(view.kindsAdopt)
    await nextTick()
    dialog.value?.querySelector<HTMLElement>('input, button')?.focus()
  },
)

// A new kind's folder follows its plural until the author types one of their own.
watch(
  () => editing.value?.many,
  (many) => {
    const form = editing.value
    if (form && form.mode === 'add' && !form.folderTyped) form.folder = kindFolderFor(many ?? '', kinds.kinds.value)
  },
)

function startAdd(): void {
  problem.value = null
  editing.value = { mode: 'add', one: '', many: '', folder: '', folderTyped: false }
}
function startRename(folder: string): void {
  problem.value = null
  const labels = kinds.labels(folder)
  editing.value = { mode: 'rename', one: labels.one, many: labels.many, folder, folderTyped: true }
}
function startAdopt(folder: string): void {
  problem.value = null
  editing.value = { mode: 'adopt', one: '', many: folder, folder, folderTyped: true }
}

async function save(): Promise<void> {
  const form = editing.value
  if (!form) return
  const ok =
    form.mode === 'rename'
      ? await project.changeKinds({ kind: 'rename', folder: form.folder, one: form.one, many: form.many })
      : await project.changeKinds({ kind: 'add', one: form.one, many: form.many, folder: form.folder })
  if (ok) {
    editing.value = null
    problem.value = null
  } else problem.value = t('kinds-not-saved')
}

async function remove(folder: string): Promise<void> {
  const name = kinds.labels(folder).many
  if (!(await confirm(t('kinds-remove-confirm', name, pagesOf(folder)), t('kinds-remove-action')))) return
  await project.changeKinds({ kind: 'remove', folder })
}

function menu(folder: string, at: number): MenuItem[] {
  const count = kinds.kinds.value.length
  return [
    { key: 'kind-rename', label: t('kinds-rename'), run: () => startRename(folder) },
    {
      key: 'kind-up',
      label: t('kinds-move-up'),
      disabled: at === 0,
      run: () => void project.changeKinds({ kind: 'move', folder, index: at - 1 }),
    },
    {
      key: 'kind-down',
      label: t('kinds-move-down'),
      disabled: at === count - 1,
      run: () => void project.changeKinds({ kind: 'move', folder, index: at + 1 }),
    },
    { key: 'kind-remove', label: t('kinds-remove'), group: 'remove', run: () => void remove(folder) },
  ]
}

const unitChanged = computed(
  () =>
    unitOne.value.trim() !== (project.project?.manuscriptUnit?.one ?? '') ||
    unitMany.value.trim() !== (project.project?.manuscriptUnit?.many ?? ''),
)
async function saveUnit(): Promise<void> {
  const one = unitOne.value.trim()
  const many = unitMany.value.trim()
  const ok = await project.changeKinds({ kind: 'unit', unit: one === '' && many === '' ? null : { one, many } })
  problem.value = ok ? null : t('kinds-not-saved')
}

const partChanged = computed(
  () =>
    partOne.value.trim() !== (project.project?.partUnit?.one ?? '') || partMany.value.trim() !== (project.project?.partUnit?.many ?? ''),
)
async function savePartUnit(): Promise<void> {
  const one = partOne.value.trim()
  const many = partMany.value.trim()
  const ok = await project.changeKinds({ kind: 'part-unit', unit: one === '' && many === '' ? null : { one, many } })
  problem.value = ok ? null : t('kinds-not-saved')
}

function close(): void {
  view.kindsDialog = false
  view.kindsAdopt = null
}
</script>

<template>
  <dialog ref="dialog" class="dialog kinds-dialog" data-testid="kinds-dialog" :aria-label="t('kinds-title')" @close="close">
    <h2>{{ t('kinds-title') }} <HelpLink page="planning/kinds" :label="t('kinds-title')" /></h2>
    <p class="secondary">{{ t('kinds-hint') }}</p>

    <ul class="kinds-list">
      <li v-for="(kind, at) in kinds.kinds.value" :key="kind.folder" class="kind-row" :data-kind="kind.folder">
        <span class="kind-names">
          <span class="kind-many" dir="auto">{{ kinds.labels(kind.folder).many }}</span>
          <span class="secondary kind-folder" dir="ltr">{{ kind.folder }}/</span>
        </span>
        <span class="secondary">{{ t('gallery-pages', pagesOf(kind.folder)) }}</span>
        <MenuButton :label="t('kinds-actions', kinds.labels(kind.folder).many)" :items="menu(kind.folder, at)" align="end" />
      </li>
    </ul>

    <p v-if="mismatches.length > 0" class="secondary kinds-mismatch" data-testid="kinds-mismatch">
      {{ t('kinds-mismatch') }}
      <button type="button" class="link-button" data-testid="match-folders" @click="view.matchFolders = true">
        {{ t('kinds-match-folders') }}
      </button>
    </p>

    <section v-if="kinds.unsorted.value.length > 0" class="kinds-unsorted">
      <h3 class="group-label">{{ t('story-unsorted') }}</h3>
      <ul class="kinds-list">
        <li v-for="folder in kinds.unsorted.value" :key="folder" class="kind-row" :data-unsorted="folder">
          <span class="kind-names"
            ><span dir="ltr">{{ folder }}/</span></span
          >
          <span class="secondary">{{ t('gallery-pages', pagesOf(folder)) }}</span>
          <button type="button" class="link-button" data-testid="kind-adopt" @click="startAdopt(folder)">{{ t('kinds-adopt') }}</button>
        </li>
      </ul>
    </section>

    <form v-if="editing" class="kind-form" data-testid="kind-form" @submit.prevent="save">
      <label>
        {{ t('kinds-field-one') }}
        <input v-model="editing.one" dir="auto" :placeholder="t('kinds-one-placeholder')" data-testid="kind-one" />
      </label>
      <label>
        {{ t('kinds-field-many') }}
        <input v-model="editing.many" dir="auto" :placeholder="t('kinds-many-placeholder')" data-testid="kind-many" />
      </label>
      <label v-if="editing.mode === 'add'">
        {{ t('kinds-field-folder') }}
        <input v-model="editing.folder" dir="auto" data-testid="kind-folder" @input="editing.folderTyped = true" />
      </label>
      <p v-else class="secondary">{{ t('kinds-folder-stays', `${editing.folder}/`) }}</p>
      <div class="actions">
        <button type="button" @click="editing = null">{{ t('prompt-cancel') }}</button>
        <button type="submit" class="primary" data-testid="kind-save">{{ t('kinds-save') }}</button>
      </div>
    </form>
    <button v-else type="button" class="add-link" data-testid="kind-add" @click="startAdd">{{ t('kinds-add') }}</button>

    <section class="kinds-unit">
      <h3 class="group-label">{{ t('kinds-unit-title') }}</h3>
      <p class="secondary">{{ t('kinds-unit-hint') }}</p>
      <form class="kind-form" @submit.prevent="saveUnit">
        <label>
          {{ t('kinds-field-one') }}
          <input v-model="unitOne" dir="auto" :placeholder="t('kinds-unit-one-placeholder')" data-testid="unit-one" />
        </label>
        <label>
          {{ t('kinds-field-many') }}
          <input v-model="unitMany" dir="auto" :placeholder="t('kinds-unit-many-placeholder')" data-testid="unit-many" />
        </label>
        <div class="actions">
          <button type="submit" :disabled="!unitChanged" data-testid="unit-save">{{ t('kinds-save') }}</button>
        </div>
      </form>
    </section>

    <section class="kinds-unit">
      <h3 class="group-label">{{ t('kinds-part-unit-title') }}</h3>
      <p class="secondary">{{ t('kinds-part-unit-hint') }}</p>
      <form class="kind-form" @submit.prevent="savePartUnit">
        <label>
          {{ t('kinds-field-one') }}
          <input v-model="partOne" dir="auto" :placeholder="t('kinds-part-unit-one-placeholder')" data-testid="part-unit-one" />
        </label>
        <label>
          {{ t('kinds-field-many') }}
          <input v-model="partMany" dir="auto" :placeholder="t('kinds-part-unit-many-placeholder')" data-testid="part-unit-many" />
        </label>
        <div class="actions">
          <button type="submit" :disabled="!partChanged" data-testid="part-unit-save">{{ t('kinds-save') }}</button>
        </div>
      </form>
    </section>

    <p v-if="problem" class="warning" role="alert">{{ problem }}</p>
    <div class="actions">
      <button type="button" class="primary" data-testid="kinds-close" @click="close">{{ t('kinds-close') }}</button>
    </div>
  </dialog>
</template>
