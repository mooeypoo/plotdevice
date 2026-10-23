<script setup lang="ts">
/**
 * A checkbox with its label beside it, for choices in a form or a filter. It stays a native
 * input, drawn with the app's tokens, so keyboards, forms and screen readers treat it as one.
 */
defineProps<{
  modelValue: boolean
  disabled?: boolean
  id?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [checked: boolean] }>()

function change(event: Event): void {
  if (event.target instanceof HTMLInputElement) emit('update:modelValue', event.target.checked)
}
</script>

<template>
  <label class="checkbox-field" :class="{ disabled }">
    <input :id="id" type="checkbox" :checked="modelValue" :disabled="disabled" @change="change" />
    <span class="label"><slot /></span>
  </label>
</template>

<style scoped>
.checkbox-field {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  min-inline-size: 0;
  cursor: pointer;
}

.checkbox-field.disabled {
  cursor: default;
  opacity: 0.55;
}

input {
  flex: none;
  display: inline-grid;
  place-items: center;
  inline-size: 16px;
  block-size: 16px;
  margin: 0;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--bg);
  appearance: none;
  cursor: inherit;
  transition:
    background-color var(--duration-quick) var(--ease-out),
    border-color var(--duration-quick) var(--ease-out);
}

input:hover:not(:disabled) {
  border-color: var(--text-faint);
}

input:checked {
  border-color: var(--accent);
  background: var(--accent);
}

input:checked::after {
  content: '';
  inline-size: 9px;
  block-size: 5px;
  margin-block-end: 2px;
  border-block-end: 2px solid var(--accent-ink);
  border-inline-start: 2px solid var(--accent-ink);
  transform: rotate(-45deg);
}

[dir='rtl'] input:checked::after {
  transform: rotate(45deg);
}

.label {
  min-inline-size: 0;
}
</style>
