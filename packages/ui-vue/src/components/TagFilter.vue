<script setup lang="ts">
import { tagKey, type ProjectTag } from '@plotdevice/shared'
import { computed, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import PopoverPanel from './PopoverPanel.vue'

// The row of tags above a list of pages (Milestone 12). Choosing tags groups the list by them, in the
// order chosen; choosing one again lets it go. Past the first few, "+ N more" lists the rest.
const props = defineProps<{ tags: ProjectTag[]; chosen: string[] }>()
const emit = defineEmits<{ 'update:chosen': [chosen: string[]] }>()
const settings = useSettingsStore()
const t = settings.t
const SHOWN = 10
const find = ref('')

const isChosen = (tag: string): boolean => props.chosen.some((chosen) => tagKey(chosen) === tagKey(tag))
/** The first few tags, and any chosen tag past them, so a choice never hides behind "more". */
const shown = computed(() => props.tags.filter((tag, index) => index < SHOWN || isChosen(tag.tag)))
const more = computed(() => props.tags.filter((tag) => !shown.value.includes(tag)))
const found = computed(() => more.value.filter((tag) => tagKey(tag.tag).includes(tagKey(find.value))))

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
      dir="auto"
      @click="toggle(tag.tag)"
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
            dir="auto"
            @click="toggle(tag.tag)"
          >
            {{ tag.tag }}
          </button>
        </div>
      </div>
    </PopoverPanel>
  </div>
</template>
