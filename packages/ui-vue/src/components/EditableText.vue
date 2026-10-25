<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{ value: string; label: string }>()
const emit = defineEmits<{ commit: [text: string | null] }>()
const text = ref(props.value)
const input = ref<HTMLInputElement | null>(null)
let done = false

/** Enter or leaving the field keeps the text; Escape cancels. Only one of them counts. */
function finish(result: string | null): void {
  if (done) return
  done = true
  emit('commit', result)
}

onMounted(() => input.value?.select())
</script>

<template>
  <input
    ref="input"
    v-model="text"
    class="editable-text"
    type="text"
    dir="auto"
    :aria-label="props.label"
    data-testid="editable-text"
    @keydown.enter.prevent="finish(text)"
    @keydown.esc.prevent="finish(null)"
    @blur="finish(text)"
  />
</template>
