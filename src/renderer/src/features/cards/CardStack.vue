<script setup lang="ts">
import { ref } from 'vue'
import { placeOf } from '../../app/entry-owners'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { ENTRY_PATH_DRAG_TYPE } from '../../shared/drag-types'
import { isolate } from '../../shared/isolate'
import type { MenuItem } from '../../shared/menu-item'
import MenuButton from '../../shared/MenuButton.vue'
import { CARD_FIELD_LABELS, CARD_FIELDS, chosenFields, isCardKind } from './card-summary'
import EntryCard from './EntryCard.vue'

const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
/** The card being dragged, so a drop knows what moves; drag data is not trusted for paths. */
const dragging = ref<string | null>(null)

const titleOf = (path: string): string => placeOf(path)?.title ?? path

function menu(path: string, index: number): MenuItem[] {
  const kind = placeOf(path)?.kind
  const items: MenuItem[] = []
  if (index > 0) {
    items.push({
      key: 'up',
      label: language.t('cards-move-up'),
      run: () => {
        workbench.moveCard(path, index - 1)
      }
    })
  }
  if (index < workbench.cards.length - 1) {
    items.push({
      key: 'down',
      label: language.t('cards-move-down'),
      run: () => {
        workbench.moveCard(path, index + 1)
      }
    })
  }
  if (kind !== undefined && isCardKind(kind)) {
    const shown = chosenFields(kind, workbench.cardFieldsFor(kind))
    for (const field of CARD_FIELDS[kind]) {
      const on = shown.includes(field)
      items.push({
        key: `field-${field}`,
        label: language.t(
          on ? 'cards-field-hide' : 'cards-field-show',
          language.t(CARD_FIELD_LABELS[field])
        ),
        run: () => {
          workbench.setCardFields(
            kind,
            on ? shown.filter((other) => other !== field) : [...shown, field]
          )
        }
      })
    }
  }
  items.push({
    key: 'unpin',
    label: language.t('cards-unpin-label', isolate(titleOf(path))),
    run: () => {
      workbench.unpinCard(path)
    }
  })
  return items
}

/** Drops a card being reordered, or pins an entry dragged in from elsewhere (a cast chip). */
function drop(event: DragEvent, index: number): void {
  const moving = dragging.value
  dragging.value = null
  if (moving !== null) {
    workbench.moveCard(moving, index)
    return
  }
  // Only entries the project lists can be pinned, whatever the drag data claims.
  const path = event.dataTransfer?.getData(ENTRY_PATH_DRAG_TYPE) ?? ''
  if (path === '' || placeOf(path) === undefined) return
  workbench.pinCard(path)
  workbench.moveCard(path, index)
}
</script>

<template>
  <section
    class="card-stack"
    @dragover.prevent
    @drop.prevent="drop($event, workbench.cards.length)"
  >
    <p v-if="workbench.cards.length === 0" class="empty">{{ language.t('cards-empty') }}</p>
    <ol v-else>
      <li
        v-for="(path, index) in workbench.cards"
        :key="path"
        draggable="true"
        :class="{ dragging: dragging === path }"
        @dragstart="dragging = path"
        @dragend="dragging = null"
        @dragover.prevent
        @drop.prevent.stop="drop($event, index)"
      >
        <EntryCard
          :path="path"
          :collapsed="workbench.collapsedCards.includes(path)"
          @toggle-collapsed="
            workbench.setCardCollapsed(path, !workbench.collapsedCards.includes(path))
          "
        />
        <span class="card-menu">
          <MenuButton
            :label="language.t('cards-options', isolate(titleOf(path)))"
            :items="menu(path, index)"
          />
        </span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.card-stack {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-3);
}

ol {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  position: relative;
}

li.dragging {
  opacity: 0.5;
}

.card-menu {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
}

/* Leave room for the card's menu beside its own actions. */
li :deep(.entry-card header) {
  padding-inline-end: var(--space-6);
}

.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-body);
}
</style>
