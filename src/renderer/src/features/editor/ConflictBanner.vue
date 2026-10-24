<script setup lang="ts">
import { useUiLanguageStore } from '../../app/ui-language-store'

const language = useUiLanguageStore()
defineProps<{
  busy: boolean
  readOnly: boolean
  error: string | null
  recoveredPath: string | null
}>()

defineEmits<{
  loadTheirs: []
  keepMine: []
  recoverCopy: []
}>()
</script>

<template>
  <div class="banner" role="alert" :aria-busy="busy">
    <div class="text">
      <strong>{{ language.t('recovery-conflict-heading') }}</strong>
      {{ language.t('recovery-conflict-description') }}
      <p v-if="error" class="error" role="status">{{ error }}</p>
      <p v-if="recoveredPath" class="copy-path">
        {{ language.t('recovery-copy-label') }} <bdi>{{ recoveredPath }}</bdi>
      </p>
    </div>
    <div class="actions">
      <button type="button" :disabled="busy" @click="$emit('loadTheirs')">
        {{ language.t('recovery-use-disk') }}
      </button>
      <button
        type="button"
        class="primary"
        :disabled="busy || readOnly"
        @click="$emit('recoverCopy')"
      >
        {{ language.t('recovery-save-copy') }}
      </button>
      <button type="button" :disabled="busy || readOnly" @click="$emit('keepMine')">
        {{ language.t('recovery-replace-disk') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  max-width: calc(var(--measure) + 48px);
  margin: 0 auto 28px;
  padding: 14px 18px;
  border: 1px solid var(--warning-line);
  border-radius: 10px;
  background: var(--accent-soft);
  line-height: 1.5;
}

.text {
  flex: 1 1 320px;
  color: var(--text);
}

strong {
  color: var(--text-strong);
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error {
  color: var(--danger);
  margin: 8px 0 0;
}

.copy-path {
  margin: 8px 0 0;
}
</style>
