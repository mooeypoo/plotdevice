<script setup lang="ts">
import { computed } from 'vue'
import { documentationFor } from '../links'
import { useSettingsStore } from '../stores/settings'

// A small "?" beside something that needs explaining (Milestone 20): the guide's page about it, in the
// interface's language. `page` is the guide's path, such as "planning/kinds".
const props = defineProps<{ page: string; label: string }>()
const settings = useSettingsStore()
const href = computed(() => `${documentationFor(settings.locale)}${props.page}/`)
</script>

<template>
  <a
    class="help-link"
    :href="href"
    target="_blank"
    rel="noreferrer"
    :aria-label="settings.t('help-about', label)"
    :title="settings.t('help-about', label)"
    :data-help="page"
    >?</a
  >
</template>
