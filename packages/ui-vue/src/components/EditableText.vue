<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/** `nests`: Tab and Shift+Tab move the line in or out a level (a new line in the list). */
const props = defineProps<{ value: string; label: string; nests?: boolean }>()
const emit = defineEmits<{ commit: [text: string | null, byEnter: boolean]; indent: [text: string]; outdent: [text: string] }>()
const text = ref(props.value)
const input = ref<HTMLInputElement | null>(null)
let done = false

/** Enter or leaving the field keeps the text; Escape cancels. Only one of them counts. */
function finish(result: string | null, byEnter = false): void {
  if (done) return
  done = true
  emit('commit', result, byEnter)
}

let unmounted = false
onBeforeUnmount(() => (unmounted = true))

/** The line moves by being redrawn elsewhere; until then, leaving this field must not also add it here. */
async function onTab(event: KeyboardEvent): Promise<void> {
  if (!props.nests || done) return
  event.preventDefault()
  done = true
  if (event.shiftKey) emit('outdent', text.value)
  else emit('indent', text.value)
  await nextTick()
  // Nowhere to move it (the first line can't become a detail): carry on typing here.
  if (!unmounted) done = false
}

// A carried-over draft keeps the cursor at its end; a value being edited is selected to retype.
onMounted(() => (props.nests ? input.value?.focus() : input.value?.select()))
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
    @keydown.enter.prevent="finish(text, true)"
    @keydown.tab="onTab"
    @keydown.esc.prevent="finish(null)"
    @blur="finish(text)"
  />
</template>
