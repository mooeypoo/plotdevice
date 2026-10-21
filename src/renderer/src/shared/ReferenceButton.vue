<script setup lang="ts">
import { isolate } from './isolate'

defineProps<{ title: string }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button
    type="button"
    class="reference-button"
    :aria-label="`Open ${isolate(title)} in reference`"
    title="Open in reference"
    @click="$emit('open')"
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2"></rect>
      <path d="M14 4v16M17 8h1M17 12h1"></path>
    </svg>
  </button>
</template>

<style scoped>
.reference-button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 24px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
}
.reference-button:hover,
.reference-button:focus-visible {
  color: var(--accent);
  background: var(--hover);
}
</style>
