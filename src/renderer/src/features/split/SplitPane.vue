<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { createDocumentReader } from '../../app/document-reader'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useCodexStore } from '../../app/codex-store'
import { usePeek } from '../../app/peek-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useLiveDraft } from '../../app/use-live-draft'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { isolate } from '../../shared/isolate'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'

const props = defineProps<{ splitId: string }>()

const workbench = useWorkbenchStore()
const navigation = useWorkbenchNavigation()
const manuscript = useManuscriptStore()
const codex = useCodexStore()
const language = useUiLanguageStore()
const peek = usePeek()
const scroller = useTemplateRef<HTMLElement>('scroller')

/** A split is a read-only reader of its own (ADR 0018): it never saves or flushes the editor. */
const reader = createDocumentReader()
const bound = computed(() => workbench.splits[props.splitId])
const { text, openInEditor } = useLiveDraft(reader.path, reader.text)
const title = computed(() => reader.entry.value?.title ?? bound.value?.path ?? '')

watch(
  () => bound.value?.path ?? null,
  async (path) => {
    if (path === null) reader.clear()
    else reader.open(path)
    await nextTick()
    if (scroller.value !== null) scroller.value.scrollTop = reader.scrollTop()
  },
  { immediate: true }
)
// Outside edits reload the listings; read again, as Reference does.
watch([() => codex.revision, () => manuscript.manuscript], () => void reader.reload())
</script>

<template>
  <section class="split" :aria-label="language.t('split-region', isolate(title))">
    <header v-if="bound">
      <h2 dir="auto">{{ title }}</h2>
      <span class="read-only">{{ language.t('split-read-only') }}</span>
      <span class="actions">
        <button
          type="button"
          class="quiet"
          :aria-pressed="bound.locked"
          @click="workbench.setSplitLocked(splitId, !bound.locked)"
        >
          {{ language.t('split-lock') }}
        </button>
        <button type="button" class="quiet" @click="navigation.writeHere(splitId)">
          {{ language.t('tabs-write-here') }}
        </button>
        <button
          type="button"
          class="quiet close"
          :aria-label="language.t('split-close')"
          :title="language.t('split-close')"
          @click="workbench.closeSplitView(splitId)"
        >
          <span aria-hidden="true">×</span>
        </button>
      </span>
    </header>
    <header v-else class="empty-header">
      <button
        type="button"
        class="quiet close"
        :aria-label="language.t('split-close')"
        :title="language.t('split-close')"
        @click="workbench.closeSplitView(splitId)"
      >
        <span aria-hidden="true">×</span>
      </button>
    </header>

    <div
      ref="scroller"
      class="body"
      @scroll="reader.rememberScroll(($event.target as HTMLElement).scrollTop)"
    >
      <p v-if="!bound" class="note">{{ language.t('split-empty') }}</p>
      <template v-else>
        <p v-if="openInEditor" class="note" role="status">{{ language.t('cards-live-draft') }}</p>
        <p v-if="reader.loading.value" class="note" role="status">
          {{ language.t('cards-loading') }}
        </p>
        <p v-else-if="reader.error.value" class="note error" role="alert">
          {{ reader.error.value }}
        </p>
        <RenderedMarkdown
          v-else-if="text !== null"
          :text="text"
          :link-targets="manuscript.manuscript?.linkTargets ?? []"
          @peek="(link, near, byKeyboard) => peek.peekLink(link, bound?.path, near, byKeyboard)"
          @peek-end="peek.endHover()"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.split {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  border-inline-start: 1px solid var(--line);
  background: var(--bg-sunken);
}

header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--line);
}

.empty-header {
  justify-content: flex-end;
}

h2 {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.read-only {
  color: var(--text-muted);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.actions {
  display: inline-flex;
  gap: var(--space-1);
}

.actions button,
.close {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-caption);
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-6) var(--space-6) 40vh;
}

.note {
  margin: 0 0 var(--space-4);
  color: var(--text-muted);
  font-size: var(--text-body);
}

.note.error {
  color: var(--danger);
}
</style>
