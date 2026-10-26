<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'

const props = defineProps<{ chapterName: string; busy: boolean }>()
const emit = defineEmits<{ choose: [choice: 'keep-both' | 'use-mine'] }>()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)

onMounted(() => dialog.value?.showModal())
</script>

<template>
  <!-- No way to dismiss it: saving is paused until the author chooses, so nothing is lost meanwhile. -->
  <dialog ref="dialog" class="dialog conflict" data-testid="conflict-dialog" aria-labelledby="conflict-title" @cancel.prevent>
    <h2 id="conflict-title">{{ t('conflict-title') }}</h2>
    <p>{{ t('conflict-body', props.chapterName) }}</p>
    <div class="choice">
      <button type="button" class="primary" :disabled="props.busy" data-testid="conflict-keep-both" @click="emit('choose', 'keep-both')">
        {{ t('conflict-keep-both') }}
      </button>
      <p class="secondary">{{ t('conflict-keep-both-detail') }}</p>
    </div>
    <div class="choice">
      <button type="button" class="danger" :disabled="props.busy" data-testid="conflict-use-mine" @click="emit('choose', 'use-mine')">
        {{ t('conflict-use-mine') }}
      </button>
      <p class="warning">{{ t('conflict-use-mine-detail') }}</p>
    </div>
  </dialog>
</template>
