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
  padding: 2px 4px 4px 36px;
}

input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}
</style>
