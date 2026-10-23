<script setup lang="ts">
/**
 * An on/off switch with its label, for settings that apply at once. A native checkbox with the
 * switch role underneath, so it reads as "on" or "off" and toggles with Space.
 */
defineProps<{
  modelValue: boolean
  disabled?: boolean
  id?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [on: boolean] }>()

function change(event: Event): void {
  if (event.target instanceof HTMLInputElement) emit('update:modelValue', event.target.checked)
}
</script>

<template>
  <label class="switch-field" :class="{ disabled }">
    <span class="label"><slot /></span>
    <input
      :id="id"
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :disabled="disabled"
      @change="change"
    />
  </label>
</template>

<style scoped>
.switch-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-inline-size: 0;
  cursor: pointer;
}

.switch-field.disabled {
  cursor: default;
  opacity: 0.55;
}

.label {
  min-inline-size: 0;
}

input {
  position: relative;
  flex: none;
  inline-size: 30px;
  block-size: 18px;
  margin: 0;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
  background: var(--active);
  appearance: none;
  cursor: inherit;
  transition:
    background-color var(--duration-quick) var(--ease-out),
    border-color var(--duration-quick) var(--ease-out);
}

input::after {
  content: '';
  position: absolute;
  inset-block-start: 2px;
  inset-inline-start: 2px;
  inline-size: 12px;
  block-size: 12px;
  border-radius: 50%;
  background: var(--text-muted);
  transition:
    inset-inline-start var(--duration-quick) var(--ease-out),
    background-color var(--duration-quick) var(--ease-out);
}

input:checked {
  border-color: var(--accent);
  background: var(--accent);
}

input:checked::after {
  inset-inline-start: 14px;
  background: var(--accent-ink);
}
</style>
