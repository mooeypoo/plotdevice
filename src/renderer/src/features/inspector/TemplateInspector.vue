<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../app/editor-store'

const editor = useEditorStore()
const kind = computed(() => editor.entry?.templateOf ?? 'note')
</script>

<template>
  <aside class="inspector" aria-label="Inspector">
    <header>
      <span class="eyebrow">Template</span>
    </header>
    <div class="note">
      <p>
        Every new {{ kind }} starts as a copy of this file. Change its headings, add prompts, or
        remove everything; entries you already have don’t change.
      </p>
      <p>
        To start new entries with properties too, add frontmatter here, for example
        <code>role:</code> on its own line. Plot Device sets <code>type</code> and
        <code>title</code> itself.
      </p>
    </div>
    <p class="hint">Saved to {{ editor.entry?.path }}</p>
  </aside>
</template>

<style scoped src="./inspector.css"></style>
<style scoped>
.hint {
  color: var(--text-muted);
}

code {
  font-size: 12px;
}
</style>
