<script setup lang="ts">
import type { OutlineItemView } from '@plotdevice/contracts'
import { keyOf, type ItemAt } from '@plotdevice/presentation'
import { dirnameOf } from '@plotdevice/shared'
import { computed } from 'vue'
import { useFollowLink } from '../composables/use-follow-link'
import { useOutlineActions } from '../composables/use-outline-actions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import EditableText from './EditableText.vue'
import InlineText from './InlineText.vue'
import KeptAsWritten from './KeptAsWritten.vue'
import MenuButton from './MenuButton.vue'

const props = defineProps<{ item: OutlineItemView; at: ItemAt; label?: string | null }>()
const story = useStoryStore()
const settings = useSettingsStore()
const actions = useOutlineActions()
const t = settings.t
const follow = useFollowLink()
const fromDir = computed(() => dirnameOf(story.outline?.file ?? 'outlines/x.md'))
const key = computed(() => keyOf(props.at))
const editing = computed(() => story.editing?.kind === 'item' && story.editing.key === key.value)
const detailCount = computed(() => {
  const count = (item: OutlineItemView): number => item.children.reduce((sum, child) => sum + 1 + count(child), 0)
  return count(props.item)
})
</script>

<template>
  <article
    class="outline-card"
    :class="{ locked: !item.movable }"
    tabindex="0"
    :data-item="key"
    :draggable="item.movable && !editing"
    :aria-label="item.text"
    @keydown.self="actions.onItemKey($event, at, item)"
    @dblclick="story.editing = { kind: 'item', key }"
    @dragstart="actions.dragStart($event, at)"
    @dragover.prevent
    @drop.prevent.stop="actions.dropBefore(at)"
  >
    <p v-if="label !== undefined" class="card-section secondary" dir="auto">{{ label ?? t('outline-unnamed-section') }}</p>
    <div class="card-head">
      <span v-if="item.checked !== null" class="checkbox" aria-hidden="true">{{ item.checked ? '☑' : '☐' }}</span>
      <EditableText v-if="editing" :value="item.text" :label="t('prompt-card-text')" @commit="actions.commitItem(at, item, $event)" />
      <InlineText v-else class="card-text" :text="item.text" follow-links @follow="follow(fromDir, $event)" />
      <span v-if="!item.movable" class="lock" role="img" :aria-label="t('locked-item')" :title="t('locked-item')">🔒</span>
      <MenuButton :label="t('item-actions', item.text)" :items="actions.itemMenu(at, item)" />
    </div>
    <ul v-if="item.children.length > 0" class="card-details">
      <li v-for="(child, index) in item.children.slice(0, 3)" :key="index"><InlineText :text="child.text" follow-links @follow="follow(fromDir, $event)" /></li>
      <li v-if="detailCount > 3" class="secondary">{{ t('details-count', detailCount) }}</li>
    </ul>
    <KeptAsWritten v-for="(block, index) in item.keptAsWritten" :key="`kept-${index}`" :text="block" />
  </article>
</template>
