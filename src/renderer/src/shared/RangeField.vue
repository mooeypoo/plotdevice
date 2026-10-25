<script setup lang="ts">
import { computed } from 'vue'

/**
 * A slider drawn with the app's tokens: a track filled up to the value, and a round thumb. A
 * native range underneath, so arrow keys, Home and End step it, mirrored in right-to-left.
 */
const props = defineProps<{
  modelValue: number
  min: number
  max: number
  step?: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const fill = computed(() => {
  const span = props.max - props.min
  return `${String(span <= 0 ? 0 : ((props.modelValue - props.min) / span) * 100)}%`
})

function input(event: Event): void {
  if (event.target instanceof HTMLInputElement)
    emit('update:modelValue', Number(event.target.value))
}
</script>

<template>
  <input
    class="range-field"
    type="range"
    :value="modelValue"
    :min="min"
    :max="max"
    :step="step ?? 1"
    :style="{ '--fill': fill }"
    @input="input"
  />
</template>

<style scoped>
.range-field {
  --track: linear-gradient(
    to var(--toward, right),
    var(--accent) var(--fill),
    var(--line-strong) var(--fill)
  );

  inline-size: 100%;
  block-size: 18px;
  margin: 0;
  background: transparent;
  appearance: none;
  cursor: pointer;
}

[dir='rtl'] .range-field {
  --toward: left;
}

.range-field::-webkit-slider-runnable-track {
  block-size: 4px;
  border-radius: var(--radius-pill);
  background: var(--track);
}

.range-field::-webkit-slider-thumb {
  inline-size: 14px;
  block-size: 14px;
  margin-block-start: -5px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  background: var(--raised);
  appearance: none;
}

.range-field:focus-visible {
  outline-offset: 4px;
}
</style>
