<script setup lang="ts">
import type { EntryKind } from '../../app/entry-place'
import { useUiLanguageStore } from '../../app/ui-language-store'

const language = useUiLanguageStore()
const KIND_KEYS = {
  part: 'recovery-kind-part',
  chapter: 'recovery-kind-chapter',
  character: 'recovery-kind-character',
  location: 'recovery-kind-location',
  note: 'recovery-kind-note',
  template: 'recovery-kind-template',
  outline: 'recovery-kind-outline'
} as const

defineProps<{
  kind: EntryKind
  busy: boolean
  readOnly: boolean
  reappeared: boolean
  error: string | null
  recoveredPath: string | null
}>()

defineEmits<{
  saveAsNew: []
  discard: []
  loadTheirs: []
}>()
</script>

<template>
  <div class="banner" role="alert" :aria-busy="busy">
    <div class="text">
      <strong>{{ language.t('recovery-missing-heading') }}</strong>
      {{ language.t('recovery-missing-description', language.t(KIND_KEYS[kind])) }}
      <p v-if="reappeared">
        {{ language.t('recovery-reappeared') }}
      </p>
      <p v-if="error" class="error" role="status">{{ error }}</p>
      <p v-if="recoveredPath">
        {{ language.t('recovery-copy-label') }} <bdi>{{ recoveredPath }}</bdi>
      </p>
    </div>
    <div class="actions">
      <button type="button" :disabled="busy" @click="$emit('discard')">
        {{ language.t(reappeared ? 'recovery-close-leave-disk' : 'recovery-keep-deleted') }}
      </button>
      <button v-if="reappeared" type="button" :disabled="busy" @click="$emit('loadTheirs')">
        {{ language.t('recovery-use-disk') }}
      </button>
      <button
        type="button"
        class="primary"
        :disabled="busy || readOnly"
        @click="$emit('saveAsNew')"
      >
        {{ language.t('recovery-save-copy') }}
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
  border: 1px solid var(--danger-line);
  border-radius: 10px;
  background: var(--danger-soft);
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
}
</style>
