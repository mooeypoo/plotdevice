<script setup lang="ts">
import type { OutlineView } from '@plotdevice/contracts'
import { keyOf, newLineAfter, outlineRows, type OutlineRow } from '@plotdevice/presentation'
import { computed } from 'vue'
import { useOutlineActions } from '../composables/use-outline-actions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import EditableText from './EditableText.vue'
import InlineText from './InlineText.vue'
import ItemTextField from './ItemTextField.vue'
import KeptAsWritten from './KeptAsWritten.vue'
import MenuButton from './MenuButton.vue'

const props = defineProps<{ outline: OutlineView }>()
const story = useStoryStore()
const settings = useSettingsStore()
const actions = useOutlineActions()
const t = settings.t
const sections = computed(() => {
  const rows = outlineRows(props.outline, story.collapsed)
  return props.outline.sections.map((section, index) => {
    const inSection = rows.filter((row) => row.path.section === index)
    return { section, index, rows: inSection, line: lineIn(index, inSection) }
  })
})

/** The new line being typed in a section, and the row it follows (`null`: the section's start). */
function lineIn(section: number, rows: OutlineRow[]): { after: string | null; depth: number; draft: string; id: string } | null {
  const editing = story.editing
  if (editing?.kind !== 'new-line' || editing.to.section !== section) return null
  const { to } = editing
  return {
    after: newLineAfter(rows, to),
    depth: to.parentPath.length,
    draft: editing.draft,
    id: `${keyOf({ section, path: to.parentPath })}+${to.index}`,
  }
}
</script>

<template>
  <div class="outline-list" data-testid="list">
    <section v-for="{ section, index, rows, line } in sections" :key="index" class="list-section">
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
        <li v-if="line && line.after === null" :key="line.id" role="none" class="list-row new-line" :style="{ '--depth': line.depth }">
          <ItemTextField
            :value="line.draft"
            :label="line.depth === 0 ? t('prompt-item-text') : t('prompt-detail-text')"
            nests
            @commit="actions.commitLine"
            @indent="actions.indentLine"
            @outdent="actions.outdentLine"
          />
        </li>
        <template v-for="row in rows" :key="row.key">
          <li
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
            <ItemTextField
              v-if="story.editing?.kind === 'item' && story.editing.key === row.key"
              :value="row.item.text"
              :label="t('prompt-item-text')"
              @commit="actions.commitItem(row.path, row.item, $event)"
            />
            <InlineText
              v-else
              :text="row.item.text"
              :class="{ 'is-card': row.depth === 0 }"
              @dblclick="story.editing = { kind: 'item', key: row.key }"
            />
            <span v-if="!row.item.movable" class="lock" role="img" :aria-label="t('locked-item')" :title="t('locked-item')">🔒</span>
            <button
              type="button"
              class="add-detail"
              data-testid="add-detail"
              :aria-label="t('outline-add-detail')"
              :title="t('outline-add-detail')"
              @click="actions.startLine({ section: index, parentPath: row.path.path, index: row.item.children.length })"
            >
              +
            </button>
            <MenuButton :label="t('item-actions', row.item.text)" :items="actions.itemMenu(row.path, row.item)" />
            <KeptAsWritten v-for="(block, i) in row.item.keptAsWritten" :key="`kept-${i}`" :text="block" />
          </li>
          <li v-if="line && line.after === row.key" :key="line.id" role="none" class="list-row new-line" :style="{ '--depth': line.depth }">
            <ItemTextField
              :value="line.draft"
              :label="line.depth === 0 ? t('prompt-item-text') : t('prompt-detail-text')"
              nests
              @commit="actions.commitLine"
              @indent="actions.indentLine"
              @outdent="actions.outdentLine"
            />
          </li>
        </template>
      </ul>
      <button
        v-if="section.name !== null && !(story.editing?.kind === 'new-line' && story.editing.to.section === index)"
        type="button"
        class="add-line"
        data-testid="add-card"
        @click="actions.startLine({ section: index, parentPath: [], index: section.items.length })"
      >
        {{ t('outline-add-item') }}
      </button>
      <KeptAsWritten v-for="(note, i) in section.notes.filter((n) => n.kind === 'kept')" :key="`note-${i}`" :text="note.text" />
    </section>
    <EditableText
      v-if="story.editing?.kind === 'new-section'"
      value=""
      :label="t('prompt-section-name')"
      @commit="actions.commitNewSection"
    />
    <button v-else type="button" class="add-line add-section" data-testid="add-section" @click="story.editing = { kind: 'new-section' }">
      {{ t('outline-add-section') }}
    </button>
  </div>
</template>
