<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { resizeSplit, setAboveView } from '../workbench/model/operations'
import { MIN_PAGE_INLINE_SIZE, SPLITS } from '../workbench/model/sizes'
import Splitter from '../workbench/shell/Splitter.vue'
import {
  PROJECT_HOME,
  registeredView,
  SPLIT_PANE,
  VIEW_REGISTRY
} from '../workbench/views/view-registry'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchStore } from './workbench-store'

const editor = useEditorStore()
const tabs = useDocumentTabsStore()
const workbench = useWorkbenchStore()
const language = useUiLanguageStore()

const DocumentView = registeredView('document').component
const WarningsView = registeredView('warnings').component
const projectView = computed(() =>
  workbench.centerView === 'write' ? undefined : registeredView(workbench.centerView).component
)
const writing = computed(() => workbench.centerView === 'write' && editor.entry !== null)
/** The strip above the page (the chapter's cast), shown with the document in the workbench. */
const aboveView = computed(() => {
  const view = workbench.layout.center.above
  if (view === undefined || view === null || !writing.value || workbench.focusMode) return undefined
  return VIEW_REGISTRY[view]?.component
})

const stage = useTemplateRef<HTMLElement>('stage')
const stageWidth = ref(0)
let observer: ResizeObserver | undefined
onMounted(() => {
  const element = stage.value
  if (element === null) return
  const measure = (): void => {
    stageWidth.value = element.clientWidth
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(element)
  }
})
onBeforeUnmount(() => observer?.disconnect())

/** A drag in progress, by split id, so the stored share changes only when the drag ends. */
const previews = ref<Record<string, number>>({})

function setPreview(id: string, width: number | null): void {
  const others = Object.fromEntries(Object.entries(previews.value).filter(([key]) => key !== id))
  previews.value = width === null ? others : { ...others, [id]: width }
}

/**
 * Splits shown beside the document, in pixels. Their shares shrink together when they would leave
 * the writable page narrower than it may be.
 */
const shownSplits = computed(() => {
  if (projectView.value !== undefined || workbench.focusMode) {
    return []
  }
  const width = stageWidth.value
  const splits = workbench.layout.center.splits
  const total = splits.reduce((sum, split) => sum + split.share, 0)
  const room = width <= 0 ? 0 : Math.max(0, (width - MIN_PAGE_INLINE_SIZE) / width)
  const scale = total === 0 ? 1 : Math.min(1, room / total)
  return splits.map((split) => ({
    id: split.id,
    width: Math.round(previews.value[split.id] ?? split.share * scale * width),
    minimum: Math.round(SPLITS.minShare * width * scale),
    maximum: Math.round(Math.min(SPLITS.maxShare, room) * width)
  }))
})

function commitShare(id: string, width: number): void {
  if (stageWidth.value <= 0) return
  workbench.apply((current) => resizeSplit(current, id, width / stageWidth.value))
}
</script>

<template>
  <div ref="stage" class="stage">
    <div
      id="document-editor"
      class="pane"
      :class="{ focus: workbench.focusMode }"
      :role="writing ? 'tabpanel' : undefined"
      :aria-labelledby="
        writing && editor.entry ? `tab-${tabs.documentId(editor.entry.path)}` : undefined
      "
    >
      <component :is="projectView" v-if="projectView" />
      <template v-else>
        <p v-if="workbench.splitNotice" class="split-notice" role="status">
          {{ language.t(workbench.splitNotice) }}
        </p>
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
    <!-- Read-only splits sit at inline-end of the writable page (ADR 0018). -->
    <div
      v-for="split in shownSplits"
      :id="`split-${split.id}`"
      :key="split.id"
      class="split-slot"
      :style="{ inlineSize: `${split.width}px` }"
    >
      <Splitter
        region="end"
        :size="split.width"
        :minimum="split.minimum"
        :maximum="split.maximum"
        :label="language.t('split-resize')"
        :controls="`split-${split.id}`"
        @preview="setPreview(split.id, $event)"
        @commit="commitShare(split.id, $event)"
      />
      <component :is="SPLIT_PANE" :split-id="split.id" />
    </div>
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  flex: 1;
  min-height: 0;
}

.split-slot {
  position: relative;
  flex-shrink: 0;
  min-height: 0;
}

.split-notice {
  max-width: var(--measure);
  margin: -32px auto 16px;
  color: var(--text-muted);
  font-size: 12px;
}

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
  flex: 1;
  min-width: 0;
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
