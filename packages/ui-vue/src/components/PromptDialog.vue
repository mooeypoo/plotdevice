<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { usePrompt } from '../composables/use-prompt'
import { useSettingsStore } from '../stores/settings'

const { current } = usePrompt()
const settings = useSettingsStore()
const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const value = ref('')
const choice = ref('')

watch(current, async (request) => {
  if (!request) return dialog.value?.close()
  value.value = request.value
  choice.value = request.choices?.options[0]?.value ?? ''
  dialog.value?.showModal()
  await nextTick()
  input.value?.select()
})

// Choosing a way to start names the text after it, until the author types a name of their own.
watch(choice, (now, before) => {
  const options = current.value?.choices?.options ?? []
  // The first way to start is the plain one ("Empty"), which suggests no name.
  const nameOf = (option: string): string => {
    const at = options.findIndex((o) => o.value === option)
    return at > 0 ? (options[at]?.label ?? '') : ''
  }
  if (value.value === '' || value.value === nameOf(before)) value.value = nameOf(now)
})

const answer = (text: string | null): void =>
  current.value?.resolve(text === null || text.trim() === '' ? null : text.trim(), current.value.choices ? choice.value : undefined)
</script>

<template>
  <dialog ref="dialog" class="dialog" data-testid="prompt" @cancel.prevent="answer(null)">
    <form method="dialog" @submit.prevent="answer(value)">
      <label class="field">
        <span>{{ current?.label }}</span>
        <input ref="input" v-model="value" type="text" dir="auto" data-testid="prompt-input" />
      </label>
      <fieldset v-if="current?.choices" class="prompt-choices">
        <legend>{{ current.choices.label }}</legend>
        <label
          v-for="option in current.choices.options"
          :key="option.value"
          class="prompt-choice"
          :data-testid="`prompt-choice-${option.value}`"
        >
          <input v-model="choice" type="radio" name="prompt-choice" :value="option.value" />
          {{ option.label }}
        </label>
      </fieldset>
      <div class="actions">
        <button type="button" @click="answer(null)">{{ settings.t('prompt-cancel') }}</button>
        <button type="submit" class="primary">{{ settings.t('prompt-ok') }}</button>
      </div>
    </form>
  </dialog>
</template>
