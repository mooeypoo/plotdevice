<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../../app/editor-store'

defineProps<{ disabled: boolean }>()

const editor = useEditorStore()
const busy = ref(false)

/** The rename waiting for an answer, if it's about the open entry. */
const plan = computed(() => {
  const pending = editor.pendingRename
  return pending !== null && pending.path === editor.entry?.path ? pending.plan : null
})

const question = computed(() => {
  const current = plan.value
  if (current === null) return ''
  const links =
    current.linkCount === 0
      ? ''
      : ` This also updates ${String(current.linkCount)} ${current.linkCount === 1 ? 'link' : 'links'} in ${String(current.fileCount)} ${current.fileCount === 1 ? 'file' : 'files'}.`
  return `Rename the file to “${current.newName}”?${links}`
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
  <div v-if="plan" class="note" role="status">
    <p dir="auto">{{ question }}</p>
    <div class="choices">
      <button type="button" class="primary" :disabled="disabled || busy" @click="accept">
        Rename file
      </button>
      <button type="button" :disabled="disabled || busy" @click="editor.dismissRename()">
        Keep the name
      </button>
    </div>
  </div>
</template>

<style scoped src="./inspector.css"></style>
