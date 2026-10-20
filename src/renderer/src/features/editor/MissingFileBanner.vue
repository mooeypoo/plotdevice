<script setup lang="ts">
defineProps<{
  kind: string
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
      <strong>This file is gone.</strong>
      Another program may have intentionally moved or deleted this {{ kind }}. Your draft is still
      here, and autosave is paused. Keep it deleted and close this draft, or save a separate
      recovered copy with the last captured metadata. Neither action recreates the original path or
      changes its links.
      <p v-if="reappeared">
        The original path is readable again. You can use its current disk version; your draft will
        not overwrite it automatically.
      </p>
      <p v-if="error" class="error" role="status">{{ error }}</p>
      <p v-if="recoveredPath">
        Recovered copy: <bdi>{{ recoveredPath }}</bdi>
      </p>
    </div>
    <div class="actions">
      <button type="button" :disabled="busy" @click="$emit('discard')">
        {{ reappeared ? 'Close draft / leave disk unchanged' : 'Keep deleted / close draft' }}
      </button>
      <button v-if="reappeared" type="button" :disabled="busy" @click="$emit('loadTheirs')">
        Use disk version
      </button>
      <button
        type="button"
        class="primary"
        :disabled="busy || readOnly"
        @click="$emit('saveAsNew')"
      >
        Save recovered copy
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
  border: 1px solid rgba(227, 155, 123, 0.35);
  border-radius: 10px;
  background: rgba(227, 155, 123, 0.12);
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
