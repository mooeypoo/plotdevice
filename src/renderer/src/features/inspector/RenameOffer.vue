<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../../app/editor-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'
import { useChromePresentation } from '../../shared/use-chrome-presentation'

defineProps<{ disabled: boolean }>()

const editor = useEditorStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const busy = ref(false)

/** The rename waiting for an answer, if it's about the open entry. */
const plan = computed(() => {
  const pending = editor.pendingRename
  return pending !== null && pending.path === editor.entry?.path ? pending.plan : null
})

const question = computed(() => {
  const current = plan.value
  if (current === null) return ''
  if (current.linkCount === 0) {
    return language.t('rename-offer-no-links', isolate(current.newName))
  }
  return language.t(
    'rename-offer-with-links',
    isolate(current.newName),
    current.linkCount,
    chrome.formatNumber(current.linkCount),
    current.fileCount,
    chrome.formatNumber(current.fileCount)
  )
})

async function accept(): Promise<void> {
  const path = editor.pendingRename?.path
  if (path === undefined) return
  busy.value = true
  try {
    await editor.renameEntry(path)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="plan" class="notice" role="status">
    <p dir="auto">{{ question }}</p>
    <div class="choices">
      <button type="button" class="primary" :disabled="disabled || busy" @click="accept">
        {{ language.t('rename-offer-rename') }}
      </button>
      <button type="button" :disabled="disabled || busy" @click="editor.dismissRename()">
        {{ language.t('rename-offer-keep') }}
      </button>
    </div>
  </div>
</template>

<style scoped src="./inspector.css"></style>
