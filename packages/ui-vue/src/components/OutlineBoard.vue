<script setup lang="ts">
import type { OutlineView } from '@plotdevice/contracts'
import { boardColumns } from '@plotdevice/presentation'
import { computed } from 'vue'
import { useOutlineActions } from '../composables/use-outline-actions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import EditableText from './EditableText.vue'
import KeptAsWritten from './KeptAsWritten.vue'
import MenuButton from './MenuButton.vue'
import OutlineCard from './OutlineCard.vue'

const props = defineProps<{ outline: OutlineView }>()
const story = useStoryStore()
const settings = useSettingsStore()
const actions = useOutlineActions()
const t = settings.t
const columns = computed(() => boardColumns(props.outline))
</script>

<template>
  <div class="board" data-testid="board">
    <section
      v-for="(column, index) in columns"
      :key="index"
      class="column"
      :aria-label="column.name ?? t('outline-unnamed-section')"
      data-testid="column"
      @dragover.prevent
      @drop.prevent="actions.dropAtEnd(index)"
    >
      <header class="column-head">
        <EditableText
          v-if="story.editing?.kind === 'section' && story.editing.section === index"
          :value="column.name ?? ''"
          :label="t('prompt-section-name')"
          @commit="actions.commitSection(index, $event)"
        />
        <h3 v-else dir="auto" @dblclick="column.name !== null && (story.editing = { kind: 'section', section: index })">{{ column.name ?? t('outline-unnamed-section') }}</h3>
        <MenuButton v-if="column.name !== null" :label="t('section-actions', column.name)" :items="actions.sectionMenu(index)" />
      </header>
      <p v-for="(intro, i) in column.intro" :key="`intro-${i}`" class="column-intro secondary" dir="auto">{{ intro }}</p>
      <template v-for="(entry, i) in column.entries" :key="i">
        <OutlineCard v-if="entry.kind === 'card'" :item="entry.item" :at="entry.path" />
        <p v-else-if="entry.kind === 'group'" class="group-label" dir="auto">{{ entry.text }}</p>
        <KeptAsWritten v-else :text="entry.text" />
      </template>
      <EditableText
        v-if="story.editing?.kind === 'new-card' && story.editing.section === index"
        value=""
        :label="t('prompt-card-text')"
        @commit="actions.commitNewCard(index, $event)"
      />
      <button v-else type="button" class="add" data-testid="add-card" @click="story.editing = { kind: 'new-card', section: index }">+ {{ t('outline-add-card') }}</button>
    </section>
    <div class="column new-column">
      <EditableText v-if="story.editing?.kind === 'new-section'" value="" :label="t('prompt-section-name')" @commit="actions.commitNewSection" />
      <button v-else type="button" class="add" data-testid="add-section" @click="story.editing = { kind: 'new-section' }">+ {{ t('outline-add-section') }}</button>
    </div>
  </div>
</template>
