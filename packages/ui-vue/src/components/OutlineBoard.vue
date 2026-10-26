<script setup lang="ts">
import type { OutlineView } from '@plotdevice/contracts'
import { boardColumns, boardDrop, cardKey } from '@plotdevice/presentation'
import { computed, ref } from 'vue'
import { useOutlineActions } from '../composables/use-outline-actions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import EditableText from './EditableText.vue'
import ItemTextField from './ItemTextField.vue'
import KeptAsWritten from './KeptAsWritten.vue'
import MenuButton from './MenuButton.vue'
import OutlineCard from './OutlineCard.vue'

const props = defineProps<{ outline: OutlineView }>()
const story = useStoryStore()
const settings = useSettingsStore()
const actions = useOutlineActions()
const t = settings.t
const columns = computed(() => boardColumns(props.outline))

/** The gap a dragged card would land in: before the card at `before` in `section` (its length: the end). */
const target = ref<{ section: number; before: number } | null>(null)
const cardCount = (section: number): number => props.outline.sections[section]?.items.length ?? 0

/** Over a card's top half, the gap above it; its bottom half, the gap below. Past every card, the end. */
function onOver(event: DragEvent, section: number): void {
  const from = actions.dragging.value
  if (!from) return
  event.preventDefault()
  const cards = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(':scope > .outline-card[data-index]')]
  const above = cards.find((card) => {
    const box = card.getBoundingClientRect()
    return event.clientY < box.top + box.height / 2
  })
  const before = above ? Number(above.dataset.index) : cardCount(section)
  target.value = boardDrop(from, section, before) ? { section, before } : null
}

function onLeave(event: DragEvent): void {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) target.value = null
}

function onDrop(): void {
  const at = target.value
  target.value = null
  if (at) actions.dropAt(at.section, at.before)
  else actions.dragging.value = null
}

/** With "Show on the board", a card linking to the page stands out and the others fade. */
function picked(section: string | null, text: string): 'out' | 'faded' | null {
  const about = story.about
  if (!about) return null
  return about.cards.has(cardKey(section, text)) ? 'out' : 'faded'
}

/** Which side of this card shows the line: above it for its own gap, below the last card for the end. */
function dropSide(section: number, index: number): 'before' | 'after' | null {
  const at = target.value
  if (!at || at.section !== section) return null
  if (at.before === index) return 'before'
  return at.before === cardCount(section) && index === cardCount(section) - 1 ? 'after' : null
}
</script>

<template>
  <div class="board" data-testid="board">
    <section
      v-for="(column, index) in columns"
      :key="index"
      class="column"
      :aria-label="column.name ?? t('outline-unnamed-section')"
      data-testid="column"
      :class="{ 'drop-into': target?.section === index && cardCount(index) === 0 }"
      @dragover="onOver($event, index)"
      @dragleave="onLeave"
      @drop.prevent="onDrop"
    >
      <header class="column-head">
        <EditableText
          v-if="story.editing?.kind === 'section' && story.editing.section === index"
          :value="column.name ?? ''"
          :label="t('prompt-section-name')"
          @commit="actions.commitSection(index, $event)"
        />
        <h3 v-else dir="auto" @dblclick="column.name !== null && (story.editing = { kind: 'section', section: index })">
          {{ column.name ?? t('outline-unnamed-section') }}
        </h3>
        <MenuButton v-if="column.name !== null" :label="t('section-actions', column.name)" :items="actions.sectionMenu(index)" />
      </header>
      <p v-for="(intro, i) in column.intro" :key="`intro-${i}`" class="column-intro secondary" dir="auto">{{ intro }}</p>
      <template v-for="(entry, i) in column.entries" :key="i">
        <OutlineCard
          v-if="entry.kind === 'card'"
          :item="entry.item"
          :at="entry.path"
          board
          :data-index="entry.path.path[0]"
          :drop="dropSide(index, entry.path.path[0] ?? 0)"
          :picked="picked(column.name, entry.item.text)"
        />
        <p v-else-if="entry.kind === 'group'" class="group-label" dir="auto">{{ entry.text }}</p>
        <KeptAsWritten v-else :text="entry.text" />
      </template>
      <ItemTextField
        v-if="story.editing?.kind === 'new-card' && story.editing.section === index"
        value=""
        :label="t('prompt-card-text')"
        @commit="actions.commitNewCard(index, $event)"
      />
      <button v-else type="button" class="add" data-testid="add-card" @click="story.editing = { kind: 'new-card', section: index }">
        + {{ t('outline-add-card') }}
      </button>
    </section>
    <div class="column new-column">
      <EditableText
        v-if="story.editing?.kind === 'new-section'"
        value=""
        :label="t('prompt-section-name')"
        @commit="actions.commitNewSection"
      />
      <button v-else type="button" class="add" data-testid="add-section" @click="story.editing = { kind: 'new-section' }">
        + {{ t('outline-add-section') }}
      </button>
    </div>
  </div>
</template>
