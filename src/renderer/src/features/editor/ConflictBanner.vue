<script setup lang="ts">
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
      <strong>Changed outside Plot Device.</strong>
      Both the file and your draft have changes. Autosave is paused. Choose which text to keep;
      nothing on disk will be replaced unless you explicitly confirm it. A recovered copy keeps your
      draft with its last captured metadata, without changing the original or its links.
      <p v-if="error" class="error" role="status">{{ error }}</p>
      <p v-if="recoveredPath" class="copy-path">
        Recovered copy: <bdi>{{ recoveredPath }}</bdi>
      </p>
    </div>
    <div class="actions">
      <button type="button" :disabled="busy" @click="$emit('loadTheirs')">Use disk version</button>
      <button
        type="button"
        class="primary"
        :disabled="busy || readOnly"
        @click="$emit('recoverCopy')"
      >
        Save recovered copy
      </button>
      <button type="button" :disabled="busy || readOnly" @click="$emit('keepMine')">
        Replace disk text…
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
  border: 1px solid rgba(216, 178, 110, 0.35);
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
