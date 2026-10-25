<script setup lang="ts">
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useEditorStore } from '../../app/editor-store'
import { isolate } from '../../shared/isolate'

const editor = useEditorStore()
const language = useUiLanguageStore()
</script>

<template>
  <aside class="inspector" :aria-label="language.t('chrome-inspector')">
    <header>
      <span class="eyebrow">{{ language.t('entry-place-outline') }}</span>
    </header>
    <div class="notice">
      <p>{{ language.t('outline-inspector-description') }}</p>
      <p>
        {{ language.t('outline-inspector-while-writing', isolate('Ctrl+Shift+O')) }}
      </p>
    </div>
    <p class="hint">
      {{ language.t('inspector-saved-to', isolate(editor.entry?.path ?? '')) }}
    </p>
  </aside>
</template>

<style scoped src="./inspector.css"></style>
<style scoped>
.hint {
  color: var(--text-muted);
}
</style>
