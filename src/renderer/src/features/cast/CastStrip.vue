<script setup lang="ts">
import { computed } from 'vue'
import { placeOf } from '../../app/entry-owners'
import { usePeekStore } from '../../app/peek-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useEditorLinks } from '../../app/use-editor-links'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWritingChapter } from '../../app/use-writing-chapter'
import { useWorkbenchStore } from '../../app/workbench-store'
import { ENTRY_PATH_DRAG_TYPE } from '../../shared/drag-types'
import { isolate } from '../../shared/isolate'
import { screenRectOf } from '../../shared/screen-rect'
import { castMembers, type CastMember } from './cast-members'

const chapter = useWritingChapter()
const links = useEditorLinks()
const peek = usePeekStore()
const workbench = useWorkbenchStore()
const navigation = useWorkbenchNavigation()
const language = useUiLanguageStore()

/** "Appears in", inverted: who and where the chapter names, in its properties and its text. */
const members = computed((): CastMember[] => {
  const path = chapter.path.value
  if (path === null) return []
  const properties = chapter.properties.value
  const named =
    properties?.kind === 'manuscript' ? properties.value : { pov: [], characters: [], location: [] }
  return castMembers(
    named,
    chapter.text.value ?? '',
    (link) => links.resolveLink(link, path),
    (target) => placeOf(target)?.kind
  )
})

const titleOf = (member: CastMember): string => placeOf(member.path)?.title ?? member.path

function label(member: CastMember): string {
  const title = isolate(titleOf(member))
  if (member.role === 'pov') return language.t('cast-chip-pov', title)
  if (member.role === 'mentioned') return language.t('cast-chip-mentioned', title)
  return titleOf(member)
}

/** A chip is a deliberate request, so its peek takes focus and stays until dismissed. */
function show(event: MouseEvent, member: CastMember): void {
  if (event.currentTarget instanceof Element) {
    peek.show(member.path, screenRectOf(event.currentTarget), true)
  }
}

function pin(member: CastMember): void {
  workbench.pinCard(member.path)
  navigation.revealView('card-stack')
}

function drag(event: DragEvent, member: CastMember): void {
  event.dataTransfer?.setData(ENTRY_PATH_DRAG_TYPE, member.path)
  if (event.dataTransfer !== null) event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <section v-if="chapter.path.value !== null" class="cast" :aria-label="language.t('cast-label')">
    <h2 class="label">{{ language.t('cast-label') }}</h2>
    <p v-if="members.length === 0" class="empty">{{ language.t('cast-empty') }}</p>
    <ul v-else>
      <li
        v-for="member in members"
        :key="member.path"
        class="chip"
        :class="[member.kind, member.role]"
      >
        <button
          type="button"
          class="name"
          draggable="true"
          :aria-label="label(member)"
          :title="label(member)"
          @click="show($event, member)"
          @dragstart="drag($event, member)"
        >
          <span v-if="member.role === 'pov'" class="marker" aria-hidden="true">★</span>
          <bdi>{{ titleOf(member) }}</bdi>
        </button>
        <button
          type="button"
          class="pin"
          :aria-pressed="workbench.cards.includes(member.path)"
          :aria-label="language.t('cards-pin-label', isolate(titleOf(member)))"
          :title="language.t('cards-pin-label', isolate(titleOf(member)))"
          @click="pin(member)"
        >
          <span aria-hidden="true">⌖</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.cast {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  font-size: 12px;
}

.label {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: normal;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
}

/* Places read differently from people; names only in the text are dashed. */
.chip.location {
  border-radius: 4px;
}

.chip.mentioned {
  border-style: dashed;
}

.chip.pov {
  border-color: var(--accent);
}

.chip button {
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
}

.name {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding-block: 2px;
  padding-inline: 10px 4px;
}

.pin {
  padding-block: 2px;
  padding-inline: 4px 8px;
  color: var(--text-muted);
}

.pin[aria-pressed='true'] {
  color: var(--accent);
}

.marker {
  color: var(--accent);
}

.empty {
  margin: 0;
  color: var(--text-muted);
}
</style>
