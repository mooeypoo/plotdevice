<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { usePeek } from '../../app/peek-store'
import { useReferenceStore } from '../../app/reference-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useEntryCard } from '../../app/use-entry-card'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { uiDirection } from '../../../../i18n/locales'
import { isolate } from '../../shared/isolate'
import ReferenceButton from '../../shared/ReferenceButton.vue'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import { cardFieldValues, chosenFields, firstSection, isCardKind } from './card-summary'

const props = defineProps<{
  path: string
  /** A pinned card can collapse to one line; a peek always shows everything. */
  collapsed?: boolean
  /** Whether links in the card open peeks of their own; not inside a peek. */
  peekable?: boolean
}>()
defineEmits<{ toggleCollapsed: [] }>()

const card = useEntryCard(toRef(props, 'path'))
const workbench = useWorkbenchStore()
const editor = useEditorStore()
const manuscript = useManuscriptStore()
const reference = useReferenceStore()
const navigation = useWorkbenchNavigation()
const language = useUiLanguageStore()
const peek = usePeek()
const direction = computed(() => uiDirection(language.locale))

const kind = computed(() => card.entry.value?.kind)
const title = computed(() => card.title.value ?? props.path)
const pinned = computed(() => workbench.cards.includes(props.path))
const fields = computed(() => {
  const properties = card.properties.value
  const current = kind.value
  if (properties === null || current === undefined || !isCardKind(current)) return []
  return cardFieldValues(
    properties,
    chosenFields(current, workbench.cardFieldsFor(current)),
    (items) => items.join(language.t('cards-list-separator'))
  )
})
const summary = computed(() => firstSection(card.text.value ?? ''))

function togglePin(): void {
  if (pinned.value) workbench.unpinCard(props.path)
  else {
    workbench.pinCard(props.path)
    navigation.revealView('card-stack')
  }
}
</script>

<template>
  <article class="entry-card" :aria-label="title">
    <header>
      <button
        v-if="collapsed !== undefined"
        type="button"
        class="quiet disclosure"
        :aria-expanded="!collapsed"
        :aria-label="language.t(collapsed ? 'cards-expand' : 'cards-collapse', isolate(title))"
        @click="$emit('toggleCollapsed')"
      >
        <span aria-hidden="true" :class="{ mirrored: collapsed && direction === 'rtl' }">{{
          collapsed ? '▸' : '▾'
        }}</span>
      </button>
      <h3 dir="auto">{{ title }}</h3>
      <span class="actions">
        <button
          type="button"
          class="quiet"
          :aria-pressed="pinned"
          :aria-label="language.t(pinned ? 'cards-unpin-label' : 'cards-pin-label', isolate(title))"
          :title="language.t(pinned ? 'cards-unpin-label' : 'cards-pin-label', isolate(title))"
          @click="togglePin"
        >
          {{ language.t('cards-pin') }}
        </button>
        <ReferenceButton :title="title" @open="reference.open(path)" />
        <button
          type="button"
          class="quiet beside"
          :aria-label="language.t('split-open-beside-label', isolate(title))"
          :title="language.t('split-open-beside-label', isolate(title))"
          @click="navigation.openBeside(path)"
        >
          {{ language.t('split-open-beside') }}
        </button>
        <button
          type="button"
          class="quiet"
          :aria-label="language.t('codex-open-editor-label', isolate(title))"
          :title="language.t('codex-open-editor-tooltip')"
          @click="editor.open(path)"
        >
          {{ language.t('codex-edit') }}
        </button>
      </span>
    </header>

    <template v-if="!collapsed">
      <dl v-if="fields.length > 0" class="fields">
        <template v-for="field in fields" :key="field.id">
          <dt>{{ language.t(field.label) }}</dt>
          <dd dir="auto">{{ field.value }}</dd>
        </template>
      </dl>
      <p v-if="card.openInEditor.value" class="note" role="status">
        {{ language.t('cards-live-draft') }}
      </p>
      <p v-if="card.loading.value" class="note" role="status">{{ language.t('cards-loading') }}</p>
      <p v-else-if="card.error.value" class="note error" role="alert">{{ card.error.value }}</p>
      <RenderedMarkdown
        v-else-if="summary !== ''"
        class="summary"
        :text="summary"
        :link-targets="manuscript.manuscript?.linkTargets ?? []"
        @peek="
          (link, near, byKeyboard) => {
            if (peekable !== false) peek.peekLink(link, path, near, byKeyboard)
          }
        "
        @peek-end="
          () => {
            if (peekable !== false) peek.endHover()
          }
        "
      />
    </template>
  </article>
</template>

<style scoped>
.entry-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  font-size: 13px;
}

header {
  display: flex;
  gap: 6px;
  align-items: center;
}

h3 {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

.actions button {
  padding: 2px 6px;
  font-size: 11px;
}

.disclosure {
  padding: 2px 4px;
}

.disclosure .mirrored {
  display: inline-block;
  transform: scaleX(-1);
}

.fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 10px;
  margin: 0;
}

dt {
  color: var(--text-muted);
}

dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.note {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.note.error {
  color: var(--danger);
}

.summary {
  font-size: 13px;
}
</style>
