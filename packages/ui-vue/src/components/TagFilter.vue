<script setup lang="ts">
import { tagKey, type ProjectTag } from '@plotdevice/shared'
import { computed, ref } from 'vue'
import { useConfirm } from '../composables/use-confirm'
import { usePrompt } from '../composables/use-prompt'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'
import PopoverPanel from './PopoverPanel.vue'

// The row of tags above a list of pages (Milestone 12). Choosing tags groups the list by them, in the
// order chosen; choosing one again lets it go. Past the first few, "+ N more" lists the rest. With
// `manage`, right-clicking a tag (or Shift+F10 on it) offers to rename or remove it on every page.
const props = defineProps<{ tags: ProjectTag[]; chosen: string[]; manage?: boolean }>()
const emit = defineEmits<{ 'update:chosen': [chosen: string[]] }>()
const settings = useSettingsStore()
const story = useStoryStore()
const { ask } = usePrompt()
const { confirm } = useConfirm()
const t = settings.t
const menu = ref<InstanceType<typeof MenuButton> | null>(null)
const acting = ref<ProjectTag | null>(null)
const SHOWN = 10
const find = ref('')

const isChosen = (tag: string): boolean => props.chosen.some((chosen) => tagKey(chosen) === tagKey(tag))
/** The first few tags, and any chosen tag past them, so a choice never hides behind "more". */
const shown = computed(() => props.tags.filter((tag, index) => index < SHOWN || isChosen(tag.tag)))
const more = computed(() => props.tags.filter((tag) => !shown.value.includes(tag)))
const found = computed(() => more.value.filter((tag) => tagKey(tag.tag).includes(tagKey(find.value))))

const actions = computed<MenuItem[]>(() => {
  const tag = acting.value
  if (!tag) return []
  return [
    { key: 'tag-rename-everywhere', label: t('tag-rename-everywhere'), run: () => void rename(tag) },
    { key: 'tag-remove-everywhere', label: t('tag-remove-everywhere'), run: () => void remove(tag) },
  ]
})

function openActions(event: Event, tag: ProjectTag): void {
  if (!props.manage) return
  event.preventDefault()
  acting.value = tag
  void menu.value?.showFrom(event.currentTarget as HTMLElement)
}

function onPillKey(event: KeyboardEvent, tag: ProjectTag): void {
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) openActions(event, tag)
}

async function rename(tag: ProjectTag): Promise<void> {
  const name = (await ask(t('prompt-tag-rename', tag.tag, String(tag.pages)), tag.tag))?.trim()
  if (!name || name === tag.tag) return
  await story.retag(tag.tag, name)
  if (isChosen(tag.tag))
    emit(
      'update:chosen',
      props.chosen.map((chosen) => (tagKey(chosen) === tagKey(tag.tag) ? name : chosen)),
    )
}

async function remove(tag: ProjectTag): Promise<void> {
  if (!(await confirm(t('confirm-tag-remove', tag.tag, String(tag.pages)), t('tag-remove-action')))) return
  await story.retag(tag.tag, null)
  if (isChosen(tag.tag)) toggle(tag.tag)
}

function toggle(tag: string): void {
  emit('update:chosen', isChosen(tag) ? props.chosen.filter((chosen) => tagKey(chosen) !== tagKey(tag)) : [...props.chosen, tag])
}
</script>

<template>
  <div v-if="tags.length > 0" class="tag-filter" role="group" :aria-label="t('tag-filter')" data-testid="tag-filter">
    <button
      v-for="tag in shown"
      :key="tag.tag"
      type="button"
      class="tag-pill tag-choice"
      :aria-pressed="isChosen(tag.tag)"
      :data-tag="tag.tag"
      :aria-keyshortcuts="manage ? 'Shift+F10' : undefined"
      dir="auto"
      @click="toggle(tag.tag)"
      @contextmenu="openActions($event, tag)"
      @keydown="onPillKey($event, tag)"
    >
      {{ tag.tag }}
    </button>
    <PopoverPanel v-if="more.length > 0" :label="t('tag-more-label')" button-class="tag-add" testid="tag-more">
      <template #button>{{ t('tag-more', String(more.length)) }}</template>
      <div class="tag-more">
        <input v-model="find" type="search" dir="auto" :placeholder="t('tag-find')" :aria-label="t('tag-find')" />
        <div class="tag-more-list">
          <button
            v-for="tag in found"
            :key="tag.tag"
            type="button"
            class="tag-pill tag-choice"
            :aria-pressed="isChosen(tag.tag)"
            :data-tag="tag.tag"
            :aria-keyshortcuts="manage ? 'Shift+F10' : undefined"
            dir="auto"
            @click="toggle(tag.tag)"
            @contextmenu="openActions($event, tag)"
            @keydown="onPillKey($event, tag)"
          >
            {{ tag.tag }}
          </button>
        </div>
      </div>
    </PopoverPanel>
    <MenuButton
      v-if="manage"
      ref="menu"
      buttonless
      :label="t('tag-actions', acting?.tag ?? '')"
      :heading="acting?.tag ?? ''"
      :items="actions"
    />
  </div>
</template>
