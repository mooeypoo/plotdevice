<script setup lang="ts">
defineProps<{ kind: string; busy: boolean }>()

defineEmits<{
  saveAsNew: []
  discard: []
}>()
</script>

<template>
  <div class="banner" role="alert">
    <div class="text">
      <strong>This file is gone.</strong>
      Another program moved or deleted it. Your text is still here, but it isn’t being saved. Saving
      it as a new {{ kind }} keeps the text and the title; other properties went with the file.
    </div>
    <div class="actions">
      <button type="button" :disabled="busy" @click="$emit('discard')">Discard</button>
      <button type="button" class="primary" :disabled="busy" @click="$emit('saveAsNew')">
        Save as a new {{ kind }}
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
}
</style>
