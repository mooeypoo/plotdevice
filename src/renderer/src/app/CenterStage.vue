<script setup lang="ts">
import { computed } from 'vue'
import { PROJECT_HOME, registeredView } from '../workbench/views/view-registry'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useLayoutStore } from './layout-store'

const editor = useEditorStore()
const layout = useLayoutStore()
const tabs = useDocumentTabsStore()

const DocumentView = registeredView('document').component
const WarningsView = registeredView('warnings').component
const projectView = computed(() =>
  layout.mainView === 'write' ? undefined : registeredView(layout.mainView).component
)
const writing = computed(() => layout.mainView === 'write' && editor.entry !== null)
</script>

<template>
  <div
    id="document-editor"
    class="pane"
    :class="{ focus: layout.focusMode }"
    :role="writing ? 'tabpanel' : undefined"
    :aria-labelledby="
      writing && editor.entry ? `tab-${tabs.documentId(editor.entry.path)}` : undefined
    "
  >
    <component :is="projectView" v-if="projectView" />
    <DocumentView v-else>
      <component :is="PROJECT_HOME">
        <template #warnings><WarningsView /></template>
      </component>
    </DocumentView>
  </div>
</template>

<style scoped>
.pane {
  height: 100%;
  overflow-y: auto;
  padding: 56px 40px 0;
  scroll-padding-bottom: 40vh;
}

.pane.focus {
  padding-top: 18vh;
  background: var(--bg-sunken);
}
</style>
