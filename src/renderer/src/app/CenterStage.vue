<script setup lang="ts">
import { computed } from 'vue'
import { setAboveView } from '../workbench/model/operations'
import { PROJECT_HOME, registeredView, VIEW_REGISTRY } from '../workbench/views/view-registry'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useLayoutStore } from './layout-store'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchStore } from './workbench-store'

const editor = useEditorStore()
const layout = useLayoutStore()
const tabs = useDocumentTabsStore()
const workbench = useWorkbenchStore()
const language = useUiLanguageStore()

const DocumentView = registeredView('document').component
const WarningsView = registeredView('warnings').component
const projectView = computed(() =>
  layout.mainView === 'write' ? undefined : registeredView(layout.mainView).component
)
const writing = computed(() => layout.mainView === 'write' && editor.entry !== null)
/** The strip above the page (the chapter's cast), shown with the document in the workbench. */
const aboveView = computed(() => {
  const view = workbench.layout.center.above
  if (view === undefined || view === null || !writing.value || layout.focusMode) return undefined
  if (workbench.shell !== 'workbench') return undefined
  return VIEW_REGISTRY[view]?.component
})
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
    <template v-else>
      <div v-if="aboveView" class="above">
        <component :is="aboveView" />
        <button
          type="button"
          class="quiet hide"
          :aria-label="language.t('cast-hide')"
          :title="language.t('cast-hide')"
          @click="workbench.apply((current) => setAboveView(current, null))"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <DocumentView>
        <component :is="PROJECT_HOME">
          <template #warnings><WarningsView /></template>
        </component>
      </DocumentView>
    </template>
  </div>
</template>

<style scoped>
/* Sits on the prose column, so the strip lines up with the text it describes. */
.above {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  max-width: var(--measure);
  margin: -32px auto 24px;
}

.above > :first-child {
  flex: 1;
  min-width: 0;
}

.hide {
  padding: 0 6px;
  font-size: 14px;
  line-height: 1.4;
}

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
