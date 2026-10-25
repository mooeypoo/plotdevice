<script setup lang="ts">
import type { Workspace } from '@plotdevice/contracts'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'

const settings = useSettingsStore()
const view = useViewStore()
// The names come only from the catalogs (`workspace-story`, `workspace-write`): the Story label is a working name.
const workspaces: Workspace[] = ['story', 'write']
</script>

<template>
  <div class="workspace-switch" role="group" :aria-label="settings.t('workspace-switch')">
    <button
      v-for="workspace in workspaces"
      :key="workspace"
      type="button"
      :aria-pressed="view.workspace === workspace"
      :data-testid="`workspace-${workspace}`"
      @click="view.workspace = workspace"
    >
      {{ settings.t(`workspace-${workspace}`) }}
    </button>
  </div>
</template>
