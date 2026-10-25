<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useCaptureStore } from '../../app/capture-store'
import { useOutlineStore } from '../../app/outline-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'

const capture = useCaptureStore()
const outlines = useOutlineStore()
const language = useUiLanguageStore()
const input = useTemplateRef<HTMLInputElement>('input')
const text = ref('')

const outlineTitle = computed(
  () => outlines.outlines.find((outline) => outline.path === outlines.currentPath)?.title ?? ''
)

watch(
  () => capture.open,
  async (open) => {
    if (!open) return
    text.value = ''
    await nextTick()
    input.value?.focus()
  }
)

async function keydown(event: KeyboardEvent): Promise<void> {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    capture.close()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    await capture.capture(text.value)
  }
}
</script>

<template>
  <div v-if="capture.open" class="backdrop" @pointerdown.self="capture.close()">
    <div class="box" role="dialog" aria-modal="true" :aria-label="language.t('capture-title')">
      <label for="capture-input">{{ language.t('capture-into', isolate(outlineTitle)) }}</label>
      <input
        id="capture-input"
        ref="input"
        v-model="text"
        type="text"
        dir="auto"
        maxlength="2000"
        :placeholder="language.t('capture-placeholder')"
        :disabled="capture.busy"
        @keydown="keydown"
      />
      <p v-if="capture.error" class="error" role="alert" dir="auto">{{ capture.error }}</p>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  justify-content: center;
  padding-top: 18vh;
  background: var(--scrim);
}

.box {
  animation: rise-in var(--duration-quick) var(--ease-out);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(520px, calc(100vw - 32px));
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-field);
  background: var(--panel);
  box-shadow: var(--shadow-popover);
  align-self: flex-start;
}

label {
  color: var(--text-muted);
  font-size: var(--text-small);
}

input {
  padding-block: var(--space-3);
  padding-inline: var(--space-3);
  font-size: var(--text-title);
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: var(--text-small);
}
</style>
