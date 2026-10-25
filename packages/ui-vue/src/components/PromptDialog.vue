<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { usePrompt } from '../composables/use-prompt'
import { useSettingsStore } from '../stores/settings'

const { current } = usePrompt()
const settings = useSettingsStore()
const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const value = ref('')

watch(current, async (request) => {
  if (!request) return dialog.value?.close()
  value.value = request.value
  dialog.value?.showModal()
  await nextTick()
  input.value?.select()
})

const answer = (text: string | null): void => current.value?.resolve(text === null || text.trim() === '' ? null : text.trim())
</script>

<template>
  <dialog ref="dialog" class="dialog" data-testid="prompt" @cancel.prevent="answer(null)">
    <form method="dialog" @submit.prevent="answer(value)">
      <label class="field">
        <span>{{ current?.label }}</span>
        <input ref="input" v-model="value" type="text" dir="auto" data-testid="prompt-input" />
      </label>
      <div class="actions">
        <button type="button" @click="answer(null)">{{ settings.t('prompt-cancel') }}</button>
        <button type="submit" class="primary">{{ settings.t('prompt-ok') }}</button>
      </div>
    </form>
  </dialog>
</template>
