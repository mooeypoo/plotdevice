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
/* A quiet line under the chapter's heading: "In this chapter: Ilka · Marrow" (F6). */
.cast {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: baseline;
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: var(--text-small);
}

.label {
  margin: 0;
  font-size: inherit;
  font-weight: normal;
}

.label::after {
  content: ':';
}

ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: baseline;
}

.chip + .chip::before {
  content: '·';
  margin-inline-end: var(--space-2);
  color: var(--text-faint);
}

.chip button {
  padding: 0;
  border: none;
  background: transparent;
  font-size: inherit;
}

.name {
  display: inline-flex;
  gap: var(--space-1);
  align-items: baseline;
  border-radius: 0;
  color: var(--link-character);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

.chip.location .name {
  color: var(--link-location);
}

/* Names only in the text, not in the chapter's details, read quieter. */
.chip.mentioned .name {
  color: var(--text-dim);
  text-decoration-style: dashed;
}

.name:hover:not(:disabled) {
  background: transparent;
  color: var(--text-strong);
}

/* Pinning is one step away: it shows on hover or focus. */
.pin {
  margin-inline-start: var(--space-1);
  color: var(--text-muted);
  opacity: 0;
}

.chip:hover .pin,
.chip:focus-within .pin,
.pin[aria-pressed='true'] {
  opacity: 1;
}

.pin[aria-pressed='true'] {
  color: var(--accent);
}

.marker {
  color: var(--accent);
}

.empty {
  margin: 0;
}
</style>
