<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../app/editor-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import CodexInspector from './CodexInspector.vue'
import InspectorPanel from './InspectorPanel.vue'
import OutlineInspector from './OutlineInspector.vue'
import TemplateInspector from './TemplateInspector.vue'

const editor = useEditorStore()
const language = useUiLanguageStore()
const kind = computed(() => editor.entry?.kind)
</script>

<template>
  <p v-if="kind === undefined" class="nothing">
    {{ language.t('right-panel-empty-properties') }}
  </p>
  <InspectorPanel v-else-if="kind === 'part' || kind === 'chapter'" />
  <TemplateInspector v-else-if="kind === 'template'" />
  <OutlineInspector v-else-if="kind === 'outline'" />
  <CodexInspector v-else />
</template>

<style scoped>
.nothing {
  margin: 0;
  padding: var(--space-5) var(--space-5);
  color: var(--text-muted);
}
</style>
