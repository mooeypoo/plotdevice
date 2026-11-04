<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'

// Above an editor showing plain text (ADR 0010): what it is, and the way back.
const emit = defineEmits<{ back: [] }>()
const t = useSettingsStore().t
</script>

<template>
  <p class="plain-text-banner" role="status" data-testid="plain-text-banner">
    <span>{{ t('plain-text-banner') }}</span>
    <button type="button" class="link-button" data-testid="plain-text-back" @click="emit('back')">{{ t('plain-text-back') }}</button>
  </p>
</template>
