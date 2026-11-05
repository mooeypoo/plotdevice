<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useConfirm } from '../composables/use-confirm'
import { useSettingsStore } from '../stores/settings'

const { current } = useConfirm()
const settings = useSettingsStore()
const dialog = ref<HTMLDialogElement | null>(null)
const cancel = ref<HTMLButtonElement | null>(null)

watch(current, async (request) => {
  if (!request) return dialog.value?.close()
  dialog.value?.showModal()
  await nextTick()
  cancel.value?.focus() // the safe choice has focus
})
</script>

<template>
  <dialog ref="dialog" class="dialog" data-testid="confirm" @cancel.prevent="current?.resolve(false)">
    <!-- A blank line in the message starts a new paragraph; the first, the question, stands out. -->
    <p
      v-for="(paragraph, index) in current?.message.split('\n\n') ?? []"
      :key="index"
      :class="{ 'confirm-question': index === 0 && current?.instead }"
    >
      {{ paragraph }}
    </p>
    <div class="actions">
      <button ref="cancel" type="button" @click="current?.resolve(false)">{{ settings.t('prompt-cancel') }}</button>
      <button type="button" class="danger" data-testid="confirm-yes" @click="current?.resolve(true)">{{ current?.action }}</button>
      <button v-if="current?.instead" type="button" class="primary" data-testid="confirm-instead" @click="current?.resolve('instead')">
        {{ current.instead }}
      </button>
    </div>
  </dialog>
</template>
