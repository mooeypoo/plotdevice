<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../app/editor-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'

const editor = useEditorStore()
const language = useUiLanguageStore()
const kindKeys = {
  character: 'entry-place-character',
  location: 'entry-place-location',
  note: 'entry-place-note'
} as const
const kind = computed(() => language.t(kindKeys[editor.entry?.templateOf ?? 'note']))
</script>

<template>
  <aside class="inspector" :aria-label="language.t('chrome-inspector')">
    <header>
      <span class="eyebrow">{{ language.t('entry-place-template') }}</span>
    </header>
    <div class="notice">
      <p>
        {{ language.t('template-inspector-description', kind) }}
      </p>
      <p>
        {{ language.t('template-inspector-frontmatter-prefix') }}
        <code>role:</code>
        {{ language.t('template-inspector-frontmatter-middle') }}
        <code>type</code>
        {{ language.t('template-inspector-frontmatter-and') }}
        <code>title</code>
        {{ language.t('template-inspector-frontmatter-end') }}
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

code {
  font-size: var(--text-small);
}
</style>
