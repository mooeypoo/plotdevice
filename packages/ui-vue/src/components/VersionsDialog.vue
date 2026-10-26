<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useApi } from '../api'
import { useVersions } from '../composables/use-versions'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'

const api = useApi()
const { current, close } = useVersions()
const project = useProjectStore()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const revision = ref('')
const versions = ref<number[]>([])
const selected = ref<number | null>(null)
const preview = ref('')
const busy = ref(false)
const format = computed(() => new Intl.DateTimeFormat(settings.locale, { dateStyle: 'medium', timeStyle: 'short' }))

async function choose(at: number): Promise<void> {
  if (!current.value) return
  selected.value = at
  const read = await api.readVersion(current.value.file, at)
  preview.value = read.ok ? read.value : ''
}

watch(current, async (request) => {
  if (!request) return dialog.value?.close()
  versions.value = []
  selected.value = null
  preview.value = ''
  dialog.value?.showModal()
  const listed = await api.listVersions(request.file)
  if (!listed.ok) return
  revision.value = listed.value.revision
  versions.value = listed.value.versions
  if (listed.value.versions[0] !== undefined) await choose(listed.value.versions[0])
  await nextTick()
  dialog.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
})

async function restore(): Promise<void> {
  if (!current.value || selected.value === null) return
  busy.value = true
  const restored = await api.restoreVersion(current.value.file, selected.value, revision.value)
  busy.value = false
  project.tell(restored.ok ? 'versions-restored' : restored.error === 'stale' ? 'versions-stale' : 'versions-failed')
  close()
}

async function copy(): Promise<void> {
  if (!current.value || selected.value === null) return
  busy.value = true
  const copied = await api.copyVersion(current.value.file, selected.value)
  busy.value = false
  if (copied.ok) project.tell('versions-copied', copied.value.copy)
  else project.tell('versions-failed')
  close()
}

function onKey(event: KeyboardEvent, index: number): void {
  const next = event.key === 'ArrowDown' ? versions.value[index + 1] : event.key === 'ArrowUp' ? versions.value[index - 1] : undefined
  if (next === undefined) return
  event.preventDefault()
  void choose(next).then(() => dialog.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
}
</script>

<template>
  <dialog ref="dialog" class="dialog versions" data-testid="versions" aria-labelledby="versions-title" @cancel.prevent="close">
    <h2 id="versions-title">{{ current ? t('versions-title', current.title) : '' }}</h2>
    <p v-if="versions.length === 0" class="secondary">{{ t('versions-none') }}</p>
    <div v-else class="versions-body">
      <ul role="listbox" :aria-label="t('versions')" class="versions-list">
        <li
          v-for="(at, index) in versions"
          :key="at"
          role="option"
          :tabindex="at === selected ? 0 : -1"
          :aria-selected="at === selected"
          :class="{ selected: at === selected }"
          data-testid="version"
          @click="choose(at)"
          @keydown="onKey($event, index)"
        >
          {{ format.format(at) }}
        </li>
      </ul>
      <pre class="versions-preview" dir="auto" data-testid="version-preview">{{ preview }}</pre>
    </div>
    <p v-if="versions.length > 0" class="secondary">{{ t('versions-restore-detail') }}</p>
    <div class="actions">
      <button type="button" @click="close">{{ t('versions-close') }}</button>
      <button type="button" :disabled="selected === null || busy" data-testid="version-copy" @click="copy">{{ t('versions-copy') }}</button>
      <button type="button" class="primary" :disabled="selected === null || busy" data-testid="version-restore" @click="restore">
        {{ t('versions-restore') }}
      </button>
    </div>
  </dialog>
</template>
