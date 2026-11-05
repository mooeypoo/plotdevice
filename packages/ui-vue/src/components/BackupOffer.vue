<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useApi } from '../api'
import { useBackupsStore } from '../stores/backups'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'

// The one-time offer (Milestone 20), when the author leaves a book that has some content: keep its
// backups in a folder they choose, or not now. It says where to turn backups on later.
const api = useApi()
const backups = useBackupsStore()
const project = useProjectStore()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const found = computed(() => backups.status?.syncFolders ?? [])

watch(
  () => backups.offer,
  (offer) => (offer ? dialog.value?.showModal() : dialog.value?.close()),
)

async function choose(): Promise<void> {
  const folder = await api.chooseBackupFolder()
  if (folder) await backups.answer(folder)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog backup-offer"
    data-testid="backup-offer"
    aria-labelledby="backup-offer-title"
    @cancel.prevent="backups.answer(null)"
  >
    <h2 id="backup-offer-title">{{ t('backup-offer-title', project.project?.title ?? '') }}</h2>
    <p>{{ t('backup-offer-text') }}</p>
    <p class="secondary">{{ t('backups-sync-hint') }}</p>
    <div class="actions start">
      <button
        v-for="folder in found"
        :key="folder.path"
        type="button"
        :title="folder.path"
        :data-testid="`offer-to-${folder.name}`"
        @click="backups.answer(folder.path)"
      >
        {{ folder.name }}
      </button>
      <button type="button" class="primary" data-testid="offer-choose" @click="choose">{{ t('backups-choose') }}</button>
      <button type="button" data-testid="offer-not-now" @click="backups.answer(null)">{{ t('backup-offer-not-now') }}</button>
    </div>
    <p class="secondary">{{ t('backup-offer-later') }}</p>
  </dialog>
</template>
