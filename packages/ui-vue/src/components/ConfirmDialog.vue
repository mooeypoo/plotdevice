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
    <p>{{ current?.message }}</p>
    <div class="actions">
      <button ref="cancel" type="button" @click="current?.resolve(false)">{{ settings.t('prompt-cancel') }}</button>
      <button type="button" class="danger" data-testid="confirm-yes" @click="current?.resolve(true)">{{ current?.action }}</button>
    </div>
  </dialog>
</template>
