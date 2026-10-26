<script setup lang="ts">
import type { OutlineItemView } from '@plotdevice/contracts'
import { keyOf, type ItemAt } from '@plotdevice/presentation'
import { dirnameOf } from '@plotdevice/shared'
import { computed } from 'vue'
import { useFollowLink } from '../composables/use-follow-link'
import { useOutlineActions } from '../composables/use-outline-actions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import ItemTextField from './ItemTextField.vue'
import InlineText from './InlineText.vue'
import KeptAsWritten from './KeptAsWritten.vue'
import MenuButton from './MenuButton.vue'

// On the board, the column takes drops and `drop` shows where one would land; elsewhere, a card
// dropped on a card goes before it.
const props = defineProps<{
  item: OutlineItemView
  at: ItemAt
  label?: string | null
  board?: boolean
  drop?: 'before' | 'after' | null
  /** "Show on the board": this card links to the page (`out`), or doesn't (`faded`). */
  picked?: 'out' | 'faded' | null
}>()
const story = useStoryStore()
const settings = useSettingsStore()
const actions = useOutlineActions()
const t = settings.t
const follow = useFollowLink()
const fromDir = computed(() => dirnameOf(story.outline?.file ?? 'outlines/x.md'))
const key = computed(() => keyOf(props.at))
const lifted = computed(() => actions.dragging.value !== null && keyOf(actions.dragging.value) === key.value)

function onDrop(event: DragEvent): void {
  if (props.board) return
  event.preventDefault()
  event.stopPropagation()
  actions.dropBefore(props.at)
}
const editing = computed(() => story.editing?.kind === 'item' && story.editing.key === key.value)
const detailCount = computed(() => {
  const count = (item: OutlineItemView): number => item.children.reduce((sum, child) => sum + 1 + count(child), 0)
  return count(props.item)
})
</script>

<template>
  <article
    class="outline-card"
    :class="[{ locked: !item.movable, lifted }, drop ? `drop-${drop}` : '', picked ? `picked-${picked}` : '']"
    tabindex="0"
    :data-item="key"
    :draggable="item.movable && !editing"
    :aria-label="item.text"
    @keydown.self="actions.onItemKey($event, at, item)"
    @dblclick="story.editing = { kind: 'item', key }"
    @dragstart="actions.dragStart($event, at)"
    @dragover.prevent
    @dragend="actions.dragging.value = null"
    @drop="onDrop"
  >
    <p v-if="label !== undefined" class="card-section secondary" dir="auto">{{ label ?? t('outline-unnamed-section') }}</p>
    <div class="card-head">
      <span v-if="item.checked !== null" class="checkbox" aria-hidden="true">{{ item.checked ? '☑' : '☐' }}</span>
      <ItemTextField v-if="editing" :value="item.text" :label="t('prompt-card-text')" @commit="actions.commitItem(at, item, $event)" />
      <InlineText v-else class="card-text" :text="item.text" follow-links @follow="follow(fromDir, $event)" />
      <span v-if="!item.movable" class="lock" role="img" :aria-label="t('locked-item')" :title="t('locked-item')">🔒</span>
      <MenuButton :label="t('item-actions', item.text)" :items="actions.itemMenu(at, item)" />
    </div>
    <ul v-if="item.children.length > 0" class="card-details">
      <li v-for="(child, index) in item.children.slice(0, 3)" :key="index">
        <InlineText :text="child.text" follow-links @follow="follow(fromDir, $event)" />
      </li>
      <li v-if="detailCount > 3" class="secondary">{{ t('details-count', detailCount) }}</li>
    </ul>
    <KeptAsWritten v-for="(block, index) in item.keptAsWritten" :key="`kept-${index}`" :text="block" />
  </article>
</template>
