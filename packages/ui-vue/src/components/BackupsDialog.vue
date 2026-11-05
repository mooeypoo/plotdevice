<script setup lang="ts">
import type { CleanupRuleView } from '@plotdevice/contracts'
import { computed, ref, watch } from 'vue'
import { useApi } from '../api'
import { useBackupsStore } from '../stores/backups'
import { useSettingsStore } from '../stores/settings'
import HelpLink from './HelpLink.vue'

// "Backups…" in the book menu (Milestone 20): where this book's backups go, what that means, the last
// one, and a clean-up the author can turn on. Nothing is ever deleted unless they do.
const api = useApi()
const backups = useBackupsStore()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const months = ref(6)
const count = ref(30)
const cleanup = ref<'none' | 'older-than' | 'keep-newest'>('none')

const status = computed(() => backups.status)
/** The sync folders found, and the last folder chosen for another book, without the one in use. */
const suggestions = computed(() => {
  const found = status.value?.syncFolders ?? []
  const last = status.value?.suggestedFolder
  const all = last && !found.some((f) => f.path === last) ? [...found, { name: last, path: last }] : found
  return all.filter((folder) => folder.path !== status.value?.folder)
})
const lastBackup = computed(() =>
  status.value?.lastAt
    ? new Intl.DateTimeFormat(settings.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(status.value.lastAt)
    : null,
)

watch(
  () => backups.dialog,
  async (open) => {
    if (!open) return dialog.value?.close()
    await backups.refresh()
    const rule = backups.status?.cleanup ?? null
    cleanup.value = rule?.kind ?? 'none'
    if (rule?.kind === 'older-than') months.value = rule.months
    if (rule?.kind === 'keep-newest') count.value = rule.count
    dialog.value?.showModal()
  },
)

function saveCleanup(): void {
  const rule: CleanupRuleView =
    cleanup.value === 'older-than'
      ? { kind: 'older-than', months: Math.max(1, Math.round(months.value)) }
      : cleanup.value === 'keep-newest'
        ? { kind: 'keep-newest', count: Math.max(1, Math.round(count.value)) }
        : null
  void backups.setCleanup(rule)
}

function close(): void {
  backups.dialog = false
}
</script>

<template>
  <dialog ref="dialog" class="dialog backups-dialog" data-testid="backups-dialog" aria-labelledby="backups-title" @close="close">
    <h2 id="backups-title">{{ t('backups-title') }} <HelpLink page="safe/backups" :label="t('backups-title')" /></h2>
    <p class="secondary">{{ t('backups-what') }}</p>

    <section class="backups-where">
      <h3 class="group-label">{{ t('backups-where') }}</h3>
      <template v-if="status?.folder">
        <p class="backup-folder" data-testid="backup-folder">
          <bdi dir="ltr">{{ status.folder }}</bdi>
        </p>
        <div class="actions start">
          <button type="button" data-testid="open-backup-folder" @click="api.openBackupFolder()">{{ t('backups-open-folder') }}</button>
          <button type="button" data-testid="backups-off" @click="backups.setFolder(null)">{{ t('backups-turn-off') }}</button>
        </div>
      </template>
      <p v-else class="secondary" data-testid="backups-off-note">{{ t('backups-none') }}</p>
      <p class="secondary">{{ t('backups-sync-hint') }}</p>
      <div class="actions start backup-choices">
        <button
          v-for="folder in suggestions"
          :key="folder.path"
          type="button"
          :title="folder.path"
          :data-testid="`backup-to-${folder.name}`"
          @click="backups.setFolder(folder.path)"
        >
          {{ folder.name === folder.path ? t('backups-use-folder', folder.path) : folder.name }}
        </button>
        <button type="button" data-testid="choose-backup-folder" @click="backups.choose()">
          {{ status?.folder ? t('backups-choose-other') : t('backups-choose') }}
        </button>
      </div>
      <p class="secondary backups-never-deleted">{{ t('backups-never-deleted') }}</p>
    </section>

    <template v-if="status?.folder">
      <section>
        <h3 class="group-label">{{ t('backups-last-title') }}</h3>
        <p v-if="status.problem" class="warning" role="alert">{{ t(`backup-problem-${status.problem}`, '') }}</p>
        <p class="secondary" data-testid="last-backup">{{ lastBackup ? t('backups-last', lastBackup) : t('backups-not-yet') }}</p>
        <button type="button" data-testid="back-up-now" @click="backups.backUpNow()">{{ t('backups-now') }}</button>
      </section>

      <fieldset class="backups-cleanup" @change="saveCleanup">
        <legend class="group-label">{{ t('backups-cleanup') }}</legend>
        <label class="check">
          <input v-model="cleanup" type="radio" value="none" data-testid="cleanup-none" />
          {{ t('backups-cleanup-none') }}
        </label>
        <label class="check">
          <input v-model="cleanup" type="radio" value="older-than" data-testid="cleanup-older" />
          {{ t('backups-cleanup-older-before') }}
          <input v-model.number="months" type="number" min="1" max="120" class="number" :aria-label="t('backups-cleanup-months')" />
          {{ t('backups-cleanup-older-after') }}
        </label>
        <label class="check">
          <input v-model="cleanup" type="radio" value="keep-newest" data-testid="cleanup-newest" />
          {{ t('backups-cleanup-newest-before') }}
          <input v-model.number="count" type="number" min="1" max="10000" class="number" :aria-label="t('backups-cleanup-count')" />
          {{ t('backups-cleanup-newest-after') }}
        </label>
        <p class="secondary">{{ t('backups-cleanup-hint') }}</p>
      </fieldset>
    </template>

    <div class="actions">
      <button type="button" class="primary" data-testid="backups-close" @click="close">{{ t('versions-close') }}</button>
    </div>
  </dialog>
</template>
