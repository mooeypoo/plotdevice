<script setup lang="ts">
defineProps<{ busy: boolean }>()

defineEmits<{
  loadTheirs: []
  keepMine: []
}>()
</script>

<template>
  <div class="banner" role="alert">
    <div class="text">
      <strong>Changed outside Plot Device.</strong>
      This file was edited in another program after you opened it. Your latest changes aren’t saved
      yet.
    </div>
    <div class="actions">
      <button type="button" :disabled="busy" @click="$emit('loadTheirs')">
        Load the file’s version
      </button>
      <button type="button" class="primary" :disabled="busy" @click="$emit('keepMine')">
        Keep mine
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
}
</style>
