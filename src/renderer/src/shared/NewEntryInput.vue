<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{ placeholder: string }>()

const emit = defineEmits<{
  create: [title: string]
  cancel: []
}>()

const title = ref('')
const input = ref<HTMLInputElement | null>(null)

onMounted(() => {
  input.value?.focus()
})

function create(): void {
  emit('create', title.value)
}
</script>

<template>
  <form class="new-entry" @submit.prevent="create">
    <input
      ref="input"
      v-model="title"
      type="text"
      :placeholder="placeholder"
      :aria-label="placeholder"
      maxlength="500"
      dir="auto"
      @keydown.escape.prevent="emit('cancel')"
      @blur="title.trim() === '' ? emit('cancel') : create()"
    />
  </form>
</template>

<style scoped>
.new-entry {
  padding: var(--space-1) var(--space-2) var(--space-2) var(--space-7);
}

input {
  width: 100%;
  padding: var(--space-3) var(--space-3);
  border: 1px solid var(--accent);
  border-radius: var(--radius-field);
  background: var(--bg);
  color: var(--text);
  font: inherit;
}
</style>
