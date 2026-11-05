<script setup lang="ts">
import type { BackupEntryView, RestorePreviewView } from '@plotdevice/contracts'
import { computed, ref, watch } from 'vue'
import { useApi } from '../api'
import { useConfirm } from '../composables/use-confirm'
import { useBackupsStore } from '../stores/backups'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'

// "Restore from a backup…" (Milestone 20): choose a backup, see what's different, then open it as a
// book of its own (the book isn't touched) or replace the book with it (after saving the book as it
// is now as a backup too, so nothing is lost either way).
const api = useApi()
const backups = useBackupsStore()
const project = useProjectStore()
const settings = useSettingsStore()
const { confirm } = useConfirm()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const entries = ref<BackupEntryView[] | 'no-folder' | 'missing-folder' | null>(null)
const chosen = ref<BackupEntryView | null>(null)
const preview = ref<RestorePreviewView | null>(null)
const working = ref(false)

const when = (at: number): string => new Intl.DateTimeFormat(settings.locale, { dateStyle: 'full', timeStyle: 'short' }).format(at)
const list = computed(() => (Array.isArray(entries.value) ? entries.value : []))

watch(
  () => backups.restoring,
  async (open) => {
    if (!open) return dialog.value?.close()
    entries.value = null
    chosen.value = null
    preview.value = null
    dialog.value?.showModal()
    const result = await api.listBackups()
    entries.value = result.ok ? result.value : result.error === 'no-project' ? null : result.error
  },
)

async function pick(entry: BackupEntryView): Promise<void> {
  chosen.value = entry
  preview.value = null
  const result = await api.previewBackup(entry.file)
  preview.value = result.ok ? result.value : null
}

async function asCopy(): Promise<void> {
  if (!chosen.value) return
  working.value = true
  const copy = await api.restoreBackupAsCopy(chosen.value.file)
  working.value = false
  if (!copy.ok) return project.tell('restore-failed')
  close()
  const root = copy.value.root
  project.offer('restored-as-copy', [root], { key: 'restored-open', run: () => void project.open({ recent: root }) })
}

async function replace(): Promise<void> {
  const entry = chosen.value
  if (!entry) return
  const title = project.project?.title ?? ''
  if (!(await confirm(t('restore-replace-warning', title, when(entry.at)), t('restore-replace')))) return
  working.value = true
  const replaced = await api.restoreBackupReplace(entry.file)
  working.value = false
  if (!replaced.ok) return project.tell('restore-failed')
  project.setProject(replaced.value.project)
  close()
  project.tell('restored-replaced', when(entry.at))
}

function close(): void {
  backups.restoring = false
}
</script>

<template>
  <dialog ref="dialog" class="dialog restore-dialog" data-testid="restore-dialog" aria-labelledby="restore-title" @close="close">
    <h2 id="restore-title">{{ t('restore-title') }}</h2>
    <p v-if="entries === 'no-folder'" class="secondary">{{ t('restore-no-folder') }}</p>
    <p v-else-if="entries === 'missing-folder'" class="warning" role="alert">
      {{ t('backup-problem-missing-folder', project.project?.title ?? '') }}
    </p>
    <p v-else-if="entries !== null && list.length === 0" class="secondary">{{ t('restore-none') }}</p>
    <ul v-else class="restore-list" :aria-label="t('restore-title')">
      <li v-for="entry in list" :key="entry.file">
        <button
          type="button"
          class="restore-entry"
          :aria-pressed="chosen?.file === entry.file"
          data-testid="restore-entry"
          @click="pick(entry)"
        >
          <span>{{ when(entry.at) }}</span>
          <span class="secondary" dir="auto">{{ entry.name }}</span>
        </button>
      </li>
    </ul>

    <section v-if="chosen" class="restore-preview" data-testid="restore-preview" aria-live="polite">
      <template v-if="preview">
        <p v-if="preview.changed.length + preview.returning.length === 0">{{ t('restore-same') }}</p>
        <ul v-else class="restore-changes">
          <li v-if="preview.changed.length > 0">{{ t('restore-changed', preview.changed.length) }}</li>
          <li v-if="preview.returning.length > 0">{{ t('restore-returning', preview.returning.length) }}</li>
        </ul>
        <p v-if="preview.newer.length > 0" class="secondary">{{ t('restore-newer', preview.newer.length) }}</p>
      </template>
    </section>

    <div class="actions">
      <button type="button" @click="close">{{ t('prompt-cancel') }}</button>
      <button type="button" :disabled="!chosen || working" data-testid="restore-copy" @click="asCopy">{{ t('restore-copy') }}</button>
      <button type="button" class="primary" :disabled="!chosen || working" data-testid="restore-replace" @click="replace">
        {{ t('restore-replace-ellipsis') }}
      </button>
    </div>
  </dialog>
</template>
