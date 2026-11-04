<script setup lang="ts">
import type { FolderRenamePlanView } from '@plotdevice/contracts'
import { computed, ref, watch } from 'vue'
import { useApi } from '../api'
import { useKinds } from '../composables/use-kinds'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'

// "Match folder names" (Milestone 18, ADR 0011 decision 7): each renamed kind's folder takes its new
// name, with every link to its pages. First what will change, then a backup, then the rename; the book
// menu offers to undo it until the book closes.
const api = useApi()
const project = useProjectStore()
const story = useStoryStore()
const view = useViewStore()
const kinds = useKinds()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)

const plan = ref<FolderRenamePlanView | null>(null)
const backup = ref<{ path: string } | 'failed' | null>(null)
const haveBackup = ref(false)
const working = ref(false)

/** Only folders with pages: an empty kind's folder has nothing to move. */
const wanted = computed(() =>
  (project.project?.folderMismatches ?? []).filter(({ from }) => story.references.some((page) => page.kind === from)),
)
const ready = computed(() => plan.value?.renames.filter((rename) => rename.blocked === null) ?? [])
const backedUp = computed(() => haveBackup.value || (backup.value !== null && backup.value !== 'failed'))

watch(
  () => view.matchFolders,
  async (open) => {
    if (!open) return dialog.value?.close()
    plan.value = null
    backup.value = null
    haveBackup.value = false
    dialog.value?.showModal()
    // A plain copy: reactive arrays can't cross to the host.
    const planned = await api.planFolderRenames(wanted.value.map(({ from, to }) => ({ from, to })))
    plan.value = planned.ok ? planned.value : null
  },
)

async function makeBackup(): Promise<void> {
  working.value = true
  const made = await api.backupBook()
  working.value = false
  if (made.ok) backup.value = made.value
  else if (made.error !== 'cancelled') backup.value = 'failed'
}

async function rename(): Promise<void> {
  const renames = ready.value.map(({ from, to }) => ({ from, to }))
  working.value = true
  const renamed = await project.renameFolders(renames)
  if (renamed) await story.followFolders(renames)
  working.value = false
  close()
}

function close(): void {
  view.matchFolders = false
}
</script>

<template>
  <dialog ref="dialog" class="dialog match-folders" data-testid="match-folders-dialog" :aria-label="t('match-title')" @close="close">
    <h2>{{ t('match-title') }}</h2>
    <p class="secondary">{{ t('match-hint') }}</p>

    <template v-if="plan">
      <ul class="kinds-list">
        <li v-for="rename in plan.renames" :key="rename.from" class="kind-row match-row" :data-rename="rename.from">
          <span class="kind-names">
            <span class="kind-many" dir="auto">{{ kinds.labels(rename.from).many }}</span>
            <span class="secondary kind-folder" dir="ltr">
              <bdi>{{ rename.from }}/</bdi>
              <template v-if="rename.blocked === null">
                → <bdi>{{ rename.to }}/</bdi></template
              >
            </span>
            <span v-if="rename.blocked" class="warning">{{ t(`match-blocked-${rename.blocked}`) }}</span>
          </span>
          <span class="secondary">{{ t('gallery-pages', rename.files) }}</span>
        </li>
      </ul>
      <p class="secondary" data-testid="match-links">
        {{ plan.linksUpdated > 0 ? t('match-links', plan.linksUpdated, plan.filesChanged.length) : t('match-no-links') }}
      </p>

      <section v-if="ready.length > 0" class="match-backup">
        <h3 class="group-label">{{ t('match-backup-title') }}</h3>
        <p class="secondary">{{ t('match-backup-hint') }}</p>
        <button type="button" :disabled="working" data-testid="backup-now" @click="makeBackup">{{ t('match-backup-now') }}</button>
        <p v-if="backup === 'failed'" class="warning" role="alert">{{ t('match-backup-failed') }}</p>
        <p v-else-if="backup" class="secondary" data-testid="backup-made">
          {{ t('match-backup-made') }} <span dir="ltr">{{ backup.path }}</span>
        </p>
        <label class="check">
          <input v-model="haveBackup" type="checkbox" data-testid="have-backup" />
          {{ t('match-have-backup') }}
        </label>
      </section>
      <p v-else class="warning">{{ t('match-nothing') }}</p>
    </template>

    <div class="actions">
      <button type="button" @click="close">{{ t('prompt-cancel') }}</button>
      <button
        v-if="ready.length > 0"
        type="button"
        class="primary"
        :disabled="!backedUp || working"
        data-testid="rename-folders"
        @click="rename"
      >
        {{ t('match-rename') }}
      </button>
    </div>
  </dialog>
</template>
