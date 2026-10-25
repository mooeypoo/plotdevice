<script setup lang="ts">
import type { OutlineView } from '@plotdevice/contracts'
import { outlineRows } from '@plotdevice/presentation'
import { computed } from 'vue'
import { useOutlineActions } from '../composables/use-outline-actions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import EditableText from './EditableText.vue'
import InlineText from './InlineText.vue'
import KeptAsWritten from './KeptAsWritten.vue'
import MenuButton from './MenuButton.vue'

const props = defineProps<{ outline: OutlineView }>()
const story = useStoryStore()
const settings = useSettingsStore()
const actions = useOutlineActions()
const t = settings.t
const sections = computed(() => {
  const rows = outlineRows(props.outline, story.collapsed)
  return props.outline.sections.map((section, index) => ({ section, index, rows: rows.filter((row) => row.path.section === index) }))
})
</script>

<template>
  <div class="outline-list" data-testid="list">
    <section v-for="{ section, index, rows } in sections" :key="index" class="list-section">
      <header class="column-head">
        <EditableText
          v-if="story.editing?.kind === 'section' && story.editing.section === index"
          :value="section.name ?? ''"
          :label="t('prompt-section-name')"
          @commit="actions.commitSection(index, $event)"
        />
        <h3 v-else dir="auto">{{ section.name ?? t('outline-unnamed-section') }}</h3>
        <MenuButton v-if="section.name !== null" :label="t('section-actions', section.name)" :items="actions.sectionMenu(index)" />
      </header>
      <ul role="tree" :aria-label="section.name ?? t('outline-unnamed-section')">
        <li
          v-for="row in rows"
          :key="row.key"
          role="treeitem"
          :aria-level="row.depth + 1"
          :aria-expanded="row.hasChildren ? !row.collapsed : undefined"
          class="list-row"
          :style="{ '--depth': row.depth }"
          tabindex="0"
          :data-item="row.key"
          @keydown.self="actions.onItemKey($event, row.path, row.item)"
        >
          <button
            v-if="row.hasChildren"
            type="button"
            class="toggle"
            :aria-label="row.collapsed ? t('item-expand') : t('item-collapse')"
            @click="story.toggle(row.key)"
          >
            {{ row.collapsed ? '▸' : '▾' }}
          </button>
          <span v-else class="toggle-space"></span>
          <EditableText
            v-if="story.editing?.kind === 'item' && story.editing.key === row.key"
            :value="row.item.text"
            :label="t('prompt-card-text')"
            @commit="actions.commitItem(row.path, row.item, $event)"
          />
          <InlineText v-else :text="row.item.text" :class="{ 'is-card': row.depth === 0 }" @dblclick="story.editing = { kind: 'item', key: row.key }" />
          <span v-if="!row.item.movable" class="lock" role="img" :aria-label="t('locked-item')" :title="t('locked-item')">🔒</span>
          <MenuButton :label="t('item-actions', row.item.text)" :items="actions.itemMenu(row.path, row.item)" />
          <KeptAsWritten v-for="(block, i) in row.item.keptAsWritten" :key="`kept-${i}`" :text="block" />
        </li>
      </ul>
      <KeptAsWritten v-for="(note, i) in section.notes.filter((n) => n.kind === 'kept')" :key="`note-${i}`" :text="note.text" />
    </section>
  </div>
</template>
