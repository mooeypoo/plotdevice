<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'
import type { LayoutActions } from './use-layout-actions'

/** Asks for a layout's name, or confirms deleting it, after the Layout submenu. */
const props = defineProps<{ actions: LayoutActions }>()

const language = useUiLanguageStore()
const field = useTemplateRef<HTMLInputElement>('field')
const confirm = useTemplateRef<HTMLButtonElement>('confirm')

watch(
  () => props.actions.step.value,
  async (step) => {
    await nextTick()
    if (step === 'delete') confirm.value?.focus()
    else if (step !== null) field.value?.focus()
  }
)
</script>

<template>
  <form
    v-if="actions.step.value === 'save' || actions.step.value === 'rename'"
    class="layout-dialog"
    role="dialog"
    :aria-label="language.t('workbench-layout-name')"
    @submit.prevent="actions.submit()"
    @keydown.esc.stop="actions.cancel()"
  >
    <label>
      {{ language.t('workbench-layout-name') }}
      <input
        ref="field"
        :value="actions.name.value"
        dir="auto"
        :aria-invalid="actions.refusal.value !== null"
        :aria-describedby="actions.refusal.value === null ? undefined : 'layout-name-error'"
        @input="actions.setName(($event.target as HTMLInputElement).value)"
      />
    </label>
    <p v-if="actions.errorMessage.value" id="layout-name-error" class="error" role="alert">
      {{ actions.errorMessage.value }}
    </p>
    <span class="actions">
      <button type="submit" class="primary">{{ language.t('workbench-layout-save') }}</button>
      <button type="button" class="quiet" @click="actions.cancel()">
        {{ language.t('workbench-layout-cancel') }}
      </button>
    </span>
  </form>
  <div
    v-else-if="actions.step.value === 'delete' && actions.saved.value"
    class="layout-dialog"
    role="dialog"
    :aria-label="language.t('workbench-layout-delete')"
    @keydown.esc.stop="actions.cancel()"
  >
    <span class="actions">
      <button ref="confirm" type="button" class="danger" @click="actions.remove()">
        {{ language.t('workbench-layout-delete-confirm', isolate(actions.saved.value.name)) }}
      </button>
      <button type="button" class="quiet" @click="actions.cancel()">
        {{ language.t('workbench-layout-cancel') }}
      </button>
    </span>
  </div>
</template>

<style scoped>
.layout-dialog {
  position: absolute;
  z-index: 10;
  top: 100%;
  inset-inline-end: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-inline-size: 16em;
  padding: var(--space-4);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-card);
  background: var(--raised);
  box-shadow: var(--shadow-popover);
  font-size: var(--text-body);
}

label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.error {
  margin: 0;
  color: var(--danger);
}

/* Deleting removes only an arrangement, never a file, but it still reads as a destructive step. */
button.danger {
  border-color: var(--danger);
  color: var(--danger);
}
</style>
