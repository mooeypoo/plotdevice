<script setup lang="ts">
import { linkTargets, search, type LinkTarget } from '@plotdevice/presentation'
import { computed, nextTick, ref, watch } from 'vue'
import { useLinkPicker } from '../composables/use-link-picker'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'

const { current } = useLinkPicker()
const project = useProjectStore()
const story = useStoryStore()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const selected = ref(0)

const results = computed<LinkTarget[]>(() => (project.project ? search(linkTargets(project.project, story.references), query.value).slice(0, 12) : []))
watch(results, () => (selected.value = 0))

watch(current, async (request) => {
  if (!request) return dialog.value?.close()
  query.value = ''
  dialog.value?.showModal()
  await nextTick()
  input.value?.focus()
})

function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') selected.value = Math.min(selected.value + 1, results.value.length - 1)
  else if (event.key === 'ArrowUp') selected.value = Math.max(selected.value - 1, 0)
  else if (event.key === 'Enter') current.value?.resolve(results.value[selected.value] ?? null)
  else return
  event.preventDefault()
}
</script>

<template>
  <dialog ref="dialog" class="dialog link-picker" data-testid="link-picker" @cancel.prevent="current?.resolve(null)">
    <label class="field">
      <span>{{ t('link-search') }}</span>
      <input
        ref="input"
        v-model="query"
        type="search"
        dir="auto"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="link-results"
        :aria-expanded="results.length > 0"
        :aria-activedescendant="results.length > 0 ? `link-result-${selected}` : undefined"
        data-testid="link-search"
        @keydown="onKey"
      />
    </label>
    <ul id="link-results" role="listbox" class="results">
      <li
        v-for="(target, index) in results"
        :id="`link-result-${index}`"
        :key="target.file"
        role="option"
        :aria-selected="index === selected"
        :class="{ selected: index === selected }"
        @click="current?.resolve(target)"
      >
        <span dir="auto">{{ target.title }}</span>
        <span class="secondary">{{ t(`kind-${target.kind}`) }}</span>
      </li>
    </ul>
    <p v-if="query.trim() !== '' && results.length === 0" class="secondary">{{ t('shelf-no-results') }}</p>
    <div class="actions">
      <button type="button" @click="current?.resolve(null)">{{ t('prompt-cancel') }}</button>
    </div>
  </dialog>
</template>
